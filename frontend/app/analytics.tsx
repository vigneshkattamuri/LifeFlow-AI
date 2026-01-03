import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';
import { BarChart, LineChart, ProgressChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function AnalyticsScreen() {
    const router = useRouter();
    const { theme, colors } = useTheme();
    const [loading, setLoading] = useState(true);

    // Data State
    const [habitData, setHabitData] = useState({
        labels: [] as string[],
        datasets: [{ data: [] as number[] }]
    });

    const [energyData, setEnergyData] = useState({
        labels: [] as string[],
        datasets: [{ data: [] as number[] }]
    });

    const [taskStats, setTaskStats] = useState({
        completed: 0,
        pending: 0,
        rate: 0
    });

    useFocusEffect(
        useCallback(() => {
            fetchAnalytics();
        }, [])
    );

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const today = new Date();
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(today.getDate() - 6); // Includes today

            // Prepare Date Labels
            const dateLabels: string[] = [];
            const dayLabels: string[] = [];
            const tempDate = new Date(sevenDaysAgo);

            while (tempDate <= today) {
                dateLabels.push(tempDate.toISOString().split('T')[0]);
                dayLabels.push(DAYS[tempDate.getDay()]); // Mon, Tue...
                tempDate.setDate(tempDate.getDate() + 1);
            }

            // 1. Fetch Habit Logs (Last 7 Days)
            const { data: habitLogs } = await supabase
                .from('habit_logs')
                .select('completed_at')
                .eq('user_id', user.id)
                .gte('completed_at', sevenDaysAgo.toISOString())
                .eq('status', 'completed');

            // Aggregate Habits per day
            const habitCounts = dateLabels.map(date => {
                return habitLogs?.filter(log => log.completed_at.startsWith(date)).length || 0;
            });

            setHabitData({
                labels: dayLabels,
                datasets: [{ data: habitCounts }]
            });

            // 2. Fetch Energy Levels (Last 7 Days)
            const { data: metrics } = await supabase
                .from('daily_metrics')
                .select('date, energy_level')
                .eq('user_id', user.id)
                .gte('date', sevenDaysAgo.toISOString().split('T')[0])
                .order('date', { ascending: true });

            // Map Energy to dates (fill missing with 50)
            const energyValues = dateLabels.map(date => {
                const metric = metrics?.find(m => m.date === date);
                return metric?.energy_level || 50; // Default to neutral if missing
            });

            setEnergyData({
                labels: dayLabels,
                datasets: [{ data: energyValues }]
            });

            // 3. Task Completion Rate (Last 7 Days)
            const { data: tasks } = await supabase
                .from('tasks')
                .select('status')
                .eq('user_id', user.id);

            // Simple tasks stats (using all-time for rate context, or improve to recent if desired)
            const completed = tasks?.filter(t => t.status === 'completed').length || 0;
            const pending = tasks?.filter(t => t.status !== 'completed').length || 0;
            const total = completed + pending;
            const rate = total > 0 ? completed / total : 0;

            setTaskStats({ completed, pending, rate });

        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    const chartConfig = {
        backgroundGradientFrom: colors.card,
        backgroundGradientTo: colors.card,
        color: (opacity = 1) => theme === 'dark' ? `rgba(74, 108, 247, ${opacity})` : `rgba(74, 108, 247, ${opacity})`,
        labelColor: (opacity = 1) => theme === 'dark' ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
        strokeWidth: 2, // optional, default 3
        barPercentage: 0.6,
        useShadowColorFromDataset: false,
        fillShadowGradient: '#4A6CF7',
        fillShadowGradientOpacity: 1,
    };

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: colors.primary, marginTop: 10 }}>Loading Analytics...</Text>
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
                <Text style={[styles.title, { color: colors.text }]}>Analytics</Text>
                <View style={{ width: 20 }} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

                {/* Habit Consistency Chart */}
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Habit Consistency</Text>
                <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>Last 7 Days</Text>
                <BarChart
                    data={habitData}
                    width={screenWidth - 40}
                    height={220}
                    yAxisLabel=""
                    yAxisSuffix=""
                    chartConfig={chartConfig}
                    style={styles.chart}
                    showValuesOnTopOfBars
                    fromZero
                />

                {/* Energy Trend Chart */}
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Energy Trend</Text>
                <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>Daily Levels</Text>
                <LineChart
                    data={energyData}
                    width={screenWidth - 40}
                    height={220}
                    chartConfig={{
                        ...chartConfig,
                        color: (opacity = 1) => `rgba(245, 158, 11, ${opacity})`, // Orange for energy
                    }}
                    style={styles.chart}
                    bezier
                    fromZero
                />

                {/* Task Completion Ring */}
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Task Completion</Text>
                <View style={[styles.ringContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <ProgressChart
                        data={{
                            labels: ["Rate"],
                            data: [taskStats.rate]
                        }}
                        width={screenWidth - 80}
                        height={200}
                        strokeWidth={16}
                        radius={80}
                        chartConfig={{
                            ...chartConfig,
                            color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`, // Green
                        }}
                        hideLegend={true}
                    />
                    <View style={styles.ringCenter}>
                        <Text style={[styles.ringValue, { color: colors.text }]}>{Math.round(taskStats.rate * 100)}%</Text>
                        <Text style={[styles.ringLabel, { color: colors.textSecondary }]}>Completed</Text>
                    </View>
                </View>

                {/* Task Details Stats */}
                <View style={styles.statsGrid}>
                    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={[styles.statValue, { color: '#10B981' }]}>{taskStats.completed}</Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Done</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={[styles.statValue, { color: '#EF4444' }]}>{taskStats.pending}</Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pending</Text>
                    </View>
                </View>

                <View style={{ height: 50 }} />
            </ScrollView>
        </View>
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
        marginBottom: 24,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
        marginTop: 20,
        marginBottom: 4,
    },
    sectionSubtitle: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 12,
    },
    chart: {
        marginVertical: 8,
        borderRadius: 16,
    },
    ringContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginBottom: 20,
    },
    ringCenter: {
        position: 'absolute',
        alignItems: 'center',
    },
    ringValue: {
        fontSize: 32,
        fontWeight: '700',
        color: '#1F2937',
    },
    ringLabel: {
        fontSize: 14,
        color: '#6B7280',
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 40,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    statValue: {
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: '#6B7280',
    }
});
