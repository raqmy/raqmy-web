import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, UserProfile } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string, role: 'customer' | 'seller') => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // ✅ تحويل الأدوار بين "التطبيق" و "الداتابيس"
  // DB uses: merchant | customer | admin (حسب triggers/constraints عندك)
  // App uses: seller | customer | admin (حسب كود الواجهة عندك)
  const mapDbRoleToAppRole = (p: any) => {
    if (!p) return p;
    if (p.role === 'merchant') return { ...p, role: 'seller' };
    return p;
  };

  const mapAppUpdatesToDbUpdates = (updates: Partial<UserProfile>) => {
    if (!updates) return updates;
    if ((updates as any).role === 'seller') {
      return { ...updates, role: 'merchant' } as Partial<UserProfile>;
    }
    return updates;
  };

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('users_profile')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }

    // ✅ رجّع للتطبيق role = seller بدل merchant
    return mapDbRoleToAppRole(data);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      (async () => {
        setUser(session?.user ?? null);
        if (session?.user) {
          const profileData = await fetchProfile(session.user.id);
          setProfile(profileData);
        }
        setLoading(false);
      })();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setUser(session?.user ?? null);
        if (session?.user) {
          const profileData = await fetchProfile(session.user.id);
          setProfile(profileData);
        } else {
          setProfile(null);
        }
        setLoading(false);
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, name: string, role: 'customer' | 'seller') => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;
    if (!data.user) throw new Error('No user returned');

    const { data: plans } = await supabase
      .from('plans')
      .select('id')
      .eq('name', 'مجاني')
      .maybeSingle();

    // ✅ خزّن في الداتابيس role = merchant بدل seller
    const dbRole = role === 'seller' ? 'merchant' : role;

    const { error: profileError } = await supabase
      .from('users_profile')
      .upsert(
        {
          id: data.user.id,
          name,
          role: dbRole as any,
          plan_id: plans?.id ?? null,
        },
        { onConflict: 'id' }
      );

    if (profileError) throw profileError;

    // ✅ حدّث حالة البروفايل فوراً داخل التطبيق (عشان الواجهة ما تعتبره عميل)
    const profileData = await fetchProfile(data.user.id);
    setProfile(profileData);
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) throw new Error('No user logged in');

    // ✅ لو التطبيق قال seller، خلها merchant في الداتابيس
    const dbUpdates = mapAppUpdatesToDbUpdates(updates);

    const { error } = await supabase
      .from('users_profile')
      .update(dbUpdates)
      .eq('id', user.id);

    if (error) throw error;

    const updatedProfile = await fetchProfile(user.id);
    setProfile(updatedProfile);
  };

  const value = {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
