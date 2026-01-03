import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import React, { useState, useCallback } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import { ACHIEVEMENTS, Achievement } from '../constants/Achievements';

export default function AchievementsScreen() {
    const router = useRouter();
    const { colors, theme } = useTheme();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        streak: 0,
        tasksDone: 0,
        daysActive: 0,
        habitsCreated: 0,
        perfectDays: 0,
        earlyBirdCount: 0,
    });

    const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());

    const fetchStatsAndCheck = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Fetch Basic Stats (similar to Profile)
            const { data: tasksData } = await supabase
                .from('tasks')
                .select('status, updated_at')
                .eq('user_id', user.id);

            const tasksDone = tasksData?.filter(t => t.status === 'completed').length || 0;

            const { data: habitsData, count: habitsCount } = await supabase
                .from('habits')
                .select('*', { count: 'exact' })
                .eq('user_id', user.id);

            // Fetch logs for today for Perfect Day / Early Bird check
            const today = new Date().toISOString().split('T')[0];
            const startOfDay = `${today}T00:00:00.000Z`;
            const endOfDay = `${today}T23:59:59.999Z`;

            const { data: logsData } = await supabase
                .from('habit_logs')
                .select('habit_id, completed_at')
                .eq('user_id', user.id)
                .gte('completed_at', startOfDay)
                .lte('completed_at', endOfDay);

            const { data: metrics } = await supabase
                .from('daily_metrics')
                .select('date')
                .eq('user_id', user.id)
                .order('date', { ascending: false });

            // Streak Logic (Reused)
            let streak = 0;
            let daysActive = metrics?.length || 0;
            if (metrics && metrics.length > 0) {
                const today = new Date().toISOString().split('T')[0];
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayStr = yesterday.toISOString().split('T')[0];
                const latestDate = metrics[0].date;
                if (latestDate === today || latestDate === yesterdayStr) {
                    streak = 1;
                    for (let i = 1; i < metrics.length; i++) {
                        const prevDate = new Date(metrics[i - 1].date);
                        const currDate = new Date(metrics[i].date);
                        const diffDays = Math.ceil(Math.abs(prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24));
                        if (diffDays === 1) streak++; else break;
                    }
                }
            }

            // Early Bird Logic: Check if any task or habit was completed before 8 AM
            // For tasks, we use updated_at as a proxy for completion time
            const earlyBirdTask = tasksData?.some(t => {
                if (t.status === 'completed' && t.updated_at) {
                    const date = new Date(t.updated_at);
                    return date.getHours() < 8 && date.getHours() >= 4; // Between 4 AM and 8 AM
                }
                return false;
            });

            // For habits, check logs
            const earlyBirdHabit = logsData?.some(log => {
                const date = new Date(log.completed_at);
                return date.getHours() < 8 && date.getHours() >= 4;
            });

            const earlyBirdCount = (earlyBirdTask || earlyBirdHabit) ? 1 : 0;

            // Perfect Day Logic: All tasks completed AND all habits completed (if any exist)
            // We only check "today" for the badge to trigger
            let perfectDay = false;

            const tasks = tasksData || [];
            const habits = habitsData || [];

            if ((tasks.length > 0 || habits.length > 0)) {
                const tasksPending = tasks.some(t => t.status !== 'completed');

                // Habits pending? We need to check if *all* habits have a log for today
                // logsData is already filtered for today
                const completedHabitIds = new Set(logsData?.map(l => l.habit_id));
                const habitsPending = habits.some(h => !completedHabitIds.has(h.id));

                if (!tasksPending && !habitsPending) {
                    perfectDay = true;
                }
            }
            const perfectDays = perfectDay ? 1 : 0;

            const calculatedStats = {
                streak,
                tasksDone: tasksDone,
                daysActive,
                habitsCreated: Number(habitsCount) || 0,
                perfectDays,
                earlyBirdCount
            };
            setStats(calculatedStats);

            // Check Unlocked Status
            const newUnlockedIds = new Set<string>();
            ACHIEVEMENTS.forEach(ach => {
                let unlocked = false;
                switch (ach.criteria.type) {
                    case 'streak': unlocked = calculatedStats.streak >= ach.criteria.threshold; break;
                    case 'tasks_total': unlocked = calculatedStats.tasksDone >= ach.criteria.threshold; break;
                    case 'days_active': unlocked = calculatedStats.daysActive >= ach.criteria.threshold; break;
                    case 'habits_total': unlocked = calculatedStats.habitsCreated >= ach.criteria.threshold; break;
                    case 'early_bird': unlocked = calculatedStats.earlyBirdCount >= ach.criteria.threshold; break;
                    case 'perfect_day': unlocked = calculatedStats.perfectDays >= ach.criteria.threshold; break;
                }
                if (unlocked) newUnlockedIds.add(ach.id);
            });
            setUnlockedIds(newUnlockedIds);

        } catch (error) {
            console.error('Error calculating achievements:', error);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchStatsAndCheck();
        }, [])
    );

    const renderAchievement = (item: Achievement) => {
        const isUnlocked = unlockedIds.has(item.id);
        const iconColor = isUnlocked ? item.color : (theme === 'dark' ? '#6B7280' : '#9CA3AF');
        const bgColor = isUnlocked ?
            (theme === 'dark' ? item.color + '20' : item.bgColor) :
            (theme === 'dark' ? '#1F2937' : '#F3F4F6');
        const titleColor = isUnlocked ? colors.text : colors.textSecondary;

        return (
            <View key={item.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.iconContainer, { backgroundColor: bgColor }]}>
                    <FontAwesome name={item.icon} size={24} color={iconColor} />
                    {!isUnlocked && (
                        <View style={styles.lockOverlay}>
                            <FontAwesome name="lock" size={12} color={colors.textSecondary} />
                        </View>
                    )}
                </View>
                <View style={styles.cardContent}>
                    <Text style={[styles.cardTitle, { color: titleColor }]}>{item.title}</Text>
                    <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>{item.description}</Text>

                    {/* Progress Bar (Optional, simpler to just show unlocked state for now) */}
                    {/* {!isUnlocked && (
                        <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                             {item.criteria.threshold} required
                        </Text>
                    )} */}
                </View>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <FontAwesome name="arrow-left" size={20} color={colors.text} />
                </TouchableOpacity>
                <View>
                    <Text style={[styles.title, { color: colors.text }]}>Achievements</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        {unlockedIds.size} / {ACHIEVEMENTS.length} Unlocked
                    </Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
                    <View style={styles.grid}>
                        {ACHIEVEMENTS.map(renderAchievement)}
                    </View>
                    <View style={{ height: 40 }} />
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 16,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
        justifyContent: 'center',
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
    },
    subtitle: {
        fontSize: 13,
    },
    scroll: {
        flex: 1,
        padding: 20,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        justifyContent: 'space-between',
    },
    card: {
        width: '48%', // ~2 columns
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        marginBottom: 4,
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
        position: 'relative',
    },
    lockOverlay: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#E5E7EB', // Need dynamic check if simpler
        width: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FFFFFF',
    },
    cardContent: {
        alignItems: 'center',
    },
    cardTitle: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 4,
        textAlign: 'center',
    },
    cardDesc: {
        fontSize: 12,
        textAlign: 'center',
        lineHeight: 16,
    },
    progressText: {
        fontSize: 11,
        marginTop: 4,
    }
});
