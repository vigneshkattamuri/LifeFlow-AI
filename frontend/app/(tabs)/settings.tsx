import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { supabase } from '../../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

type AIIntensity = 'light' | 'balanced' | 'strong';
type Theme = 'light' | 'dark';

const aiIntensityOptions = [
    { id: 'light' as AIIntensity, label: 'Light', description: 'Minimal AI suggestions' },
    { id: 'balanced' as AIIntensity, label: 'Balanced', description: 'Moderate AI guidance' },
    { id: 'strong' as AIIntensity, label: 'Strong', description: 'Maximum AI optimization' },
];

export default function SettingsScreen() {
    const router = useRouter();
    const { theme, colors, setTheme } = useTheme();
    const [habitReminders, setHabitReminders] = useState(true);
    const [taskAlerts, setTaskAlerts] = useState(true);
    const [aiInsights, setAiInsights] = useState(false);
    const [aiIntensity, setAiIntensity] = useState<AIIntensity>('balanced');

    // Load Settings
    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const storedHabit = await AsyncStorage.getItem('setting_habitReminders');
            const storedTask = await AsyncStorage.getItem('setting_taskAlerts');
            const storedAi = await AsyncStorage.getItem('setting_aiInsights');
            const storedIntensity = await AsyncStorage.getItem('setting_aiIntensity');

            if (storedHabit !== null) setHabitReminders(storedHabit === 'true');
            if (storedTask !== null) setTaskAlerts(storedTask === 'true');
            if (storedAi !== null) setAiInsights(storedAi === 'true');
            if (storedIntensity) setAiIntensity(storedIntensity as AIIntensity);
        } catch (e) {
            console.error("Failed to load settings", e);
        }
    };

    const toggleSetting = async (key: string, value: boolean, setter: (v: boolean) => void) => {
        setter(value);
        await AsyncStorage.setItem(`setting_${key}`, String(value));
    };

    const setIntensity = async (value: AIIntensity) => {
        setAiIntensity(value);
        await AsyncStorage.setItem('setting_aiIntensity', value);
    };

    const handleSignOut = async () => {
        Alert.alert(
            "Sign Out",
            "Are you sure you want to sign out?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Sign Out",
                    style: "destructive",
                    onPress: async () => {
                        await supabase.auth.signOut();
                        // router.replace('/login'); // Auth context usually handles this, but good to be safe if needed.
                        // For now let AuthProvider handle the state change redirect
                    }
                }
            ]
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <FontAwesome name="arrow-left" size={20} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
                <View style={{ width: 20 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Notifications */}
                <Text style={styles.sectionTitle}>Notifications</Text>
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.toggleRow}>
                        <View style={styles.toggleInfo}>
                            <Text style={[styles.toggleLabel, { color: colors.text }]}>Habit Reminders</Text>
                            <Text style={[styles.toggleDescription, { color: colors.textSecondary }]}>Get notified about your habits</Text>
                        </View>
                        <Switch
                            value={habitReminders}
                            onValueChange={(v) => toggleSetting('habitReminders', v, setHabitReminders)}
                            trackColor={{ false: theme === 'dark' ? '#4B5563' : '#E5E7EB', true: colors.primary }}
                            thumbColor="#FFFFFF"
                        />
                    </View>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    <View style={styles.toggleRow}>
                        <View style={styles.toggleInfo}>
                            <Text style={[styles.toggleLabel, { color: colors.text }]}>Task Alerts</Text>
                            <Text style={[styles.toggleDescription, { color: colors.textSecondary }]}>Reminders for upcoming tasks</Text>
                        </View>
                        <Switch
                            value={taskAlerts}
                            onValueChange={(v) => toggleSetting('taskAlerts', v, setTaskAlerts)}
                            trackColor={{ false: theme === 'dark' ? '#4B5563' : '#E5E7EB', true: colors.primary }}
                            thumbColor="#FFFFFF"
                        />
                    </View>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    <View style={styles.toggleRow}>
                        <View style={styles.toggleInfo}>
                            <Text style={[styles.toggleLabel, { color: colors.text }]}>AI Insights</Text>
                            <Text style={[styles.toggleDescription, { color: colors.textSecondary }]}>Daily insights and tips</Text>
                        </View>
                        <Switch
                            value={aiInsights}
                            onValueChange={(v) => toggleSetting('aiInsights', v, setAiInsights)}
                            trackColor={{ false: theme === 'dark' ? '#4B5563' : '#E5E7EB', true: colors.primary }}
                            thumbColor="#FFFFFF"
                        />
                    </View>
                </View>

                {/* AI Intensity */}
                <Text style={styles.sectionTitle}>AI Intensity</Text>
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    {aiIntensityOptions.map((option, index) => (
                        <View key={option.id}>
                            <TouchableOpacity
                                style={[
                                    styles.radioRow,
                                    aiIntensity === option.id && { backgroundColor: theme === 'dark' ? 'rgba(74, 108, 247, 0.1)' : '#F0F4FF' }
                                ]}
                                onPress={() => setIntensity(option.id)}
                            >
                                <View style={styles.radioInfo}>
                                    <Text style={[
                                        styles.radioLabel,
                                        { color: colors.text },
                                        aiIntensity === option.id && { color: colors.primary }
                                    ]}>
                                        {option.label}
                                    </Text>
                                    <Text style={[styles.radioDescription, { color: colors.textSecondary }]}>{option.description}</Text>
                                </View>
                            </TouchableOpacity>
                            {index < aiIntensityOptions.length - 1 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                        </View>
                    ))}
                </View>

                {/* Appearance */}
                <Text style={styles.sectionTitle}>Appearance</Text>
                <View style={styles.themeRow}>
                    <TouchableOpacity
                        style={[
                            styles.themeOption,
                            { backgroundColor: colors.card, borderColor: colors.border },
                            theme === 'light' && { borderColor: colors.primary, backgroundColor: '#F0F4FF' }
                        ]}
                        onPress={() => setTheme('light')}
                    >
                        <FontAwesome name="sun-o" size={24} color={theme === 'light' ? colors.primary : colors.textSecondary} />
                        <Text style={[styles.themeLabel, { color: theme === 'light' ? colors.primary : colors.textSecondary }]}>Light</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.themeOption,
                            { backgroundColor: colors.card, borderColor: colors.border },
                            theme === 'dark' && { borderColor: colors.primary, backgroundColor: 'rgba(74, 108, 247, 0.1)' }
                        ]}
                        onPress={() => setTheme('dark')}
                    >
                        <FontAwesome name="moon-o" size={24} color={theme === 'dark' ? colors.primary : colors.textSecondary} />
                        <Text style={[styles.themeLabel, { color: theme === 'dark' ? colors.primary : colors.textSecondary }]}>Dark</Text>
                    </TouchableOpacity>
                </View>

                {/* Account */}
                <Text style={styles.sectionTitle}>Account</Text>
                <View style={styles.menuContainer}>
                    <TouchableOpacity style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={[styles.menuLabel, { color: colors.text }]}>Privacy Policy</Text>
                        <FontAwesome name="chevron-right" size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={[styles.menuLabel, { color: colors.text }]}>Terms of Service</Text>
                        <FontAwesome name="chevron-right" size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={[styles.menuLabel, styles.dangerText]}>Delete Account</Text>
                        <FontAwesome name="chevron-right" size={16} color="#EF4444" />
                    </TouchableOpacity>
                </View>

                {/* Sign Out */}
                <TouchableOpacity
                    style={[styles.signOutButton, { backgroundColor: colors.card, borderColor: '#EF4444' }]}
                    onPress={handleSignOut}
                >
                    <Text style={styles.signOutText}>Sign Out</Text>
                </TouchableOpacity>

                <View style={{ height: 100 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FE',
        paddingTop: 35,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
        marginHorizontal: 20,
        marginBottom: 12,
        marginTop: 16,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        marginHorizontal: 20,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    toggleInfo: {
        flex: 1,
    },
    toggleLabel: {
        fontSize: 15,
        fontWeight: '500',
        color: '#1F2937',
        marginBottom: 2,
    },
    toggleDescription: {
        fontSize: 13,
        color: '#6B7280',
    },
    divider: {
        height: 1,
        backgroundColor: '#E5E7EB',
        marginHorizontal: 16,
    },
    radioRow: {
        padding: 16,
    },
    radioRowSelected: {
        backgroundColor: '#F0F4FF',
        borderRadius: 8,
        marginHorizontal: 8,
        marginVertical: 4,
    },
    radioInfo: {
        flex: 1,
    },
    radioLabel: {
        fontSize: 15,
        fontWeight: '500',
        color: '#1F2937',
        marginBottom: 2,
    },
    radioLabelSelected: {
        color: '#4A6CF7',
    },
    radioDescription: {
        fontSize: 13,
        color: '#6B7280',
    },
    themeRow: {
        flexDirection: 'row',
        marginHorizontal: 20,
        gap: 12,
    },
    themeOption: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#E5E7EB',
    },
    themeOptionSelected: {
        borderColor: '#4A6CF7',
        backgroundColor: '#F0F4FF',
    },
    themeLabel: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 8,
    },
    themeLabelSelected: {
        color: '#4A6CF7',
        fontWeight: '500',
    },
    menuContainer: {
        marginHorizontal: 20,
    },
    menuItem: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    menuLabel: {
        fontSize: 15,
        color: '#1F2937',
    },
    dangerText: {
        color: '#EF4444',
    },
    signOutButton: {
        marginHorizontal: 20,
        marginTop: 24,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#EF4444',
    },
    signOutText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#EF4444',
    },
});
