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
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// 1) Normalize role coming from DB/auth (some setups use "merchant")
const normalizeRole = (role: any): 'customer' | 'seller' | 'admin' => {
  if (role === 'merchant') return 'seller';
  if (role === 'seller') return 'seller';
  if (role === 'admin') return 'admin';
  return 'customer';
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

    // normalize role to UI format
    const normalized = { ...data, role: normalizeRole((data as any).role) } as any;
    return normalized as UserProfile;
  };

  // Keep auth metadata in sync with DB profile (fix: showing "عميل" even when seller)
  const syncAuthMetadataWithProfile = async (p: UserProfile | null) => {
    try {
      if (!p) return;
      const currentUser = (await supabase.auth.getUser()).data.user;
      if (!currentUser) return;

      const metaRole = normalizeRole((currentUser.user_metadata as any)?.role);
      const metaName = (currentUser.user_metadata as any)?.name;

      const desiredRole = normalizeRole((p as any).role);
      const desiredName = (p as any).name ?? metaName;

      // Update only if different to avoid extra calls
      if (metaRole !== desiredRole || (desiredName && metaName !== desiredName)) {
        const { error } = await supabase.auth.updateUser({
          data: {
            role: desiredRole,
            name: desiredName,
          },
        });
        if (error) console.warn('Could not sync auth metadata:', error);
      }
    } catch (e) {
      console.warn('syncAuthMetadataWithProfile failed:', e);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      (async () => {
        setUser(session?.user ?? null);

        if (session?.user) {
          const profileData = await fetchProfile(session.user.id);
          setProfile(profileData);
          await syncAuthMetadataWithProfile(profileData);
        } else {
          setProfile(null);
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
          await syncAuthMetadataWithProfile(profileData);
        } else {
          setProfile(null);
        }

        setLoading(false);
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, name: string, role: 'customer' | 'seller') => {
    const normalizedRole = normalizeRole(role);

    // 1) Create auth user + set metadata
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role: normalizedRole,
        },
      },
    });

    if (error) throw error;
    if (!data.user) throw new Error('No user returned');

    // 2) Insert/Upsert profile in DB (same role)
    const { error: profileError } = await supabase
      .from('users_profile')
      .upsert(
        {
          id: data.user.id,
          name,
          role: normalizedRole,
        } as any,
        { onConflict: 'id' }
      );

    if (profileError) throw profileError;

    // 3) Force metadata sync (some setups don’t persist signup metadata immediately)
    const { error: metaError } = await supabase.auth.updateUser({
      data: {
        name,
        role: normalizedRole,
      },
    });
    if (metaError) console.warn('Signup metadata update warning:', metaError);

    // 4) Refresh profile in state
    const profileData = await fetchProfile(data.user.id);
    setProfile(profileData);
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    // onAuthStateChange will refresh profile
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) throw new Error('No user logged in');

    // If role is being updated, normalize it
    const updatesForDb: any = { ...updates };
    if ('role' in updatesForDb) {
      updatesForDb.role = normalizeRole((updatesForDb as any).role);
    }

    // 1) Update DB profile
    const { error } = await supabase
      .from('users_profile')
      .update(updatesForDb)
      .eq('id', user.id);

    if (error) throw error;

    // 2) Update auth metadata too (THIS fixes "عميل" showing in header after upgrading)
    const metaPayload: any = {};
    if (updatesForDb.role) metaPayload.role = updatesForDb.role;
    if (updatesForDb.name) metaPayload.name = updatesForDb.name;

    if (Object.keys(metaPayload).length > 0) {
      const { error: metaError } = await supabase.auth.updateUser({ data: metaPayload });
      if (metaError) console.warn('Metadata update warning:', metaError);
    }

    // 3) Refresh profile state
    const updatedProfile = await fetchProfile(user.id);
    setProfile(updatedProfile);
  };

  const refreshProfile = async () => {
    if (!user) return;

    const updatedProfile = await fetchProfile(user.id);
    setProfile(updatedProfile);
  };

  const value = { user, profile, loading, signUp, signIn, signOut, updateProfile, refreshProfile };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
