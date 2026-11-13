
import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { AdminUser } from '../types/database';

interface AuthState {
  user: User | null;
  adminUser: AdminUser | null;
  loading: boolean;
  isAdmin: boolean;
  isManager: boolean;
}

type AuthAction =
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_ADMIN'; payload: AdminUser | null }
  | { type: 'SET_LOADING'; payload: boolean };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload };

    case 'SET_ADMIN':
      return {
        ...state,
        adminUser: action.payload,
        isAdmin: !!action.payload,
        isManager: !!action.payload,
      };

    case 'SET_LOADING':
      return { ...state, loading: action.payload };

    default:
      return state;
  }
}

const initialState: AuthState = {
  user: null,
  adminUser: null,
  loading: true,
  isAdmin: false,
  isManager: false,
};

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    fullName?: string,
    phone?: string
  ) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ error: Error | null }>;
  loginWithGoogle: () => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  const requestId = useRef(0);
  const mountedRef = useRef(false);
  const activeUserId = useRef<string | null>(null);
  const processedSession = useRef<string | null>(null);
  const adminCache = useRef<Map<string, AdminUser | null>>(new Map());

  const fetchAdminStatus = async (
    userId: string
  ): Promise<AdminUser | null> => {
    const { data, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Failed to load admin status:', error);
      throw error;
    }

    return data as AdminUser | null;
  };

  const processSession = async (
    session: Session | null,
    force = false
  ): Promise<void> => {
    if (!mountedRef.current) return;

    const user = session?.user ?? null;
    const userId = user?.id ?? null;

    const sessionKey = userId
      ? `${userId}:${session?.access_token ?? ''}`
      : 'no-session';

    if (!force && processedSession.current === sessionKey) {
      return;
    }

    processedSession.current = sessionKey;

    const currentRequest = ++requestId.current;

    activeUserId.current = userId;

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_USER', payload: user });

    if (!user) {
      dispatch({ type: 'SET_ADMIN', payload: null });
      dispatch({ type: 'SET_LOADING', payload: false });
      return;
    }

    try {
      let admin = adminCache.current.get(user.id);

      if (admin === undefined || force) {
        admin = await fetchAdminStatus(user.id);
        adminCache.current.set(user.id, admin);
      }

      if (
        !mountedRef.current ||
        currentRequest !== requestId.current ||
        activeUserId.current !== user.id
      ) {
        return;
      }

      dispatch({ type: 'SET_ADMIN', payload: admin });
    } catch (error) {
      console.error('Authentication update failed:', error);

      if (
        mountedRef.current &&
        currentRequest === requestId.current &&
        activeUserId.current === user.id
      ) {
        dispatch({ type: 'SET_ADMIN', payload: null });
      }
    } finally {
      if (
        mountedRef.current &&
        currentRequest === requestId.current
      ) {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    }
  };

  const refreshSession = async (): Promise<void> => {
    // Uses the current in-memory auth state.
    // It does not manually request another token refresh.
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      console.error('Failed to refresh session:', error);
      return;
    }

    await processSession(data.session, true);
  };

  useEffect(() => {
    mountedRef.current = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mountedRef.current) return;

      if (event === 'TOKEN_REFRESHED') {
        // The user identity did not change; no need to fetch admin again.
        return;
      }

      if (event === 'USER_UPDATED') {
        adminCache.current.delete(session?.user.id ?? '');
      }

      if (event === 'SIGNED_OUT') {
        adminCache.current.clear();
        processedSession.current = 'no-session';
      }

      // Defer work until Supabase finishes its auth callback.
      window.setTimeout(() => {
        if (!mountedRef.current) return;
        void processSession(session);
      }, 0);
    });

    return () => {
      mountedRef.current = false;
      requestId.current++;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (
    email: string,
    password: string
  ): Promise<{ error: Error | null }> => {
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) return { error };

      if (data.user) {
        try {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('phone')
            .eq('id', data.user.id)
            .maybeSingle();

          if (profileError) {
            console.error('Failed to load profile phone:', profileError);
          }

          if (profile?.phone) {
            const { error: linkError } = await supabase.rpc(
              'link_guest_orders_to_user',
              {
                p_user_id: data.user.id,
                p_phone: profile.phone,
              }
            );

            if (linkError) {
              console.error('Failed to link guest orders:', linkError);
            }
          }
        } catch (linkError) {
          console.error('Failed to link guest orders:', linkError);
        }
      }

      return { error: null };
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error
            : new Error('Une erreur de connexion est survenue'),
      };
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const signUp = async (
    email: string,
    password: string,
    fullName?: string,
    phone?: string
  ): Promise<{ error: Error | null }> => {
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone,
          },
        },
      });

      if (error) return { error };

      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert(
            {
              id: data.user.id,
              full_name: fullName,
              phone,
            } as any,
            { onConflict: 'id' }
          );

        if (profileError) {
          console.error('Failed to create profile:', profileError);
        }

        if (phone && data.session) {
          const { error: linkError } = await supabase.rpc(
            'link_guest_orders_to_user',
            {
              p_user_id: data.user.id,
              p_phone: phone,
            }
          );

          if (linkError) {
            console.error('Failed to link guest orders:', linkError);
          }
        }
      }

      return { error: null };
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error
            : new Error('Une erreur d’inscription est survenue'),
      };
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const signOut = async (): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('Sign out failed:', error);
      }
    } finally {
      requestId.current++;
      activeUserId.current = null;
      processedSession.current = 'no-session';
      adminCache.current.clear();

      dispatch({ type: 'SET_USER', payload: null });
      dispatch({ type: 'SET_ADMIN', payload: null });
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const login = signIn;

  const loginWithGoogle = async (): Promise<{ error: Error | null }> => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    });

    return { error };
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signIn,
        signUp,
        signOut,
        refreshSession,
        login,
        loginWithGoogle,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
