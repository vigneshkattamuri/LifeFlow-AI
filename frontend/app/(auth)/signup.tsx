import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import FontAwesome from '@expo/vector-icons/FontAwesome';

export default function Signup() {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [agreeTerms, setAgreeTerms] = useState(false);
    const router = useRouter();

    async function signUpWithEmail() {
        if (!agreeTerms) {
            Alert.alert('Error', 'Please agree to the Terms of Service and Privacy Policy');
            return;
        }

        setLoading(true);
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: fullName }
            }
        });

        if (error) {
            Alert.alert('Error', error.message);
            setLoading(false);
        } else {
            // Check if email confirmation is required (usually is by default)
            Alert.alert('Success', 'Please check your inbox for email verification!');
            // Ideally we'd wait for session or navigate to a specialized verification screen
            // For now, let's allow them to proceed to onboarding if session exists or just redirect
            // But with email verify, they can't login yet. 
            // We'll just stop loading.
            setLoading(false);
            // Optionally redirect to login
            router.replace('/(auth)/login');
        }
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Back Button */}
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <FontAwesome name="arrow-left" size={20} color="#4A6CF7" />
                </TouchableOpacity>

                {/* Title */}
                <Text style={styles.title}>Create account</Text>

                {/* Subtitle */}
                <Text style={styles.subtitle}>
                    Start your <Text style={styles.subtitleHighlight}>journey to better habits and productivity</Text>
                </Text>

                {/* Full Name Input */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Full Name</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="John Doe"
                        placeholderTextColor="#9CA3AF"
                        value={fullName}
                        onChangeText={setFullName}
                    />
                </View>

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
                    <Text style={styles.hint}>At least 8 characters with numbers and letters</Text>
                </View>

                {/* Terms Checkbox */}
                <TouchableOpacity
                    style={styles.termsRow}
                    onPress={() => setAgreeTerms(!agreeTerms)}
                >
                    <View style={[styles.checkbox, agreeTerms && styles.checkboxChecked]}>
                        {agreeTerms && <FontAwesome name="check" size={12} color="white" />}
                    </View>
                    <Text style={styles.termsText}>
                        I agree to the <Text style={styles.termsLink}>Terms of Service</Text> and <Text style={styles.termsLink}>Privacy Policy</Text>
                    </Text>
                </TouchableOpacity>

                {/* Create Account Button */}
                <TouchableOpacity
                    style={[styles.createButton, loading && styles.buttonDisabled]}
                    onPress={signUpWithEmail}
                    disabled={loading}
                >
                    <Text style={styles.createButtonText}>{loading ? "Creating..." : "Create Account"}</Text>
                </TouchableOpacity>

                {/* Sign In Link */}
                <View style={styles.signInRow}>
                    <Text style={styles.signInText}>Already have an account? </Text>
                    <Link href="/(auth)/login" asChild>
                        <TouchableOpacity>
                            <Text style={styles.signInLink}>Sign in</Text>
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
    backButton: {
        marginBottom: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 32,
        lineHeight: 20,
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
    hint: {
        fontSize: 12,
        color: '#4A6CF7',
        marginTop: 6,
    },
    termsRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 24,
        marginTop: 8,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 4,
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 2,
    },
    checkboxChecked: {
        backgroundColor: '#4A6CF7',
        borderColor: '#4A6CF7',
    },
    termsText: {
        fontSize: 14,
        color: '#6B7280',
        flex: 1,
        lineHeight: 20,
    },
    termsLink: {
        color: '#EF4444',
    },
    createButton: {
        backgroundColor: '#4A6CF7',
        borderRadius: 8,
        padding: 16,
        alignItems: 'center',
        marginBottom: 24,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    createButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    signInRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    signInText: {
        fontSize: 14,
        color: '#6B7280',
    },
    signInLink: {
        fontSize: 14,
        color: '#4A6CF7',
        fontWeight: '600',
    },
});
