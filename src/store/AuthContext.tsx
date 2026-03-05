import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../app/supabase';
import type { User } from '../types';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    loading: boolean;
    signOut: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    loading: true,
    signOut: async () => { },
    refreshUser: async () => { },
});

function clearSupabaseStorage() {
    Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('sb-')) localStorage.removeItem(key);
    });
}

async function fetchUserProfile(userId: string): Promise<User | null> {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

        if (error) return null;
        return data as User | null;
    } catch {
        return null;
    }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const mountedRef = useRef(true);

    const refreshUser = useCallback(async () => {
        const uid = session?.user?.id;
        if (!uid) return;
        const profile = await fetchUserProfile(uid);
        if (profile && mountedRef.current) setUser(profile);
    }, [session]);

    const signOut = useCallback(async () => {
        setUser(null);
        setSession(null);
        clearSupabaseStorage();
        try {
            await supabase.auth.signOut({ scope: 'local' });
        } catch {
            // signOut silencioso
        }
        clearSupabaseStorage();
        window.location.replace('/access');
    }, []);

    useEffect(() => {
        mountedRef.current = true;

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, s) => {
                if (!mountedRef.current) return;

                if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
                    if (s?.user?.id) {
                        setSession(s);
                        const profile = await fetchUserProfile(s.user.id);
                        if (!mountedRef.current) return;

                        if (profile) {
                            setUser(profile);
                        } else if (event === 'INITIAL_SESSION') {
                            // Perfil nao encontrado → sessao invalida
                            setSession(null);
                            setUser(null);
                        }
                    }
                    setLoading(false);

                } else if (event === 'TOKEN_REFRESHED' && s?.user?.id) {
                    setSession(s);

                } else if (event === 'SIGNED_OUT') {
                    setSession(null);
                    setUser(null);
                    setLoading(false);
                }
            }
        );

        // Segurança: se loading ficar true por mais de 5s, forçar false
        const safetyTimer = setTimeout(() => {
            if (mountedRef.current) setLoading(false);
        }, 5000);

        // Ao voltar de aba oculta por mais de 10s, recarregar página inteira
        let hiddenAt = 0;
        const handleVisibility = () => {
            if (document.visibilityState === 'hidden') {
                hiddenAt = Date.now();
            } else if (document.visibilityState === 'visible' && hiddenAt > 0) {
                if (Date.now() - hiddenAt > 10_000) {
                    window.location.reload();
                }
                hiddenAt = 0;
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            mountedRef.current = false;
            clearTimeout(safetyTimer);
            subscription.unsubscribe();
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, []);

    return (
        <AuthContext.Provider value={{ session, user, loading, signOut, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
