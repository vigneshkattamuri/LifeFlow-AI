import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback, useRef, useEffect } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';
import { generateTwinNarrative } from '../lib/ai';

const TIME_HORIZONS = [30, 60, 90];

export default function DigitalTwinScreen() {
    const router = useRouter();
    const { theme, colors } = useTheme();
    const [loading, setLoading] = useState(true);
    const [selectedDays, setSelectedDays] = useState(30);
    const [narrative, setNarrative] = useState('');

    // Base Stats (Real from DB)
    const [baseStats, setBaseStats] = useState({
        consistency: 0,
        energy: 50,
        focusHours: 2,
        missedTasks: 5
    });

    useFocusEffect(
        useCallback(() => {
            fetchBaseStats();
        }, [])
    );

    // Re-generate narrative when days change (debounce likely needed in real app, but ok here)
    useEffect(() => {
        if (!loading) {
            updateNarrative();
        }
    }, [selectedDays, loading]);

    const fetchBaseStats = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Fetch Real Context
            const today = new Date();
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(today.getDate() - 30);

            // Habit Consistency
            const { count: totalHabitLogs } = await supabase
                .from('habit_logs')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .gte('completed_at', thirtyDaysAgo.toISOString())
                .eq('status', 'completed');

            const consistency = Math.min(Math.round(((totalHabitLogs || 0) / 60) * 100), 100); // Assume 2 habits/day baseline

            // Energy Avg
            const { data: metrics } = await supabase
                .from('daily_metrics')
                .select('energy_level')
                .eq('user_id', user.id)
                .gte('date', thirtyDaysAgo.toISOString().split('T')[0]);

            const avgEnergy = metrics && metrics.length > 0
                ? Math.round(metrics.reduce((acc, m) => acc + (m.energy_level || 50), 0) / metrics.length)
                : 50;

            const stats = {
                consistency,
                energy: avgEnergy,
                focusHours: 2.1, // Placeholder logic for now
                missedTasks: 4   // Placeholder logic for now
            };
            setBaseStats(stats);

            // Initial Narrative
            const twinNarrative = await generateTwinNarrative(
                { consistency: stats.consistency, burnout: "Medium" },
                { consistency: Math.min(stats.consistency + 20, 95), burnout: "Low" },
                30
            );
            setNarrative(twinNarrative);

        } catch (error) {
            console.error('Error init twin:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateNarrative = async () => {
        // Optimistic update of narrative if needed, or simple loading state
        const twinNarrative = await generateTwinNarrative(
            { consistency: baseStats.consistency, burnout: "Medium" },
            { consistency: Math.min(baseStats.consistency + (selectedDays * 0.5), 95), burnout: "Low" },
            selectedDays
        );
        setNarrative(twinNarrative);
    };

    // --- Simulation Logic ---
    const getProjectedStats = (days: number) => {
        const multiplier = days / 30; // 1, 2, 3

        const current = {
            consistency: Math.max(baseStats.consistency - (5 * multiplier), 20),
            focus: Math.max(Math.round((baseStats.focusHours - (0.2 * multiplier)) * 10) / 10, 0.5),
            energy: Math.max(baseStats.energy - (5 * multiplier), 30),
            missed: Math.min(baseStats.missedTasks + (2 * multiplier), 15),
            burnout: "Medium"
        };

        const optimized = {
            consistency: Math.min(baseStats.consistency + (15 * multiplier), 95),
            focus: Math.min(Math.round((baseStats.focusHours + (0.8 * multiplier)) * 10) / 10, 8.0),
            energy: Math.min(baseStats.energy + (10 * multiplier), 90),
            missed: Math.max(baseStats.missedTasks - (2 * multiplier), 0),
            burnout: "Low"
        };

        return { current, optimized };
    };

    const { current, optimized } = getProjectedStats(selectedDays);

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: colors.primary }}>Loading Simulation...</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <FontAwesome name="arrow-left" size={20} color={colors.text} />
                </TouchableOpacity>
                <View style={{ alignItems: 'center' }}>
                    <Text style={[styles.title, { color: colors.text }]}>Your Digital Twin</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Two paths, one choice</Text>
                </View>
                <View style={{ width: 20 }} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

                {/* Time Toggle */}
                <View style={[styles.toggleContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    {TIME_HORIZONS.map((day) => (
                        <TouchableOpacity
                            key={day}
                            style={[
                                styles.toggleBtn,
                                selectedDays === day && { backgroundColor: colors.primary }
                            ]}
                            onPress={() => setSelectedDays(day)}
                        >
                            <Text style={[
                                styles.toggleText,
                                selectedDays === day ? { color: '#FFF' } : { color: colors.textSecondary }
                            ]}>
                                {day} Days
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Split View */}
                <View style={styles.splitContainer}>
                    {/* Current Path */}
                    <View style={[styles.twinCard, { backgroundColor: theme === 'dark' ? '#1f2937' : '#E5E7EB', borderColor: 'transparent' }]}>
                        <View style={styles.avatarContainer}>
                            <FontAwesome name="user-o" size={40} color="#6B7280" />
                            <Text style={[styles.twinLabel, { color: '#6B7280' }]}>Current Path</Text>
                        </View>

                        <View style={styles.statGroup}>
                            <Text style={styles.statLabel}>Consistency</Text>
                            <Text style={[styles.statValue, { color: '#6B7280' }]}>{Math.round(current.consistency)}%</Text>
                        </View>
                        <View style={styles.statGroup}>
                            <Text style={styles.statLabel}>Focus / Day</Text>
                            <Text style={[styles.statValue, { color: '#6B7280' }]}>{current.focus}h</Text>
                        </View>
                        <View style={styles.statGroup}>
                            <Text style={styles.statLabel}>Energy</Text>
                            <Text style={[styles.statValue, { color: '#6B7280' }]}>{Math.round(current.energy)}/100</Text>
                        </View>
                        <View style={styles.statGroup}>
                            <Text style={styles.statLabel}>Missed Tasks</Text>
                            <Text style={[styles.statValue, { color: '#EF4444' }]}>{Math.round(current.missed)}</Text>
                        </View>
                    </View>

                    {/* Optimized Path */}
                    <View style={[styles.twinCard, { backgroundColor: theme === 'dark' ? '#064E3B' : '#ECFDF5', borderColor: '#10B981', borderWidth: 1 }]}>
                        <View style={styles.avatarContainer}>
                            <View style={styles.iconCircle}>
                                <View style={styles.glow} />
                                <FontAwesome name="rocket" size={40} color="#10B981" />
                            </View>
                            <Text style={[styles.twinLabel, { color: '#10B981', fontWeight: '700' }]}>Optimized</Text>
                        </View>

                        <View style={styles.statGroup}>
                            <Text style={styles.statLabel}>Consistency</Text>
                            <Text style={[styles.statValue, { color: '#10B981' }]}>{Math.round(optimized.consistency)}%</Text>
                        </View>
                        <View style={styles.statGroup}>
                            <Text style={styles.statLabel}>Focus / Day</Text>
                            <Text style={[styles.statValue, { color: '#10B981' }]}>{optimized.focus}h</Text>
                        </View>
                        <View style={styles.statGroup}>
                            <Text style={styles.statLabel}>Energy</Text>
                            <Text style={[styles.statValue, { color: '#10B981' }]}>{Math.round(optimized.energy)}/100</Text>
                        </View>
                        <View style={styles.statGroup}>
                            <Text style={styles.statLabel}>Missed Tasks</Text>
                            <Text style={[styles.statValue, { color: '#10B981' }]}>{Math.round(optimized.missed)}</Text>
                        </View>
                    </View>
                </View>

                {/* AI Explanation */}
                <View style={[styles.aiBox, { backgroundColor: colors.card }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 }}>
                        <FontAwesome name="magic" size={16} color={colors.primary} />
                        <Text style={[styles.aiTitle, { color: colors.text }]}>Why the difference?</Text>
                    </View>
                    <Text style={[styles.aiText, { color: colors.textSecondary }]}>
                        {narrative || "Calculating potential..."}
                    </Text>
                </View>

                {/* CTA */}
                <TouchableOpacity
                    style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                    onPress={() => router.push('/(tabs)/plan')}
                >
                    <Text style={styles.btnText}>Apply Optimized Plan</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.secondaryBtn}
                    onPress={() => router.back()}
                >
                    <Text style={[styles.secondaryBtnText, { color: colors.textSecondary }]}>See what changes AI suggests</Text>
                </TouchableOpacity>

                <View style={{ height: 50 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 50,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    subtitle: {
        fontSize: 14,
        marginTop: 2,
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
    },
    toggleContainer: {
        flexDirection: 'row',
        borderRadius: 12,
        padding: 4,
        marginBottom: 24,
        borderWidth: 1,
    },
    toggleBtn: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8,
    },
    toggleText: {
        fontSize: 13,
        fontWeight: '600',
    },
    splitContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    twinCard: {
        flex: 1,
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        paddingBottom: 24,
    },
    avatarContainer: {
        alignItems: 'center',
        marginBottom: 20,
        justifyContent: 'center',
    },
    iconCircle: {
        width: 60,
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    glow: {
        position: 'absolute',
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#10B981',
        opacity: 0.2,
    },
    twinLabel: {
        marginTop: 8,
        fontSize: 14,
        fontWeight: '500',
    },
    statGroup: {
        alignItems: 'center',
        marginBottom: 12,
    },
    statLabel: {
        fontSize: 11,
        color: '#9CA3AF',
        marginBottom: 2,
        textTransform: 'uppercase',
    },
    statValue: {
        fontSize: 18,
        fontWeight: '700',
    },
    aiBox: {
        padding: 20,
        borderRadius: 16,
        marginBottom: 24,
    },
    aiTitle: {
        fontSize: 14,
        fontWeight: '600',
    },
    aiText: {
        fontSize: 14,
        lineHeight: 22,
    },
    primaryBtn: {
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        marginBottom: 12,
        shadowColor: "#4A6CF7",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    btnText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '700',
    },
    secondaryBtn: {
        paddingVertical: 12,
        alignItems: 'center',
    },
    secondaryBtnText: {
        fontSize: 14,
        fontWeight: '500',
    }
});
