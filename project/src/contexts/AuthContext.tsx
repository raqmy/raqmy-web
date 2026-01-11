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

  const signUp = async (email: string, password: string, name: string, role: 'customer' | 'seller') => {
    // ملاحظة: في جدولك ظاهر عندك role = merchant/customer
    // لو تبغى توحيد القيم في DB، خلها merchant بدل seller:
    const dbRole = (role === 'seller' ? 'merchant' : 'customer') as any;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role: dbRole, // يخزنها في user_metadata (مفيد لو عندك trigger)
        },
      },
    });

    if (error) throw error;
    if (!data.user) throw new Error('No user returned');

    // حاول تجيب خطة "مجاني" - وإذا فشل لا توقف التسجيل
    let planId: string | null = null;
    const { data: plansData, error: plansError } = await supabase
      .from('plans')
      .select('id')
      .eq('name', 'مجاني')
      .maybeSingle();

    if (plansError) {
      console.warn('Could not fetch free plan:', plansError);
    } else {
      planId = plansData?.id ?? null;
    }

    // ✅ التغيير المهم: upsert بدل insert
    // إذا السطر موجود (بسبب trigger أو محاولة سابقة) راح يحدثه بدل ما يفشل
    const { error: profileError } = await supabase
      .from('users_profile')
      .upsert(
        {
          id: data.user.id,
          name,
          role: dbRole,
          plan_id: planId,
        },
        {
          onConflict: 'id',
        }
      );

    if (profileError) throw profileError;

    // بعدها نسحب البروفايل الحقيقي من DB لضمان إنه اتحدث فعلاً
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

    const { error } = await supabase
      .from('users_profile')
      .update(updates)
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
