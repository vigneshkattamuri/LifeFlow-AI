import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../context/ThemeContext';

type FilterTab = 'all' | 'completed' | 'pending';

interface Habit {
    id: string;
    title: string;
    frequency: string;
    time: string;
    streakDays: number;
    streakLabel: string;
    progressPercent: number;
    progressLabel: string;
    completed: boolean;
    progressBarPercent: number;
    progressBarColor: string;
}



export default function HabitsScreen() {
    const router = useRouter();
    const { theme, colors } = useTheme();
    const [activeTab, setActiveTab] = useState<FilterTab>('all');
    const [habits, setHabits] = useState<Habit[]>([]);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            fetchHabits();
        }, [])
    );

    const fetchHabits = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Fetch user's habits
            const { data: habitsData, error: habitsError } = await supabase
                .from('habits')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (habitsError) throw habitsError;

            // 2. Fetch today's logs
            const today = new Date().toISOString().split('T')[0];
            const startOfDay = `${today}T00:00:00.000Z`;
            const endOfDay = `${today}T23:59:59.999Z`;

            const { data: logsData, error: logsError } = await supabase
                .from('habit_logs')
                .select('habit_id')
                .eq('user_id', user.id)
                .gte('completed_at', startOfDay)
                .lte('completed_at', endOfDay);

            if (logsError) throw logsError;

            const completedHabitIds = new Set(logsData?.map(log => log.habit_id));

            // 3. Merge data
            const mappedHabits: Habit[] = habitsData.map((h: any) => ({
                id: h.id,
                title: h.title,
                frequency: Array.isArray(h.frequency) ? h.frequency[0] : 'Daily',
                time: h.time_of_day || 'Any time',
                streakDays: h.streak_current || 0,
                streakLabel: 'streak',
                progressPercent: h.streak_current ? Math.min(100, (h.streak_current / 21) * 100) : 0, // Placeholder logic
                progressLabel: `${h.streak_current || 0} days`,
                completed: completedHabitIds.has(h.id),
                progressBarPercent: h.streak_current ? Math.min(100, (h.streak_current / 21) * 100) : 0,
                progressBarColor: h.difficulty === 'hard' ? '#EF4444' : h.difficulty === 'medium' ? '#F59E0B' : '#10B981',
            }));

            setHabits(mappedHabits);
        } catch (error) {
            console.error('Error fetching habits:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleHabit = async (habitId: string, currentStatus: boolean) => {
        try {
            // Optimistic update
            setHabits(prev => prev.map(h =>
                h.id === habitId ? { ...h, completed: !currentStatus } : h
            ));

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            if (!currentStatus) {
                // Mark as completed
                const { error } = await supabase
                    .from('habit_logs')
                    .insert({
                        habit_id: habitId,
                        user_id: user.id,
                        status: 'completed',
                        completed_at: new Date().toISOString()
                    });
                if (error) throw error;
            } else {
                // Uncheck (remove today's log)
                // We need to match by habit_id and today's date range
                const today = new Date().toISOString().split('T')[0];
                const startOfDay = `${today}T00:00:00.000Z`;
                const endOfDay = `${today}T23:59:59.999Z`;

                const { error } = await supabase
                    .from('habit_logs')
                    .delete()
                    .eq('habit_id', habitId)
                    .gte('completed_at', startOfDay)
                    .lte('completed_at', endOfDay);

                if (error) throw error;
            }

            // Re-fetch to sync streak stats if backend triggers update them (not implemented yet, but good practice)
            // fetchHabits(); 
        } catch (error) {
            console.error('Error toggling habit:', error);
            // Revert on error
            setHabits(prev => prev.map(h =>
                h.id === habitId ? { ...h, completed: currentStatus } : h
            ));
        }
    };

    const filteredHabits = habits.filter(habit => {
        if (activeTab === 'completed') return habit.completed;
        if (activeTab === 'pending') return !habit.completed;
        return true;
    });

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={[styles.title, { color: colors.text }]}>Habits</Text>
                <TouchableOpacity style={styles.addButton} onPress={() => router.push('/add-habit')}>
                    <FontAwesome name="plus" size={16} color="#FFFFFF" />
                </TouchableOpacity>
            </View>

            {/* Filter Tabs */}
            <View style={styles.tabContainer}>
                {(['all', 'completed', 'pending'] as FilterTab[]).map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        style={[
                            styles.tab,
                            activeTab === tab && { borderBottomColor: colors.primary, borderBottomWidth: 2 }
                        ]}
                        onPress={() => setActiveTab(tab)}
                    >
                        <Text style={[
                            styles.tabText,
                            { color: activeTab === tab ? colors.primary : colors.textSecondary }
                        ]}>
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Habits List */}
            <ScrollView
                style={styles.list}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={loading} onRefresh={fetchHabits} tintColor={colors.primary} />
                }
            >
                {filteredHabits.length === 0 && !loading ? (
                    <View style={styles.emptyState}>
                        <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>No habits found. Start by adding one!</Text>
                    </View>
                ) : (
                    filteredHabits.map((habit) => (
                        <View key={habit.id} style={[styles.habitCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <View style={styles.habitRow}>
                                {/* Checkbox */}
                                <TouchableOpacity
                                    style={styles.checkboxColumn}
                                    onPress={() => toggleHabit(habit.id, habit.completed)}
                                >
                                    {habit.completed ? (
                                        <View style={styles.checkboxChecked}>
                                            <FontAwesome name="check" size={14} color="#FFFFFF" />
                                        </View>
                                    ) : (
                                        <View style={[styles.checkbox, { borderColor: colors.border }]} />
                                    )}
                                </TouchableOpacity>

                                {/* Content */}
                                <View style={styles.habitContent}>
                                    <Text style={[styles.habitTitle, { color: colors.text }]}>{habit.title}</Text>
                                    <Text style={[styles.habitMeta, { color: colors.textSecondary }]}>{habit.frequency} • {habit.time}</Text>
                                    <View style={styles.streakRow}>
                                        <View style={[styles.streakBadge, { backgroundColor: theme === 'dark' ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7' }]}>
                                            <FontAwesome name="fire" size={12} color="#F59E0B" />
                                            <Text style={styles.streakNumber}>{habit.streakDays}</Text>
                                            <Text style={styles.streakLabel}>{habit.streakLabel}</Text>
                                        </View>
                                        <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>{habit.progressLabel}</Text>
                                    </View>
                                </View>

                                {/* Circular Progress */}
                                <View style={styles.circularProgress}>
                                    <View style={[styles.progressRing, { borderColor: habit.progressBarColor, backgroundColor: theme === 'dark' ? '#374151' : '#F3F4F6' }]}>
                                        <Text style={[styles.progressPercent, { color: habit.progressBarColor }]}>
                                            {Math.round(habit.progressPercent)}%
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* Edit Button */}
                            <TouchableOpacity
                                style={styles.editButton}
                                onPress={() => router.push({ pathname: '/add-habit', params: { id: habit.id } })}
                            >
                                <FontAwesome name="pencil" size={16} color={colors.textSecondary} />
                            </TouchableOpacity>
                            {/* Progress Bar */}
                            <View style={[styles.progressBarContainer, { backgroundColor: theme === 'dark' ? '#374151' : '#E5E7EB' }]}>
                                <View
                                    style={[
                                        styles.progressBar,
                                        { width: `${habit.progressBarPercent}%`, backgroundColor: habit.progressBarColor }
                                    ]}
                                />
                            </View>
                        </View>
                    ))
                )}
                <View style={{ height: 100 }} />
            </ScrollView >
        </View >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FE',
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
        fontSize: 28,
        fontWeight: '700',
        color: '#1F2937',
    },
    addButton: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#4A6CF7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    tabContainer: {
        flexDirection: 'row',
        marginHorizontal: 20,
        marginBottom: 20,
        gap: 24,
    },
    tab: {
        paddingBottom: 8,
    },
    tabActive: {
        borderBottomWidth: 2,
        borderBottomColor: '#4A6CF7',
    },
    tabText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6B7280',
    },
    tabTextActive: {
        color: '#4A6CF7',
    },
    list: {
        flex: 1,
        paddingHorizontal: 20,
    },
    habitCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    habitRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    checkboxColumn: {
        marginRight: 12,
        paddingTop: 4,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#D1D5DB',
    },
    checkboxChecked: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#10B981',
        justifyContent: 'center',
        alignItems: 'center',
    },
    habitContent: {
        flex: 1,
    },
    habitTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 2,
    },
    habitMeta: {
        fontSize: 13,
        color: '#6B7280',
        marginBottom: 8,
    },
    streakRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    streakBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
    },
    streakNumber: {
        fontSize: 14,
        fontWeight: '700',
        color: '#F59E0B',
    },
    streakLabel: {
        fontSize: 12,
        color: '#F59E0B',
    },
    progressLabel: {
        fontSize: 12,
        color: '#6B7280',
    },
    circularProgress: {
        marginLeft: 12,
    },
    progressRing: {
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 3,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    progressPercent: {
        fontSize: 12,
        fontWeight: '700',
    },
    progressBarContainer: {
        height: 4,
        backgroundColor: '#E5E7EB',
        borderRadius: 2,
        marginTop: 12,
    },
    progressBar: {
        height: '100%',
        borderRadius: 2,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    emptyStateText: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
    },

    editButton: {
        marginLeft: 12,
        padding: 4,
    },
});
