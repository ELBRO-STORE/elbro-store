
import {
  createContext,
  useContext,
  useEffect,
  useReducer,
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

  const fetchAdminStatus = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Failed to load admin status:', error);
        dispatch({ type: 'SET_ADMIN', payload: null });
        return;
      }

      dispatch({ type: 'SET_ADMIN', payload: data });
    } catch (error) {
      console.error('Failed to load admin status:', error);
      dispatch({ type: 'SET_ADMIN', payload: null });
    }
  };

  const refreshSession = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) throw error;

      if (session?.user) {
        dispatch({ type: 'SET_USER', payload: session.user });
        await fetchAdminStatus(session.user.id);
      } else {
        dispatch({ type: 'SET_USER', payload: null });
        dispatch({ type: 'SET_ADMIN', payload: null });
      }
    } catch (error) {
      console.error('Failed to refresh session:', error);
      dispatch({ type: 'SET_USER', payload: null });
      dispatch({ type: 'SET_ADMIN', payload: null });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      await refreshSession();
    };

    initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;

      const updateAuth = async () => {
        dispatch({ type: 'SET_LOADING', payload: true });

        try {
          if (session?.user) {
            dispatch({ type: 'SET_USER', payload: session.user });
            await fetchAdminStatus(session.user.id);
          } else {
            dispatch({ type: 'SET_USER', payload: null });
            dispatch({ type: 'SET_ADMIN', payload: null });
          }
        } finally {
          if (mounted) {
            dispatch({ type: 'SET_LOADING', payload: false });
          }
        }
      };

      void updateAuth();
    });

    return () => {
      mounted = false;
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

      if (error) {
        dispatch({ type: 'SET_LOADING', payload: false });
        return { error };
      }

      if (data.user) {
        dispatch({ type: 'SET_USER', payload: data.user });
        await fetchAdminStatus(data.user.id);

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
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
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
