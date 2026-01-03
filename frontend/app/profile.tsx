import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, RefreshControl, Switch } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';

// Helper to determine achievement unlocking
const checkAchievements = (stats: any) => {
    return [
        {
            id: '1',
            label: 'First Week',
            icon: 'trophy' as const,
            color: '#F59E0B',
            bgColor: '#FEF3C7',
            unlocked: stats.daysActive >= 7
        },
        {
            id: '2',
            label: '7 Day Streak',
            icon: 'fire' as const,
            color: '#EF4444',
            bgColor: '#FEE2E2',
            unlocked: stats.streak >= 7
        },
        {
            id: '3',
            label: 'Task Master',
            icon: 'check-square-o' as const,
            color: '#10B981',
            bgColor: '#ECFDF5',
            unlocked: stats.tasksDone >= 50
        },
        {
            id: '4',
            label: '30 Days',
            icon: 'calendar-check-o' as const,
            color: '#9CA3AF',
            bgColor: '#F3F4F6', // Will need adjustment for dark mode if we want it to look good
            unlocked: stats.daysActive >= 30
        },
    ];
};

const menuItems = [
    { id: '1', label: 'Edit Profile', icon: 'user' as const, route: '/edit-profile' },
    { id: '2', label: 'Settings', icon: 'cog' as const, route: '/(tabs)/settings' },
    { id: '3', label: 'Help & Support', icon: 'question-circle' as const, route: '/help-support' },
];

export default function ProfileScreen() {
    const router = useRouter();
    const { theme, toggleTheme, colors } = useTheme();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // User Profile API Data
    const [profile, setProfile] = useState({
        full_name: 'User',
        email: '',
        avatar_url: null,
    });

    // Calculated Stats
    const [userStats, setUserStats] = useState({
        streak: 0,
        aiScore: 0,
        tasksDone: 0,
        daysActive: 0
    });

    // Dynamic Achievements
    const [achievements, setAchievements] = useState<any[]>([]);

    const fetchProfileData = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Fetch Profile Info
            const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            setProfile({
                full_name: profileData?.full_name || user.email?.split('@')[0] || 'User',
                email: user.email || '',
                avatar_url: profileData?.avatar_url || null,
            });

            // 2. Calculate Stats

            // Tasks Done
            // Tasks Done - Fetch statuses to debug/verify
            const { data: tasksData, error: tasksError } = await supabase
                .from('tasks')
                .select('status')
                .eq('user_id', user.id);

            if (tasksError) console.error('Error fetching tasks for stats:', tasksError);

            const tasksCount = tasksData?.filter(t => t.status === 'completed').length || 0;
            console.log('DEBUG: Tasks Data Distribution', {
                total: tasksData?.length,
                completed: tasksCount,
                statuses: tasksData?.map(t => t.status)
            });

            console.log('DEBUG: Profile Fetch', { userId: user.id, tasksCount });

            // Streak & Days Active (from daily_metrics)
            const { data: metrics } = await supabase
                .from('daily_metrics')
                .select('date, energy_level')
                .eq('user_id', user.id)
                .order('date', { ascending: false });

            // Simple Streak Logic: Consecutive days with an entry (starting from today or yesterday)
            let streak = 0;
            let daysActive = metrics?.length || 0;

            if (metrics && metrics.length > 0) {
                const today = new Date().toISOString().split('T')[0];
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayStr = yesterday.toISOString().split('T')[0];

                const latestDate = metrics[0].date;

                // If the most recent entry is today or yesterday, the streak is alive
                if (latestDate === today || latestDate === yesterdayStr) {
                    streak = 1;
                    for (let i = 1; i < metrics.length; i++) {
                        const prevDate = new Date(metrics[i - 1].date);
                        const currDate = new Date(metrics[i].date);
                        const diffTime = Math.abs(prevDate.getTime() - currDate.getTime());
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                        if (diffDays === 1) {
                            streak++;
                        } else {
                            break;
                        }
                    }
                }
            }

            // Mock AI Score calculation based on real stats (similar to Insights)
            // Ideally we'd store historical scores, but calculating live is fine for MVP
            const calculatedAiScore = Math.min(100, (streak * 5) + (Number(tasksCount) * 2) + 50);

            const newStats = {
                streak: streak,
                aiScore: calculatedAiScore,
                tasksDone: Number(tasksCount) || 0,
                daysActive: daysActive
            };

            setUserStats(newStats);
            const computedAchievements = checkAchievements(newStats);
            // Sort: Unlocked first
            computedAchievements.sort((a, b) => (a.unlocked === b.unlocked) ? 0 : a.unlocked ? -1 : 1);
            setAchievements(computedAchievements);

        } catch (error) {
            console.log('Error fetching profile:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchProfileData();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchProfileData();
    };

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: colors.background }]}
            showsVerticalScrollIndicator={false}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
            }
        >
            {/* Profile Header */}
            <View style={styles.profileHeader}>
                <View style={[styles.avatarContainer, { shadowColor: theme === 'dark' ? '#000' : '#000' }]}>
                    <View style={[styles.avatar, { borderColor: colors.card, backgroundColor: colors.primary }]}>
                        {profile.avatar_url ? (
                            <Image source={{ uri: profile.avatar_url }} style={{ width: 96, height: 96, borderRadius: 48 }} />
                        ) : (
                            <FontAwesome name="user" size={40} color="#FFFFFF" />
                        )}
                    </View>
                </View>
                <Text style={[styles.userName, { color: colors.text }]}>{profile.full_name}</Text>
                <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{profile.email}</Text>
            </View>

            {/* Stats Row */}
            <View style={styles.statsRow}>
                <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: theme === 'dark' ? '#333' : '#E5E7EB' }]}>
                    <Text style={[styles.statValue, { color: '#F59E0B' }]}>{userStats.streak}</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Day Streak</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: theme === 'dark' ? '#333' : '#E5E7EB' }]}>
                    <Text style={[styles.statValue, { color: colors.primary }]}>{userStats.aiScore}</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>AI Score</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: theme === 'dark' ? '#333' : '#E5E7EB' }]}>
                    <Text style={[styles.statValue, { color: '#10B981' }]}>{userStats.tasksDone}</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Tasks Done</Text>
                </View>
            </View>

            {/* Achievements */}
            <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Achievements</Text>
                <TouchableOpacity onPress={() => router.push('/achievements')}>
                    <Text style={[styles.viewAllText, { color: colors.primary }]}>View All</Text>
                </TouchableOpacity>
            </View>
            <View style={styles.achievementsRow}>
                {achievements.slice(0, 4).map((achievement) => (
                    <View key={achievement.id} style={styles.achievementCard}>
                        <View style={[styles.achievementIcon, {
                            backgroundColor: achievement.unlocked ? achievement.bgColor : (theme === 'dark' ? '#374151' : '#F3F4F6')
                        }]}>
                            <FontAwesome
                                name={achievement.icon}
                                size={24}
                                color={achievement.unlocked ? achievement.color : '#9CA3AF'}
                            />
                        </View>
                        <Text style={[
                            styles.achievementLabel,
                            !achievement.unlocked && styles.achievementLocked,
                            { color: achievement.unlocked ? colors.textSecondary : '#9CA3AF' }
                        ]} numberOfLines={1}>
                            {achievement.label}
                        </Text>
                    </View>
                ))}
            </View>

            {/* Preferences (Dark Mode) */}
            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 12 }]}>Preferences</Text>
            <View style={styles.menuContainer}>
                <View style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.menuLeft}>
                        <FontAwesome name={theme === 'dark' ? 'moon-o' : 'sun-o'} size={20} color={colors.textSecondary} />
                        <Text style={[styles.menuLabel, { color: colors.text }]}>Dark Mode</Text>
                    </View>
                    <Switch
                        value={theme === 'dark'}
                        onValueChange={toggleTheme}
                        trackColor={{ false: '#767577', true: colors.primary }}
                        thumbColor={'#f4f3f4'}
                    />
                </View>
            </View>

            {/* Menu Items */}
            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 12 }]}>Account</Text>
            <View style={styles.menuContainer}>
                {menuItems.map((item) => (
                    <TouchableOpacity
                        key={item.id}
                        style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                        onPress={() => item.route && router.push(item.route as any)}
                    >
                        <View style={styles.menuLeft}>
                            <FontAwesome name={item.icon} size={20} color={colors.textSecondary} />
                            <Text style={[styles.menuLabel, { color: colors.text }]}>{item.label}</Text>
                        </View>
                        <FontAwesome name="chevron-right" size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                ))}

                {/* Logout Button */}
                <TouchableOpacity
                    style={[styles.menuItem, { marginTop: 12, borderColor: '#FECACA', backgroundColor: colors.card }]}
                    onPress={async () => {
                        await supabase.auth.signOut();
                        router.replace('/(auth)/login');
                    }}
                >
                    <View style={styles.menuLeft}>
                        <FontAwesome name="sign-out" size={20} color="#EF4444" />
                        <Text style={[styles.menuLabel, { color: '#EF4444' }]}>Log Out</Text>
                    </View>
                </TouchableOpacity>
            </View>

            <View style={{ height: 100 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        // backgroundColor set dynamically
        paddingTop: 50,
    },
    profileHeader: {
        alignItems: 'center',
        marginBottom: 24,
    },
    avatarContainer: {
        marginBottom: 16,
    },
    avatar: {
        width: 96,
        height: 96,
        borderRadius: 48,
        // backgroundColor set dynamically
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        // borderColor set dynamically
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    userName: {
        fontSize: 24,
        fontWeight: '700',
        // color set dynamically
        marginBottom: 4,
    },
    userEmail: {
        fontSize: 14,
        // color set dynamically
    },
    statsRow: {
        flexDirection: 'row',
        marginHorizontal: 20,
        gap: 12,
        marginBottom: 24,
    },
    statCard: {
        flex: 1,
        // backgroundColor set dynamically
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        // borderColor set dynamically
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    statValue: {
        fontSize: 28,
        fontWeight: '700',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 11,
        // color set dynamically
        textAlign: 'center',
        fontWeight: '500',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        // color set dynamically
        marginHorizontal: 20,
        marginBottom: 16,
    },
    achievementsRow: {
        flexDirection: 'row',
        marginHorizontal: 20,
        gap: 12,
        marginBottom: 24,
    },
    achievementCard: {
        flex: 1,
        alignItems: 'center',
    },
    achievementIcon: {
        width: 56,
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    achievementLabel: {
        fontSize: 11,
        // color set dynamically
        textAlign: 'center',
        fontWeight: '500',
    },
    achievementLocked: {
        color: '#9CA3AF',
    },
    menuContainer: {
        marginHorizontal: 20,
    },
    menuItem: {
        // backgroundColor set dynamically
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
        borderWidth: 1,
        // borderColor set dynamically
    },
    menuLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginHorizontal: 20,
        marginBottom: 16,
    },
    viewAllText: {
        fontSize: 14,
        fontWeight: '600',
    },
    menuLabel: {
        fontSize: 15,
        // color set dynamically
        fontWeight: '500',
    },
});
