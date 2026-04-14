import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
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

const normalizeRole = (role: any): 'customer' | 'seller' | 'admin' => {
  if (role === 'merchant') return 'seller';
  if (role === 'seller') return 'seller';
  if (role === 'admin' || role === 'superadmin') return 'admin';
  return 'customer';
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const mountedRef = useRef(true);
  const currentUserIdRef = useRef<string | null>(null);
  const profileRequestIdRef = useRef(0);

  const refreshUserSubscriptionStatus = async (userId: string) => {
    try {
      const { error } = await supabase.rpc('refresh_user_subscription', {
        p_user_id: userId,
      });

      if (error) {
        console.warn('refresh_user_subscription warning:', error);
      }
    } catch (error) {
      console.warn('refresh_user_subscription failed:', error);
    }
  };

  const fetchProfile = async (userId: string): Promise<UserProfile | null> => {
    await refreshUserSubscriptionStatus(userId);

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

    return {
      ...(data as any),
      role: normalizeRole((data as any).role),
    } as UserProfile;
  };

  const loadProfileForUser = async (nextUser: User | null) => {
    const requestId = ++profileRequestIdRef.current;

    if (!nextUser) {
      if (!mountedRef.current) return;
      currentUserIdRef.current = null;
      setUser(null);
      setProfile(null);
      setLoading(false);
      return;
    }

    currentUserIdRef.current = nextUser.id;
    setUser(nextUser);

    try {
      const profileData = await fetchProfile(nextUser.id);

      if (!mountedRef.current) return;
      if (profileRequestIdRef.current !== requestId) return;
      if (currentUserIdRef.current !== nextUser.id) return;

      setProfile(profileData);
    } catch (error) {
      console.error('Error loading profile:', error);

      if (!mountedRef.current) return;
      if (profileRequestIdRef.current !== requestId) return;

      setProfile(null);
    } finally {
      if (!mountedRef.current) return;
      if (profileRequestIdRef.current !== requestId) return;

      setLoading(false);
    }
  };

  useEffect(() => {
    mountedRef.current = true;

    const bootstrapAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mountedRef.current) return;

        await loadProfileForUser(session?.user ?? null);
      } catch (error) {
        console.error('Error bootstrapping auth state:', error);

        if (!mountedRef.current) return;
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    };

    bootstrapAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mountedRef.current) return;

      const nextUser = session?.user ?? null;

      if (event === 'SIGNED_OUT') {
        currentUserIdRef.current = null;
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      const currentUserId = currentUserIdRef.current;
      const nextUserId = nextUser?.id ?? null;
      const isSameUser = currentUserId && nextUserId && currentUserId === nextUserId;

      setUser(nextUser);

      if (!nextUser) {
        setProfile(null);
        setLoading(false);
        return;
      }

      if (
        isSameUser &&
        (event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION')
      ) {
        setLoading(false);
        return;
      }

      void loadProfileForUser(nextUser);
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (
    email: string,
    password: string,
    name: string,
    role: 'customer' | 'seller'
  ) => {
    const normalizedRole = normalizeRole(role);

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

    const { error: metaError } = await supabase.auth.updateUser({
      data: {
        name,
        role: normalizedRole,
      },
    });

    if (metaError) {
      console.warn('Signup metadata update warning:', metaError);
    }

    const profileData = await fetchProfile(data.user.id);
    if (mountedRef.current) {
      setProfile(profileData);
    }
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

    const updatesForDb: any = { ...updates };

    if ('role' in updatesForDb) {
      updatesForDb.role = normalizeRole(updatesForDb.role);
    }

    const { error } = await supabase
      .from('users_profile')
      .update(updatesForDb)
      .eq('id', user.id);

    if (error) throw error;

    const metaPayload: any = {};
    if (updatesForDb.role) metaPayload.role = updatesForDb.role;
    if (updatesForDb.name) metaPayload.name = updatesForDb.name;

    if (Object.keys(metaPayload).length > 0) {
      const { error: metaError } = await supabase.auth.updateUser({
        data: metaPayload,
      });

      if (metaError) {
        console.warn('Metadata update warning:', metaError);
      }
    }

    const updatedProfile = await fetchProfile(user.id);
    if (mountedRef.current) {
      setProfile(updatedProfile);
    }
  };

  const refreshProfile = async () => {
    if (!user) return;

    const updatedProfile = await fetchProfile(user.id);
    if (mountedRef.current) {
      setProfile(updatedProfile);
    }
  };

  const value: AuthContextType = {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
