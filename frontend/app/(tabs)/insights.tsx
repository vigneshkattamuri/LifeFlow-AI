import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../context/ThemeContext';
import { generateInsight, buildInsightPrompt, generateKeyPatterns } from '../../lib/ai';



export default function InsightsScreen() {
    const router = useRouter();
    const { theme, colors } = useTheme();
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [aiReport, setAiReport] = useState('');
    const [aiScore, setAiScore] = useState(0);
    const [patterns, setPatterns] = useState<any[]>([]);
    const [insightStats, setInsightStats] = useState({
        habitsCount: 0,
        tasksCompleted: 0,
        avgEnergy: 0,
        mood: 'Neutral'
    });

    useFocusEffect(
        useCallback(() => {
            fetchInsights();
        }, [])
    );

    const fetchInsights = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(today.getDate() - 7);

            // 1. Fetch Habit Stats (Last 7 Days)
            const { data: habitLogs } = await supabase
                .from('habit_logs')
                .select('completed_at')
                .eq('user_id', user.id)
                .gte('completed_at', sevenDaysAgo.toISOString())
                .eq('status', 'completed');

            // 2. Fetch Tasks Stats (Last 7 Days)
            const { data: tasks } = await supabase
                .from('tasks')
                .select('*')
                .eq('user_id', user.id)
                .gte('created_at', sevenDaysAgo.toISOString());

            // 3. Fetch Mood/Energy
            const { data: metrics } = await supabase
                .from('daily_metrics')
                .select('energy_level, mood_score')
                .eq('user_id', user.id)
                .gte('date', sevenDaysAgo.toISOString().split('T')[0]);

            // --- CALCULATIONS ---

            const habitsCount = habitLogs?.length || 0;
            const tasksCompleted = tasks?.filter((t: any) => t.status === 'completed').length || 0;
            const avgEnergy = metrics && metrics.length > 0 ? metrics.reduce((acc: number, m: any) => acc + (m.energy_level || 50), 0) / metrics.length : 50;

            // AI Score Logic
            const habitScore = Math.min(habitsCount * 4, 40);
            const taskScore = Math.min(tasksCompleted * 5, 40);
            const energyScore = (avgEnergy / 100) * 20;
            const totalScore = Math.round(habitScore + taskScore + energyScore);
            setAiScore(totalScore);

            setInsightStats({
                habitsCount,
                tasksCompleted,
                avgEnergy: Math.round(avgEnergy),
                mood: 'Neutral'
            });

            // --- PATTERN RECOGNITION (AI + CACHE) ---

            // Check Cache
            const cachedDate = await AsyncStorage.getItem('pattern_date');
            const cachedPatterns = await AsyncStorage.getItem('pattern_cache');

            if (cachedDate === todayStr && cachedPatterns) {
                setPatterns(JSON.parse(cachedPatterns));
            } else {
                // Fallback Context Calculation
                let peakHour = 9;
                if (habitLogs && habitLogs.length > 0) {
                    const hourCounts: Record<number, number> = {};
                    habitLogs.forEach((log: any) => {
                        const h = new Date(log.completed_at).getHours();
                        hourCounts[h] = (hourCounts[h] || 0) + 1;
                    });
                    const sortedHours = Object.entries(hourCounts).sort((a, b) => b[1] - a[1]);
                    if (sortedHours.length > 0) peakHour = parseInt(sortedHours[0][0]);
                }
                const amPm = peakHour >= 12 ? 'PM' : 'AM';
                const displayHour = peakHour > 12 ? peakHour - 12 : (peakHour === 0 ? 12 : peakHour);
                const peakWindow = `${displayHour}-${displayHour + 2} ${amPm}`;
                const consistency = habitsCount > 5 ? 'High' : 'Improving';

                const fallbackPatterns = [
                    {
                        id: '1',
                        title: 'Peak Focus Window',
                        description: `You complete most habits around ${peakWindow}. Schedule deep work then.`,
                        icon: 'line-chart',
                        color: '#4A6CF7',
                        bgColor: '#EEF2FF',
                    },
                    {
                        id: '2',
                        title: 'Consistency Score',
                        description: `Your habit consistency is ${consistency} (${habitsCount} completions this week).`,
                        icon: 'refresh',
                        color: '#10B981',
                        bgColor: '#ECFDF5',
                    },
                    {
                        id: '3',
                        title: 'Energy Trend',
                        description: `Average energy level: ${Math.round(avgEnergy)}%. ${avgEnergy > 70 ? 'Keep it up!' : 'Prioritize rest.'}`,
                        icon: 'bolt',
                        color: '#F59E0B',
                        bgColor: '#FEF3C7',
                    }
                ];

                // Attempt AI Generation
                try {
                    const statsForAi = {
                        habitsCount,
                        tasksCompleted,
                        avgEnergy: Math.round(avgEnergy),
                        mood: 'Neutral',
                        peakWindow
                    };

                    const aiResponse = await generateKeyPatterns(statsForAi);

                    // If AI returns the text-based mock fallback (due to error/rate limit), use our local patterns
                    if (aiResponse.startsWith('(Mock)')) {
                        console.log("AI Rate Limited/Error for patterns. Using local calculation.");
                        setPatterns(fallbackPatterns);
                        // Cache fallback to avoid repeated failures today
                        await AsyncStorage.setItem('pattern_date', todayStr);
                        await AsyncStorage.setItem('pattern_cache', JSON.stringify(fallbackPatterns));
                        return;
                    }

                    // Simple cleaning of markdown json blocks if present
                    const cleanJson = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
                    const parsedPatterns = JSON.parse(cleanJson);

                    if (Array.isArray(parsedPatterns) && parsedPatterns.length === 3) {
                        const formattedPatterns = parsedPatterns.map((p, i) => ({
                            id: String(i + 1),
                            title: p.title,
                            description: p.description,
                            icon: p.icon || 'star', // fallback icon
                            color: p.color || '#4A6CF7',
                            bgColor: p.bgColor || '#EEF2FF'
                        }));

                        setPatterns(formattedPatterns);
                        await AsyncStorage.setItem('pattern_date', todayStr);
                        await AsyncStorage.setItem('pattern_cache', JSON.stringify(formattedPatterns));
                    } else {
                        throw new Error("Invalid AI Format");
                    }
                } catch (e) {
                    console.warn("AI Pattern Gen Failed, using fallback", e);
                    setPatterns(fallbackPatterns);
                }
            }

        } catch (error) {
            console.error('Error fetching insights:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateReport = async () => {
        try {
            setGenerating(true);

            setGenerating(true);

            // Fetch Recent Stats (Last 30 Days) - Better for actionable insights
            const today = new Date();
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(today.getDate() - 30);
            const dateStr = thirtyDaysAgo.toISOString();

            const { count: recentHabits } = await supabase
                .from('habit_logs')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
                .eq('status', 'completed')
                .gte('completed_at', dateStr);

            const { count: recentTasks } = await supabase
                .from('tasks')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
                .eq('status', 'completed')
                .gte('created_at', dateStr);

            // Prepare stats data
            const stats = {
                recentHabits: recentHabits || 0,
                recentTasks: recentTasks || 0,
                avgEnergy: insightStats.avgEnergy,
                peakWindow: patterns.find(p => p.id === '1')?.description || 'Not enough data',
                mood: insightStats.mood
            };

            // Re-calculate simple percentages for prompt
            const prompt = buildInsightPrompt(stats); // We'd pass real calculated stats here

            const response = await generateInsight(prompt);
            setAiReport(response);
        } catch (error) {
            alert('Could not generate report. Check API Key.');
        } finally {
            setGenerating(false);
        }
    };

    return (
        <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <Text style={[styles.title, { color: colors.text }]}>Insights</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>AI-powered patterns and recommendations</Text>

            {/* AI Score Card */}
            <View style={[styles.scoreCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.scoreContent}>
                    <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>Your AI Score</Text>
                    <View style={styles.scoreRow}>
                        <Text style={[styles.scoreValue, { color: colors.text }]}>{aiScore}</Text>
                        <Text style={[styles.scoreMax, { color: colors.textSecondary }]}>/100</Text>
                    </View>
                    <Text style={[styles.scoreDescription, { color: colors.textSecondary }]}>
                        Based on your habits, tasks, and energy levels this week.
                    </Text>
                </View>
                <View style={[styles.trophyContainer, { backgroundColor: theme === 'dark' ? '#1E3A8A' : '#EEF2FF' }]}>
                    <FontAwesome name="trophy" size={32} color="#4A6CF7" />
                </View>
            </View>

            {/* Key Patterns */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Key Patterns</Text>
            {loading ? (
                <Text style={{ textAlign: 'center', marginTop: 20, color: colors.textSecondary }}>Analyzing data...</Text>
            ) : (
                patterns.map((pattern) => (
                    <View key={pattern.id} style={[styles.patternCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={[
                            styles.patternIcon,
                            { backgroundColor: theme === 'dark' ? pattern.color + '20' : pattern.bgColor }
                        ]}>
                            <FontAwesome name={pattern.icon} size={20} color={pattern.color} />
                        </View>
                        <View style={styles.patternContent}>
                            <Text style={[styles.patternTitle, { color: colors.text }]}>{pattern.title}</Text>
                            <Text style={[styles.patternDescription, { color: colors.textSecondary }]}>{pattern.description}</Text>
                        </View>
                    </View>
                ))
            )}

            {/* AI Analysis Section */}
            <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>AI Analysis</Text>
            </View>

            <View style={[styles.aiCard, { backgroundColor: colors.primary }]}>
                <View style={styles.aiHeader}>
                    <FontAwesome name="magic" size={20} color="#FFFFFF" />
                    <Text style={styles.aiTitle}>Smart Insights</Text>
                </View>

                {aiReport ? (
                    <Text style={styles.aiText}>{aiReport}</Text>
                ) : (
                    <Text style={styles.aiPlaceholder}>
                        Generate a personalized report based on your recent activity, habits, and energy levels.
                    </Text>
                )}

                <TouchableOpacity
                    style={[styles.generateButton, { backgroundColor: colors.card }, generating && styles.buttonDisabled]}
                    onPress={handleGenerateReport}
                    disabled={generating}
                >
                    {generating ? (
                        <Text style={[styles.buttonText, { color: colors.primary }]}>Analyzing...</Text>
                    ) : (
                        <>
                            <FontAwesome name="magic" size={16} color={colors.primary} style={{ marginRight: 8 }} />
                            <Text style={[styles.buttonText, { color: colors.primary }]}>{aiReport ? 'Regenerate Analysis' : 'Generate Report'}</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

            {/* Explore More */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Explore More</Text>
            <View style={styles.exploreRow}>
                <TouchableOpacity style={[styles.exploreCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.push('/analytics')}>
                    <View style={[styles.exploreIcon, { backgroundColor: theme === 'dark' ? '#1E3A8A' : '#EEF2FF' }]}>
                        <FontAwesome name="th-large" size={24} color="#4A6CF7" />
                    </View>
                    <Text style={[styles.exploreTitle, { color: colors.text }]}>Analytics</Text>
                    <Text style={[styles.exploreSubtitle, { color: colors.textSecondary }]}>Detailed stats & trends</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.exploreCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.push('/digital-twin')}>
                    <View style={[styles.exploreIcon, { backgroundColor: theme === 'dark' ? '#4C1D95' : '#F3E8FF' }]}>
                        <FontAwesome name="user-circle" size={24} color="#8B5CF6" />
                    </View>
                    <Text style={[styles.exploreTitle, { color: colors.text }]}>Digital Twin</Text>
                    <Text style={[styles.exploreSubtitle, { color: colors.textSecondary }]}>Future projections</Text>
                </TouchableOpacity>
            </View>

            <View style={{ height: 100 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FE',
        paddingHorizontal: 20,
        paddingTop: 50,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 24,
    },
    scoreCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20,
        flexDirection: 'row',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    scoreContent: {
        flex: 1,
    },
    scoreLabel: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 4,
    },
    scoreRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: 8,
    },
    scoreValue: {
        fontSize: 48,
        fontWeight: '700',
        color: '#1F2937',
    },
    scoreMax: {
        fontSize: 24,
        fontWeight: '500',
        color: '#9CA3AF',
    },
    scoreDescription: {
        fontSize: 13,
        color: '#6B7280',
        lineHeight: 18,
    },
    highlight: {
        color: '#10B981',
        fontWeight: '600',
    },
    trophyContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#EEF2FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 0,
    },
    patternCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    patternIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    patternContent: {
        flex: 1,
    },
    patternTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 4,
    },
    patternDescription: {
        fontSize: 13,
        color: '#6B7280',
        lineHeight: 18,
        marginBottom: 8,
    },
    viewDetails: {
        fontSize: 13,
        fontWeight: '500',
    },
    exploreRow: {
        flexDirection: 'row',
        gap: 12,
    },
    exploreCard: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    exploreIcon: {
        width: 56,
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    exploreTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 4,
    },
    exploreSubtitle: {
        fontSize: 12,
        color: '#6B7280',
        textAlign: 'center',
    },
    aiCard: {
        backgroundColor: '#4A6CF7',
        borderRadius: 20,
        padding: 20,
        marginBottom: 24,
    },
    aiHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 10,
    },
    aiTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    aiPlaceholder: {
        color: '#E0E7FF',
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 20,
    },
    aiText: {
        color: '#FFFFFF',
        fontSize: 14,
        lineHeight: 22,
        marginBottom: 20,
    },
    generateButton: {
        backgroundColor: '#FFFFFF',
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: '#4A6CF7',
        fontWeight: '600',
        fontSize: 14,
    },
});
