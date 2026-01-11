import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, UserProfile } from '../lib/supabase';

type AppRole = 'customer' | 'seller';
type DbRole = 'customer' | 'merchant';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string, role: AppRole) => Promise<void>;
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
    return data;
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

  const signUp = async (email: string, password: string, name: string, role: AppRole) => {
    // 1) Create auth user
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    if (!data.user) throw new Error('No user returned from signUp');

    const userId = data.user.id;

    // 2) Map role to DB role
    const dbRole: DbRole = role === 'seller' ? 'merchant' : 'customer';

    // 3) Fetch "free" plan id (optional)
    const { data: planRow, error: planErr } = await supabase
      .from('plans')
      .select('id')
      .eq('name', 'مجاني')
      .maybeSingle();

    // لو جدول plans غير موجود عندك، لا نخلي التسجيل يفشل بسببه
    if (planErr) {
      console.warn('Plans table lookup failed (will continue without plan_id):', planErr);
    }

    // 4) Upsert profile (this fixes duplicate key conflict)
    const { data: upserted, error: upsertErr } = await supabase
      .from('users_profile')
      .upsert(
        {
          id: userId,
          name,
          email,          // مهم: خلي الايميل ينحفظ
          role: dbRole,   // customer | merchant
          plan_id: planRow?.id ?? null,
        },
        { onConflict: 'id' }
      )
      .select('*')
      .maybeSingle();

    if (upsertErr) throw upsertErr;

    // 5) Set profile locally immediately
    setProfile((upserted ?? {
      id: userId,
      name,
      email,
      role: dbRole,
      plan_id: planRow?.id ?? null,
    }) as UserProfile);
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

    const { error } = await supabase
      .from('users_profile')
      .update(updates)
      .eq('id', user.id);

    if (error) throw error;

    const updatedProfile = await fetchProfile(user.id);
    setProfile(updatedProfile);
  };

  const value: AuthContextType = {
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
