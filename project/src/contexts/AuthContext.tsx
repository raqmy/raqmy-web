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

    return (data as UserProfile) ?? null;
  };

  /**
   * Keep auth user_metadata in sync with users_profile.role
   * (This fixes UI places that read role from user.user_metadata.role)
   */
  const syncUserMetadataRole = async (desiredRole: 'customer' | 'seller') => {
    try {
      const currentRole = (supabase.auth.getUser ? undefined : undefined); // no-op for TS hints
      // Read from current state (fast)
      const current = (user?.user_metadata as any)?.role as 'customer' | 'seller' | undefined;

      if (current === desiredRole) return;

      const { data, error } = await supabase.auth.updateUser({
        data: { role: desiredRole },
      });

      if (error) {
        console.warn('Could not sync user metadata role:', error);
        return;
      }

      // Update local user state if supabase returned updated user
      if (data?.user) setUser(data.user);
    } catch (e) {
      console.warn('syncUserMetadataRole exception:', e);
    }
  };

  const loadSessionAndProfile = async (sessionUser: User | null) => {
    setUser(sessionUser ?? null);

    if (!sessionUser) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const profileData = await fetchProfile(sessionUser.id);
    setProfile(profileData);

    // If profile role exists, ensure metadata role matches it
    const profileRole = (profileData as any)?.role as 'customer' | 'seller' | undefined;
    if (profileRole) {
      // Also patch local state immediately (so UI doesn't flash "customer")
      const metaRole = (sessionUser.user_metadata as any)?.role as 'customer' | 'seller' | undefined;
      if (metaRole !== profileRole) {
        setUser({
          ...sessionUser,
          user_metadata: { ...(sessionUser.user_metadata as any), role: profileRole },
        } as any);

        // And persist it to Supabase auth metadata
        await syncUserMetadataRole(profileRole);
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      loadSessionAndProfile(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      loadSessionAndProfile(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signUp = async (email: string, password: string, name: string, role: 'customer' | 'seller') => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role, // metadata فقط
        },
      },
    });

    if (error) throw error;
    if (!data.user) throw new Error('No user returned');

    const { error: profileError } = await supabase
      .from('users_profile')
      .upsert(
        {
          id: data.user.id,
          name,
          role, // نخزن seller كما هو
        } as any,
        { onConflict: 'id' }
      );

    if (profileError) throw profileError;

    // Sync metadata role to avoid UI showing "customer"
    await syncUserMetadataRole(role);

    const profileData = await fetchProfile(data.user.id);
    setProfile(profileData);

    // Also patch local user state immediately if needed
    setUser((prev) => {
      const u = prev ?? data.user;
      return {
        ...u,
        user_metadata: { ...(u.user_metadata as any), role },
      } as any;
    });
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    // onAuthStateChange will refresh profile+metadata
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) throw new Error('No user logged in');

    const { error } = await supabase
      .from('users_profile')
      .update(updates as any)
      .eq('id', user.id);

    if (error) throw error;

    // If role was updated (upgrade customer -> seller), sync metadata too
    if ((updates as any)?.role === 'customer' || (updates as any)?.role === 'seller') {
      const newRole = (updates as any).role as 'customer' | 'seller';
      await syncUserMetadataRole(newRole);

      // patch local user state immediately
      setUser((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          user_metadata: { ...(prev.user_metadata as any), role: newRole },
        } as any;
      });
    }

    const updatedProfile = await fetchProfile(user.id);
    setProfile(updatedProfile);
  };

  const value = { user, profile, loading, signUp, signIn, signOut, updateProfile };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
