import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useEffect, useCallback } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateDailyOutlook } from '../../lib/ai';
import { useTheme } from '../../context/ThemeContext';

const moods = ['😊', '😃', '😐', '😔', '😢'];

export default function HomeScreen() {
  const router = useRouter();
  const { theme, colors } = useTheme();
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [energyLevel, setEnergyLevel] = useState(50); // Default to middle
  const [loading, setLoading] = useState(true);
  const [aiForecast, setAiForecast] = useState('');
  const [userInfo, setUserInfo] = useState({ name: 'User', avatar: null }); // Added user info state
  const [stats, setStats] = useState({
    completedHabits: 0,
    totalHabits: 0,
    completedTasks: 0,
    totalTasks: 0
  });

  useFocusEffect(
    useCallback(() => {
      fetchTodayData();
    }, [])
  );

  useEffect(() => {
    const getOutlook = async () => {
      // 1. Check Cache
      const today = new Date().toISOString().split('T')[0];
      const lastDate = await AsyncStorage.getItem('last_insight_date');
      const cachedInsight = await AsyncStorage.getItem('cached_insight');

      if (lastDate === today && cachedInsight && !cachedInsight.startsWith('(Mock)')) {
        setAiForecast(cachedInsight);
        return;
      }

      // 2. Fetch New if needed
      if (stats.totalTasks > 0 || energyLevel > 0) {
        try {
          // Pass pending tasks count
          const prediction = await generateDailyOutlook(energyLevel, stats.totalTasks - stats.completedTasks);
          setAiForecast(prediction);

          // 3. Save to Cache (Only if REAL data)
          if (!prediction.startsWith('(Mock)')) {
            await AsyncStorage.setItem('last_insight_date', today);
            await AsyncStorage.setItem('cached_insight', prediction);
          }
        } catch (e) {
          console.log('Outlook Error', e);
        }
      }
    };
    if (!loading) {
      getOutlook();
    }
  }, [loading, energyLevel, stats.totalTasks]);

  const fetchTodayData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch Profile for Name
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single();

      if (profile) {
        setUserInfo({
          name: profile.full_name || 'User',
          avatar: profile.avatar_url
        });
      }

      const today = new Date().toISOString().split('T')[0];

      // 1. Fetch Daily Metrics (Energy/Mood)
      const { data: metrics } = await supabase
        .from('daily_metrics')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .single();

      if (metrics) {
        if (metrics.energy_level !== null) setEnergyLevel(metrics.energy_level);
        if (metrics.mood_score !== null) setSelectedMood(metrics.mood_score);
      }

      // 2. Fetch Habits Stats
      // Total habits for user
      const { count: totalHabits, error: habitsError } = await supabase
        .from('habits')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Completed habits today
      // note: using simple range for 'today' might be safer with timestamp comparison if completed_at is timestamptz
      const todayStart = new Date(today);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999);

      const { data: logsData, error: logsError } = await supabase
        .from('habit_logs')
        .select('habit_id')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .gte('completed_at', todayStart.toISOString())
        .lte('completed_at', todayEnd.toISOString());

      // Count unique completed habits to avoid duplicates (e.g. if user toggles rapidly or DB has duplicates)
      const completedHabits = logsData ? new Set(logsData.map(l => l.habit_id)).size : 0;

      // 3. Fetch Tasks Stats (Today's tasks)
      // Total tasks due today (or overdue?) - Let's stick to "Today's Tasks" logic: Due today
      const { data: todayTasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id);

      let tTasks = 0;
      let cTasks = 0;

      if (todayTasks) {
        const todayDate = new Date();
        todayDate.setHours(0, 0, 0, 0);

        todayTasks.forEach((task: any) => {
          if (task.due_date) {
            const d = new Date(task.due_date);
            d.setHours(0, 0, 0, 0);
            // Count if due today or overdue (similar to Tasks screen)
            if (d.getTime() <= todayDate.getTime()) {
              tTasks++;
              if (task.status === 'completed') cTasks++;
            }
          }
        });
      }

      setStats({
        totalHabits: totalHabits || 0,
        completedHabits: completedHabits || 0,
        totalTasks: tTasks,
        completedTasks: cTasks
      });

    } catch (error) {
      console.log('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMoodSelect = async (index: number) => {
    setSelectedMood(index);

    // Map mood to approximate energy level
    // 0: Happy (75), 1: Excited (90), 2: Neutral (50), 3: Sad (30), 4: Upset (15)
    const moodEnergyMap = [75, 90, 50, 30, 15];
    const newEnergy = moodEnergyMap[index];
    setEnergyLevel(newEnergy);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split('T')[0];
      // Upsert mood interaction
      const { error } = await supabase
        .from('daily_metrics')
        .upsert({
          user_id: user.id,
          date: today,
          mood_score: index,
          energy_level: newEnergy
        }, { onConflict: 'user_id, date' });

      if (error) console.error("Error saving mood:", error);

    } catch (error) {
      console.error("Error handling mood:", error);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.textSecondary }]}>Good morning</Text>
          <Text style={[styles.userName, { color: colors.text }]}>{userInfo.name}</Text>
        </View>
        <TouchableOpacity style={styles.avatar} onPress={() => router.push('/profile')}>
          {userInfo.avatar ? (
            <Image source={{ uri: userInfo.avatar }} style={{ width: 48, height: 48, borderRadius: 24 }} />
          ) : (
            <Text style={styles.avatarText}>{userInfo.name.charAt(0)}</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Energy Card */}
      <View style={[styles.energyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.energyLeft}>
          <Text style={[styles.energyLabel, { color: colors.textSecondary }]}>Today's Energy</Text>
          <View style={styles.energyRow}>
            <Text style={[styles.energyLevel, { color: colors.text }]}>High</Text>
            <FontAwesome name="bolt" size={16} color="#F59E0B" />
          </View>
          <View style={[styles.energySlider, { backgroundColor: theme === 'dark' ? '#374151' : '#E5E7EB' }]}>
            <View style={[styles.energyFill, { width: `${energyLevel}%` }]} />
            <View style={[styles.energyDot, { left: `${energyLevel - 2}%`, borderColor: colors.card }]} />
          </View>
        </View>
        <View style={styles.energyRight}>
          <View style={[styles.circularProgress, { borderColor: colors.primary, backgroundColor: theme === 'dark' ? '#111827' : '#EEF2FF' }]}>
            <Text style={[styles.progressText, { color: colors.primary }]}>{energyLevel}%</Text>
          </View>
        </View>
      </View>

      {/* AI Insight Card */}
      <View style={[styles.insightCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.insightHeader}>
          <Text style={[styles.insightLabel, { color: colors.textSecondary }]}>AI Insight of the Day</Text>
          <View style={[styles.aiIcon, { backgroundColor: theme === 'dark' ? '#1E3A8A' : '#EEF2FF' }]}>
            <FontAwesome name="lightbulb-o" size={14} color="#4A6CF7" />
          </View>
        </View>
        <Text style={[styles.insightTitle, { color: colors.text }]}>Peak Focus Window</Text>
        <Text style={[styles.insightDescription, { color: colors.textSecondary }]}>
          Your energy peaks between 9-11 AM. Schedule your most important task during this window for optimal results.
        </Text>
      </View>

      {/* Today's Overview */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Today's Overview</Text>
      </View>
      <View style={styles.overviewRow}>
        <TouchableOpacity style={[styles.overviewCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.push('/(tabs)/habits')}>
          <View style={styles.overviewIcon}>
            <FontAwesome name="check-circle" size={20} color="#4A6CF7" />
          </View>
          <Text style={[styles.overviewValue, { color: colors.text }]}>{stats.completedHabits}/{stats.totalHabits}</Text>
          <Text style={[styles.overviewLabel, { color: colors.textSecondary }]}>Habits Done</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.overviewCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.push('/(tabs)/tasks')}>
          <View style={styles.overviewIcon}>
            <FontAwesome name="list-ul" size={20} color="#10B981" />
          </View>
          <Text style={[styles.overviewValue, { color: colors.text }]}>{stats.completedTasks}/{stats.totalTasks}</Text>
          <Text style={[styles.overviewLabel, { color: colors.textSecondary }]}>Tasks Done</Text>
        </TouchableOpacity>
      </View>

      {/* Mood Check-in */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Mood Check-in</Text>
        <View style={[styles.moodIndicator, { backgroundColor: theme === 'dark' ? '#78350F' : '#FEF3C7' }]}>
          <FontAwesome name="smile-o" size={20} color="#F59E0B" />
        </View>
      </View>
      <View style={[styles.moodCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.moodRow}>
          {moods.map((emoji, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.moodButton,
                { backgroundColor: theme === 'dark' ? '#374151' : '#FEF3C7' }, // Dynamic mood button bg
                selectedMood === index && styles.moodButtonSelected,
              ]}
              onPress={() => handleMoodSelect(index)}
            >
              <Text style={styles.moodEmoji}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={[styles.moodFeedback, { color: colors.textSecondary }]}>You're feeling good today!</Text>
      </View>

      {/* Predictive Alert */}
      <View style={[styles.alertCard, {
        backgroundColor: theme === 'dark' ? '#372020' : '#FEF2F2',
        borderColor: theme === 'dark' ? '#7F1D1D' : '#FECACA'
      }]}>
        <View style={[styles.alertIcon, { backgroundColor: theme === 'dark' ? '#450a0a' : '#FEE2E2' }]}>
          <FontAwesome name="bolt" size={20} color="#EF4444" />
        </View>
        <View style={styles.alertContent}>
          <Text style={[styles.alertTitle, { color: theme === 'dark' ? '#FECACA' : '#991B1B' }]}>Daily Outlook</Text>
          <Text style={[styles.alertDescription, { color: theme === 'dark' ? '#FCA5A5' : '#7F1D1D' }]}>
            {aiForecast || "⚡ Analyzing your daily patterns..."}
          </Text>
        </View>
      </View>

      {/* Quick Actions */}
      <Text style={[styles.quickActionsTitle, { color: colors.text }]}>Quick Actions</Text>
      <View style={styles.quickActionsGrid}>
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.push('/add-task')}>
          <View style={[styles.actionIcon, { backgroundColor: theme === 'dark' ? '#1F2937' : '#F3F4F6' }]}>
            <FontAwesome name="plus" size={20} color="#4A6CF7" />
          </View>
          <Text style={[styles.actionLabel, { color: colors.text }]}>Add Task</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.push('/add-habit')}>
          <View style={[styles.actionIcon, { backgroundColor: theme === 'dark' ? '#1F2937' : '#F3F4F6' }]}>
            <FontAwesome name="heart" size={20} color="#10B981" />
          </View>
          <Text style={[styles.actionLabel, { color: colors.text }]}>Log Habit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.push('/(tabs)/plan')}>
          <View style={[styles.actionIcon, { backgroundColor: theme === 'dark' ? '#1F2937' : '#F3F4F6' }]}>
            <FontAwesome name="calendar" size={20} color="#8B5CF6" />
          </View>
          <Text style={[styles.actionLabel, { color: colors.text }]}>View Plan</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.actionIcon, { backgroundColor: theme === 'dark' ? '#1F2937' : '#F3F4F6' }]}>
            <FontAwesome name="bar-chart" size={20} color="#F59E0B" />
          </View>
          <Text style={[styles.actionLabel, { color: colors.text }]}>Insights</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: '#F8F9FE', // Dynamic
    paddingHorizontal: 20,
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 14,
    // color: '#6B7280', // Dynamic
  },
  userName: {
    fontSize: 28,
    fontWeight: '700',
    // color: '#1F2937', // Dynamic
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4A6CF7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  energyCard: {
    // backgroundColor: '#FFFFFF', // Dynamic
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    borderWidth: 1,
    // borderColor: '#E5E7EB', // Dynamic
  },
  energyLeft: {
    flex: 1,
  },
  energyLabel: {
    fontSize: 12,
    // color: '#6B7280', // Dynamic
    marginBottom: 4,
  },
  energyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  energyLevel: {
    fontSize: 24,
    fontWeight: '700',
    // color: '#1F2937', // Dynamic
  },
  energySlider: {
    height: 8,
    // backgroundColor: '#E5E7EB', // Dynamic
    borderRadius: 4,
    width: '80%',
    position: 'relative',
  },
  energyFill: {
    height: '100%',
    backgroundColor: '#4A6CF7',
    borderRadius: 4,
  },
  energyDot: {
    position: 'absolute',
    top: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#4A6CF7',
    borderWidth: 3,
    // borderColor: '#FFFFFF', // Dynamic
  },
  energyRight: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  circularProgress: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 4,
    borderColor: '#4A6CF7',
    // backgroundColor: '#EEF2FF', // Dynamic
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4A6CF7',
  },
  insightCard: {
    // backgroundColor: '#FFFFFF', // Dynamic
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    // borderColor: '#E5E7EB', // Dynamic
  },
  insightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  insightLabel: {
    fontSize: 12,
    // color: '#6B7280', // Dynamic
  },
  aiIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    // backgroundColor: '#EEF2FF', // Dynamic
    justifyContent: 'center',
    alignItems: 'center',
  },
  insightTitle: {
    fontSize: 18,
    fontWeight: '700',
    // color: '#1F2937', // Dynamic
    marginBottom: 8,
  },
  insightDescription: {
    fontSize: 14,
    // color: '#6B7280', // Dynamic
    lineHeight: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    // color: '#1F2937', // Dynamic
  },
  viewAll: {
    fontSize: 14,
    color: '#4A6CF7',
  },
  overviewRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  overviewCard: {
    flex: 1,
    // backgroundColor: '#FFFFFF', // Dynamic
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    // borderColor: '#E5E7EB', // Dynamic
  },
  overviewIcon: {
    marginBottom: 8,
  },
  overviewValue: {
    fontSize: 24,
    fontWeight: '700',
    // color: '#1F2937', // Dynamic
  },
  overviewLabel: {
    fontSize: 12,
    // color: '#6B7280', // Dynamic
  },
  moodIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    // backgroundColor: '#FEF3C7', // Dynamic
    justifyContent: 'center',
    alignItems: 'center',
  },
  moodCard: {
    // backgroundColor: '#FFFFFF', // Dynamic
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    // borderColor: '#E5E7EB', // Dynamic
  },
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  moodButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    // backgroundColor: '#FEF3C7', // Dynamic
    justifyContent: 'center',
    alignItems: 'center',
  },
  moodButtonSelected: {
    backgroundColor: '#FCD34D',
    transform: [{ scale: 1.15 }],
  },
  moodEmoji: {
    fontSize: 24,
  },
  moodFeedback: {
    fontSize: 14,
    // color: '#6B7280', // Dynamic
    textAlign: 'center',
    fontStyle: 'italic',
  },
  alertCard: {
    // backgroundColor: '#FEF2F2', // Dynamic
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    marginBottom: 24,
    borderWidth: 1,
    // borderColor: '#FECACA', // Dynamic
  },
  alertIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    // backgroundColor: '#FEE2E2', // Dynamic
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    // color: '#991B1B', // Dynamic
    marginBottom: 4,
  },
  alertDescription: {
    fontSize: 13,
    // color: '#7F1D1D', // Dynamic
    lineHeight: 18,
  },
  quickActionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    // color: '#1F2937', // Dynamic
    marginBottom: 12,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    width: '47%',
    // backgroundColor: '#FFFFFF', // Dynamic
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    // borderColor: '#E5E7EB', // Dynamic
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    // backgroundColor: '#F3F4F6', // Dynamic
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '500',
    // color: '#1F2937', // Dynamic
  },
});
