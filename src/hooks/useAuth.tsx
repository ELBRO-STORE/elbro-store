
import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
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

  const fetchAdminStatus = async (userId: string) => {
    const { data, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Failed to load admin status:', error);
      return null;
    }

    return data as AdminUser | null;
  };

  const updateSession = async (user: User | null) => {
    const currentRequest = ++requestId.current;

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_USER', payload: user });

    if (!user) {
      dispatch({ type: 'SET_ADMIN', payload: null });
      dispatch({ type: 'SET_LOADING', payload: false });
      return;
    }

    try {
      const admin = await fetchAdminStatus(user.id);

      if (currentRequest !== requestId.current) return;

      dispatch({ type: 'SET_ADMIN', payload: admin });
    } catch (error) {
      console.error('Authentication update failed:', error);

      if (currentRequest === requestId.current) {
        dispatch({ type: 'SET_ADMIN', payload: null });
      }
    } finally {
      if (currentRequest === requestId.current) {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    }
  };

  const refreshSession = async () => {
    const currentRequest = ++requestId.current;

    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) throw error;
      if (currentRequest !== requestId.current) return;

      const user = session?.user ?? null;
      dispatch({ type: 'SET_USER', payload: user });

      if (user) {
        const admin = await fetchAdminStatus(user.id);

        if (currentRequest !== requestId.current) return;

        dispatch({ type: 'SET_ADMIN', payload: admin });
      } else {
        dispatch({ type: 'SET_ADMIN', payload: null });
      }
    } catch (error) {
      console.error('Failed to refresh session:', error);

      if (currentRequest === requestId.current) {
        dispatch({ type: 'SET_USER', payload: null });
        dispatch({ type: 'SET_ADMIN', payload: null });
      }
    } finally {
      if (currentRequest === requestId.current) {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    }
  };

  useEffect(() => {
    let mounted = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;

      const user = session?.user ?? null;

      // Defer database requests until after the auth callback finishes.
      window.setTimeout(() => {
        if (mounted) {
          void updateSession(user);
        }
      }, 0);
    });

    void refreshSession();

    return () => {
      mounted = false;
      requestId.current++;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const { error, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) return { error };

      if (data.user) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('phone')
            .eq('id', data.user.id)
            .maybeSingle();

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
        error: error instanceof Error
          ? error
          : new Error('Une erreur de connexion est survenue'),
      };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    fullName?: string,
    phone?: string
  ) => {
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName, phone } },
      });

      if (error) return { error };

      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            full_name: fullName,
            phone,
          } as any);

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
        error: error instanceof Error
          ? error
          : new Error('Une erreur d’inscription est survenue'),
      };
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const signOut = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      await supabase.auth.signOut();
    } finally {
      requestId.current++;
      dispatch({ type: 'SET_USER', payload: null });
      dispatch({ type: 'SET_ADMIN', payload: null });
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const login = signIn;

  const loginWithGoogle = async () => {
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
