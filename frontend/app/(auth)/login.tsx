import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import FontAwesome from '@expo/vector-icons/FontAwesome';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const router = useRouter();

    async function signInWithEmail() {
        console.log("Attempting sign in...");
        setLoading(true);
        try {
            // Race condition to prevent infinite hanging
            const timeoutPromise = new Promise<{ error: any; data: any }>((_, reject) =>
                setTimeout(() => reject(new Error('Request timed out. Check your connection.')), 30000)
            );

            const { error, data } = await Promise.race([
                supabase.auth.signInWithPassword({ email, password }),
                timeoutPromise
            ]);
            console.log("Sign in result:", error ? "Error" : "Success", data);

            if (error) {
                Alert.alert('Error', error.message);
                setLoading(false);
            } else {
                console.log("Navigating to tabs...");
                setLoading(false);
                router.replace('/(tabs)');
            }
        } catch (e) {
            console.error("Sign in exception:", e);
            Alert.alert("Error", "An unexpected error occurred.");
            setLoading(false);
        }
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Logo */}
                <View style={styles.logoContainer}>
                    <FontAwesome name="lightbulb-o" size={40} color="#4A6CF7" />
                </View>

                {/* Title */}
                <Text style={styles.title}>Welcome back</Text>

                {/* Subtitle */}
                <Text style={styles.subtitle}>
                    Continue your <Text style={styles.subtitleHighlight}>journey to better habits</Text>
                </Text>

                {/* Email Input */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Email</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="your@email.com"
                        placeholderTextColor="#9CA3AF"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />
                </View>

                {/* Password Input */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Password</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="••••••••••"
                        placeholderTextColor="#9CA3AF"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />
                </View>

                {/* Remember Me & Forgot */}
                <View style={styles.row}>
                    <TouchableOpacity
                        style={styles.checkboxRow}
                        onPress={() => setRememberMe(!rememberMe)}
                    >
                        <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                            {rememberMe && <FontAwesome name="check" size={12} color="white" />}
                        </View>
                        <Text style={styles.checkboxLabel}>Remember me</Text>
                    </TouchableOpacity>
                    <TouchableOpacity>
                        <Text style={styles.forgotText}>Forgot?</Text>
                    </TouchableOpacity>
                </View>

                {/* Sign In Button */}
                <TouchableOpacity
                    style={[styles.signInButton, loading && styles.buttonDisabled]}
                    onPress={signInWithEmail}
                    disabled={loading}
                >
                    <Text style={styles.signInButtonText}>{loading ? "Signing in..." : "Sign In"}</Text>
                </TouchableOpacity>


                {/* Sign Up Link */}
                <View style={styles.signUpRow}>
                    <Text style={styles.signUpText}>Don't have an account? </Text>
                    <Link href="/(auth)/signup" asChild>
                        <TouchableOpacity>
                            <Text style={styles.signUpLink}>Sign up</Text>
                        </TouchableOpacity>
                    </Link>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    scrollContent: {
        flexGrow: 1,
        padding: 24,
        paddingTop: 60,
    },
    logoContainer: {
        width: 64,
        height: 64,
        backgroundColor: '#F0F4FF',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#4A6CF7',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 32,
    },
    subtitleHighlight: {
        color: '#4A6CF7',
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: '#374151',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        padding: 14,
        fontSize: 16,
        color: '#1F2937',
        backgroundColor: '#FAFAFA',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    checkbox: {
        width: 20,
        height: 20,
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 4,
        marginRight: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxChecked: {
        backgroundColor: '#4A6CF7',
        borderColor: '#4A6CF7',
    },
    checkboxLabel: {
        fontSize: 14,
        color: '#6B7280',
    },
    forgotText: {
        fontSize: 14,
        color: '#4A6CF7',
    },
    signInButton: {
        backgroundColor: '#4A6CF7',
        borderRadius: 8,
        padding: 16,
        alignItems: 'center',
        marginBottom: 16,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    signInButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    demoButton: {
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        padding: 16,
        alignItems: 'center',
        marginBottom: 32,
    },
    demoButtonText: {
        color: '#4A6CF7',
        fontSize: 16,
        fontWeight: '600',
    },
    signUpRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    signUpText: {
        fontSize: 14,
        color: '#6B7280',
    },
    signUpLink: {
        fontSize: 14,
        color: '#4A6CF7',
        fontWeight: '600',
    },
});
