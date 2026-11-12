import { createContext, useContext, useEffect, useReducer, type ReactNode } from 'react';
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
      return { ...state, user: action.payload, loading: false };
    case 'SET_ADMIN':
      return { ...state, adminUser: action.payload, isAdmin: !!action.payload, isManager: !!action.payload };
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
  signUp: (email: string, password: string, fullName?: string, phone?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ error: Error | null }>;
  loginWithGoogle: () => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  const fetchAdminStatus = async (userId: string) => {
    const { data } = await supabase
      .from('admin_users')
      .select('*')
      .eq('user_id', userId)
      .single();
    dispatch({ type: 'SET_ADMIN', payload: data });
  };

  const refreshSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      dispatch({ type: 'SET_USER', payload: session.user });
      await fetchAdminStatus(session.user.id);
    } else {
      dispatch({ type: 'SET_USER', payload: null });
      dispatch({ type: 'SET_ADMIN', payload: null });
    }
  };

  useEffect(() => {
    refreshSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        dispatch({ type: 'SET_USER', payload: session.user });
        await fetchAdminStatus(session.user.id);
      } else {
        dispatch({ type: 'SET_USER', payload: null });
        dispatch({ type: 'SET_ADMIN', payload: null });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    dispatch({ type: 'SET_LOADING', payload: false });

    // Link guest orders to this user after successful login
    if (!error && data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('phone')
        .eq('id', data.user.id)
        .single();

      if (profile?.phone) {
        await supabase.rpc('link_guest_orders_to_user', {
          p_user_id: data.user.id,
          p_phone: profile.phone,
        });
      }
    }
    return { error };
  };

  const signUp = async (email: string, password: string, fullName?: string, phone?: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, phone } },
    });
    dispatch({ type: 'SET_LOADING', payload: false });

    // Create profile if signup successful
    if (!error && data.user) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        full_name: fullName,
        phone,
      } as any);

      // Link guest orders to this user
      if (phone) {
        await supabase.rpc('link_guest_orders_to_user', {
          p_user_id: data.user.id,
          p_phone: phone,
        });
      }
    }
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    dispatch({ type: 'SET_USER', payload: null });
    dispatch({ type: 'SET_ADMIN', payload: null });
  };

  // Aliases for backward compatibility
  const login = signIn;
  const loginWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
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