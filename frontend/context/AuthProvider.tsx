import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useRouter, useSegments } from 'expo-router';

type AuthContextType = {
    session: Session | null;
    user: User | null;
    loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    loading: true,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const segments = useSegments();

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session }, error } = await supabase.auth.getSession();
            if (session?.user) {
                // Fetch profile to check onboarding status
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('has_completed_onboarding')
                    .eq('id', session.user.id)
                    .single();

                // If profile exists, check status. Otherwise assume false or handle error
                const completedOnboarding = profile?.has_completed_onboarding ?? false;

                setSession(session);
                setUser(session.user);

                // Check routing
                handleRouting(session, completedOnboarding);
            } else {
                setSession(null);
                setUser(null);
            }
            setLoading(false);
        };

        checkAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            let completedOnboarding = false;

            if (session?.user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('has_completed_onboarding')
                    .eq('id', session.user.id)
                    .single();
                completedOnboarding = profile?.has_completed_onboarding ?? false;
            }

            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);

            handleRouting(session, completedOnboarding);
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleRouting = (session: Session | null, completedOnboarding: boolean) => {
        const inAuthGroup = segments[0] === '(auth)';
        const inOnboarding = segments[0] === 'onboarding';

        if (!session && !inAuthGroup && !inOnboarding) {
            // Redirect to login if not authenticated
            router.replace('/(auth)/login');
        } else if (session) {
            if (!completedOnboarding) {
                // Redirect to onboarding if not completed
                // Only redirect if NOT already in onboarding to avoid loops
                if (!inOnboarding) {
                    router.replace('/onboarding/welcome');
                }
            } else if (inAuthGroup || inOnboarding) {
                // Redirect to home if authenticated AND completed onboarding, but trying to access auth/onboarding
                router.replace('/(tabs)');
            }
        }
    };

    // Re-run routing check when segments change
    useEffect(() => {
        if (!loading) {
            // We need to fetch/know the onboarding status here too to be accurate
            // Ideally should store 'hasCompletedOnboarding' in state to avoid re-fetching
            // For now, let's rely on the initial check or state if we add it
        }
    }, [segments, loading, session]);

    return (
        <AuthContext.Provider value={{ session, user, loading }}>
            {children}
        </AuthContext.Provider>
    );
}
