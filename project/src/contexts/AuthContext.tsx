import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, UserProfile } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    name: string,
    role: 'customer' | 'seller'
  ) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  changeEmail: (newEmail: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_CACHE_KEY = 'raqmy_auth_cache_v1';

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

type ExtendedUserProfile = UserProfile & {
  signup_completed?: boolean;
  phone_verified?: boolean;
  phone?: string | null;
};

type CachedAuthState = {
  user: Pick<User, 'id' | 'email' | 'user_metadata' | 'app_metadata'> | null;
  profile: ExtendedUserProfile | null;
};

const readCachedAuthState = (): CachedAuthState | null => {
  try {
    const raw = sessionStorage.getItem(AUTH_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const writeCachedAuthState = (
  user: User | null,
  profile: ExtendedUserProfile | null
) => {
  try {
    const payload: CachedAuthState = {
      user: user
        ? {
            id: user.id,
            email: user.email ?? null,
            user_metadata: user.user_metadata ?? {},
            app_metadata: user.app_metadata ?? {},
          }
        : null,
      profile,
    };

    sessionStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // ignore cache write errors
  }
};

const clearCachedAuthState = () => {
  try {
    sessionStorage.removeItem(AUTH_CACHE_KEY);
  } catch {
    // ignore
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const cachedState = readCachedAuthState();

  const [user, setUser] = useState<User | null>(
    cachedState?.user ? (cachedState.user as User) : null
  );
  const [profile, setProfile] = useState<ExtendedUserProfile | null>(
    cachedState?.profile ?? null
  );
  const [loading, setLoading] = useState(!cachedState);

  const mountedRef = useRef(true);
  const currentUserIdRef = useRef<string | null>(cachedState?.user?.id ?? null);
  const profileRequestIdRef = useRef(0);

  useEffect(() => {
    writeCachedAuthState(user, profile);
  }, [user, profile]);

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

  const fetchProfile = async (userId: string): Promise<ExtendedUserProfile | null> => {
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
    } as ExtendedUserProfile;
  };

  const ensureUserProfileRecord = async (authUser: User): Promise<ExtendedUserProfile | null> => {
    const existingProfile = await fetchProfile(authUser.id);

    if (existingProfile) {
      return existingProfile;
    }

    const fallbackName =
      authUser.user_metadata?.name ||
      authUser.email?.split('@')[0] ||
      'مستخدم جديد';

    const fallbackRole = normalizeRole(authUser.user_metadata?.role);

    const { error: createProfileError } = await supabase
      .from('users_profile')
      .upsert(
        {
          id: authUser.id,
          name: fallbackName,
          email: (authUser.email || '').trim().toLowerCase(),
          role: fallbackRole,
          phone: null,
          phone_verified: false,
          signup_completed: false,
        } as any,
        { onConflict: 'id' }
      );

    if (createProfileError) {
      console.error('Error creating missing profile:', createProfileError);
      return null;
    }

    return await fetchProfile(authUser.id);
  };

  const loadProfileForUser = async (nextUser: User | null) => {
    const requestId = ++profileRequestIdRef.current;

    if (!nextUser) {
      if (!mountedRef.current) return;
      currentUserIdRef.current = null;
      setUser(null);
      setProfile(null);
      clearCachedAuthState();
      setLoading(false);
      return;
    }

    currentUserIdRef.current = nextUser.id;
    setUser(nextUser);

    try {
      const profileData = await ensureUserProfileRecord(nextUser);

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

        const sessionUser = session?.user ?? null;

        if (!sessionUser) {
          currentUserIdRef.current = null;
          setUser(null);
          setProfile(null);
          clearCachedAuthState();
          setLoading(false);
          return;
        }

        const cachedUserId = currentUserIdRef.current;
        const isSameCachedUser = cachedUserId && cachedUserId === sessionUser.id;

        setUser(sessionUser);

        if (isSameCachedUser && cachedState?.profile) {
          setLoading(false);
          void loadProfileForUser(sessionUser);
          return;
        }

        await loadProfileForUser(sessionUser);
      } catch (error) {
        console.error('Error bootstrapping auth state:', error);

        if (!mountedRef.current) return;
        setUser(null);
        setProfile(null);
        clearCachedAuthState();
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
        clearCachedAuthState();
        setLoading(false);
        return;
      }

      const currentUserId = currentUserIdRef.current;
      const nextUserId = nextUser?.id ?? null;
      const isSameUser =
        !!currentUserId && !!nextUserId && currentUserId === nextUserId;

      setUser(nextUser);

      if (!nextUser) {
        setProfile(null);
        clearCachedAuthState();
        setLoading(false);
        return;
      }

      if (
        isSameUser &&
        (event === 'TOKEN_REFRESHED' ||
          event === 'INITIAL_SESSION' ||
          event === 'PASSWORD_RECOVERY') &&
        profile
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
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedRole = normalizeRole(role);

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
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
          email: normalizedEmail,
          role: normalizedRole,
          phone: null,
          phone_verified: false,
          signup_completed: false,
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

    const profileData = await ensureUserProfileRecord(data.user);

    if (mountedRef.current) {
      currentUserIdRef.current = data.user.id;
      setUser(data.user);
      setProfile(profileData);
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) throw error;
    if (!data.user) throw new Error('فشل تسجيل الدخول');

    const profileData = await ensureUserProfileRecord(data.user);

    if (!profileData) {
      await supabase.auth.signOut();
      throw new Error('تعذر العثور على بيانات الحساب أو إنشاؤها.');
    }

    if (!profileData.signup_completed) {
      await supabase.auth.signOut();
      throw new Error(
        'هذا الحساب لم يكمل خطوات التسجيل بعد. يجب إكمال التحقق من البريد الإلكتروني قبل تسجيل الدخول.'
      );
    }

    if (mountedRef.current) {
      currentUserIdRef.current = data.user.id;
      setUser(data.user);
      setProfile(profileData);
      setLoading(false);
    }
  };

  const requestPasswordReset = async (email: string) => {
    const normalizedEmail = email.trim().toLowerCase();

    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) throw error;
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;
  };

  const changeEmail = async (newEmail: string) => {
    if (!user) throw new Error('لا يوجد مستخدم مسجل دخول');

    const normalizedEmail = newEmail.trim().toLowerCase();
    const currentEmail = (user.email || '').trim().toLowerCase();

    if (!normalizedEmail) {
      throw new Error('البريد الإلكتروني الجديد مطلوب');
    }

    if (normalizedEmail === currentEmail) {
      throw new Error('البريد الإلكتروني الجديد مطابق للبريد الحالي');
    }

    const { data, error } = await supabase.auth.updateUser(
      {
        email: normalizedEmail,
      },
      {
        emailRedirectTo: `${window.location.origin}/profile`,
      }
    );

    if (error) throw error;

    if (mountedRef.current && data.user) {
      setUser(data.user);
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    currentUserIdRef.current = null;
    clearCachedAuthState();
    setUser(null);
    setProfile(null);
    setLoading(false);
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

    const updatedProfile = await ensureUserProfileRecord(user);
    if (mountedRef.current) {
      setProfile(updatedProfile);
    }
  };

  const refreshProfile = async () => {
    if (!user) return;

    const updatedProfile = await ensureUserProfileRecord(user);
    if (mountedRef.current) {
      setProfile(updatedProfile);
    }
  };

  const value: AuthContextType = {
    user,
    profile: profile as UserProfile | null,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
    refreshProfile,
    requestPasswordReset,
    updatePassword,
    changeEmail,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
