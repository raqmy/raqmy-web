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
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

/**
 * DB expects: customer | merchant | admin
 * UI expects: customer | seller | admin
 */
const toDbRole = (role: any) => {
  if (role === 'seller') return 'merchant';
  return role ?? 'customer';
};

const fromDbRole = (role: any) => {
  if (role === 'merchant') return 'seller';
  return role ?? 'customer';
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

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

    if (!data) return null;

    // Translate DB role -> UI role
    return { ...data, role: fromDbRole((data as any).role) } as UserProfile;
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
    // 1) Create auth user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role, // metadata only (optional)
        },
      },
    });

    if (error) throw error;
    if (!data.user) throw new Error('No user returned');

    // 2) Insert profile row (IMPORTANT: send merchant to DB when user chose seller)
    const dbRole = toDbRole(role);

    const { error: profileError } = await supabase
      .from('users_profile')
      .upsert(
        {
          id: data.user.id,
          name,
          role: dbRole,
          // لا نرسل plan_id حالياً لتفادي أخطاء plans/plan_id عندك
        } as any,
        { onConflict: 'id' }
      );

    if (profileError) throw profileError;

    // 3) Refresh profile in state
    const profileData = await fetchProfile(data.user.id);
    setProfile(profileData);
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) throw new Error('No user logged in');

    // Translate UI role -> DB role before update
    const updatesForDb: any = { ...updates };
    if ('role' in updatesForDb) {
      updatesForDb.role = toDbRole(updatesForDb.role);
    }

    const { error } = await supabase
      .from('users_profile')
      .update(updatesForDb)
      .eq('id', user.id);

    if (error) throw error;

    const updatedProfile = await fetchProfile(user.id);
    setProfile(updatedProfile);
  };

  const value = { user, profile, loading, signUp, signIn, signOut, updateProfile };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
