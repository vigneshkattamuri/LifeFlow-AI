import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../context/ThemeContext';

type DayTab = 'today' | 'tomorrow';
type ItemType = 'habit' | 'task' | 'break';
type FilterType = 'All' | 'Tasks' | 'Habits';

interface PlanItem {
  id: string;
  time: string;
  sortTime: string;
  displayTime: string;
  title: string;
  type: ItemType;
  duration: string;
  tags: string[];
  streak?: number;
  attendees?: number;
  completed?: boolean; // New field for completion status
}

const getTypeColor = (type: ItemType) => {
  switch (type) {
    case 'habit': return '#10B981';
    case 'task': return '#4A6CF7';
    case 'break': return '#F59E0B';
  }
};

const getTypeLabel = (type: ItemType) => {
  switch (type) {
    case 'habit': return 'Habit';
    case 'task': return 'Task';
    case 'break': return 'Break';
  }
};

export default function PlanScreen() {
  const router = useRouter();
  const { theme, colors } = useTheme();
  const [activeTab, setActiveTab] = useState<DayTab>('today');
  const [activeFilter, setActiveFilter] = useState<FilterType>('All');
  const [planItems, setPlanItems] = useState<PlanItem[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchPlan();
    }, [activeTab])
  );

  const fetchPlan = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const targetDate = new Date();
      if (activeTab === 'tomorrow') {
        targetDate.setDate(targetDate.getDate() + 1);
      }
      // Start of day in Local Time
      targetDate.setHours(0, 0, 0, 0);
      const startOfDayIso = targetDate.toISOString();

      // End of day in Local Time
      const targetDateEnd = new Date(targetDate);
      targetDateEnd.setHours(23, 59, 59, 999);
      const endOfDayIso = targetDateEnd.toISOString();

      // 1. Fetch Habits
      const { data: habitsData, error: habitsError } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', user.id);

      if (habitsError) throw habitsError;

      // 2. Fetch Habit Logs for Target Date (to check completion)
      const { data: habitLogs, error: logsError } = await supabase
        .from('habit_logs')
        .select('habit_id')
        .eq('user_id', user.id)
        .gte('completed_at', startOfDayIso)
        .lte('completed_at', endOfDayIso);

      if (logsError) throw logsError;

      const completedHabitIds = new Set(habitLogs?.map(log => log.habit_id));

      // 3. Fetch Tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .neq('status', 'completed'); // Keep showing pending tasks

      if (tasksError) throw tasksError;

      // 4. Process & Merge
      // Map Habits to PlanItems
      const timeMap: Record<string, string> = {
        'morning': '08:00',
        'afternoon': '13:00',
        'evening': '18:00',
      };

      const mappedHabits: PlanItem[] = habitsData.map((h: any) => ({
        id: h.id,
        time: timeMap[h.time_of_day?.toLowerCase()] || '09:00',
        displayTime: h.time_of_day ? h.time_of_day.charAt(0).toUpperCase() + h.time_of_day.slice(1) : 'Any Time',
        title: h.title,
        type: 'habit',
        duration: h.duration ? `${h.duration} min` : '15 min',
        tags: h.category ? [h.category] : [],
        streak: h.streak_current,
        sortTime: timeMap[h.time_of_day?.toLowerCase()] || '09:00',
        completed: completedHabitIds.has(h.id) // Mark as completed if log exists
      }));

      // Filter Tasks by Date
      const mappedTasks: PlanItem[] = tasksData
        .filter((t: any) => {
          if (!t.due_date) return false;
          const d = new Date(t.due_date);
          return d >= targetDate && d <= targetDateEnd;
        })
        .map((t: any) => {
          const d = new Date(t.due_date);
          const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
          return {
            id: t.id,
            time: timeStr,
            displayTime: d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
            title: t.title,
            type: 'task',
            duration: t.duration ? `${t.duration} min` : '60 min',
            tags: [t.priority + ' Priority'],
            sortTime: timeStr,
            completed: false // Tasks in this list are pending by definition of the query
          };
        });

      // Merge and Sort
      const merged = [...mappedHabits, ...mappedTasks].sort((a, b) => a.sortTime.localeCompare(b.sortTime));

      setPlanItems(merged);

    } catch (error) {
      console.error('Error fetching plan:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter Logic
  const filteredItems = planItems.filter(item => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Tasks') return item.type === 'task';
    if (activeFilter === 'Habits') return item.type === 'habit';
    return true;
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{activeTab === 'today' ? "Today's Plan" : "Tomorrow's Plan"}</Text>
        {/* Filter Tabs (Replacing Filter Icon) */}
        <View style={[styles.filterTabs, { backgroundColor: theme === 'dark' ? '#374151' : '#E5E7EB' }]}>
          {(['All', 'Tasks', 'Habits'] as FilterType[]).map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterTab,
                activeFilter === filter && { backgroundColor: theme === 'dark' ? '#1F2937' : '#FFFFFF', ...styles.filterTabActiveShadow }
              ]}
              onPress={() => setActiveFilter(filter)}
            >
              <Text style={[
                styles.filterText,
                { color: activeFilter === filter ? colors.text : colors.textSecondary },
                activeFilter === filter && styles.filterTextActive
              ]}>
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Day Tab Selector */}
      <View style={[styles.tabContainer, { backgroundColor: colors.card }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'today' && styles.tabActive]}
          onPress={() => setActiveTab('today')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'today' ? '#FFFFFF' : colors.textSecondary }]}>Today</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'tomorrow' && styles.tabActive]}
          onPress={() => setActiveTab('tomorrow')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'tomorrow' ? '#FFFFFF' : colors.textSecondary }]}>Tomorrow</Text>
        </TouchableOpacity>
      </View>

      {/* AI Badge */}
      <View style={styles.aiBadge}>
        <FontAwesome name="magic" size={12} color="#4A6CF7" />
        <Text style={[styles.aiBadgeText, { color: colors.textSecondary }]}>AI-optimized for your peak energy</Text>
        <View style={[styles.optimizedBadge, { backgroundColor: theme === 'dark' ? '#064E3B' : '#ECFDF5' }]}>
          <Text style={styles.optimizedText}>Optimized</Text>
        </View>
      </View>

      {/* Timeline */}
      <ScrollView
        style={styles.timeline}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchPlan} tintColor={colors.primary} />
        }
      >
        {filteredItems.length === 0 && !loading ? (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <Text style={{ color: colors.textSecondary }}>No items found.</Text>
          </View>
        ) : (
          filteredItems.map((item, index) => (
            <View key={index} style={[styles.timelineItem, item.completed && { opacity: 0.6 }]}>
              {/* Time Column */}
              <View style={styles.timeColumn}>
                <View style={[styles.timeDot, { backgroundColor: item.completed ? '#10B981' : getTypeColor(item.type) }]} />
                <Text style={[styles.timeText, { color: colors.textSecondary }]}>{item.displayTime}</Text>
                {index < filteredItems.length - 1 && <View style={[styles.timeLine, { backgroundColor: colors.border }]} />}
              </View>

              {/* Content Card */}
              <View style={[
                styles.itemCard,
                { backgroundColor: colors.card, borderColor: colors.border },
                item.completed && { backgroundColor: theme === 'dark' ? '#111827' : '#F9FAFB' }
              ]}>
                <View style={styles.itemHeader}>
                  <Text style={[styles.itemTitle, { color: colors.text }, item.completed && styles.completedText]}>
                    {item.title}
                  </Text>
                  {item.completed ? (
                    <View style={styles.completedBadge}>
                      <FontAwesome name="check" size={12} color="#FFFFFF" />
                      <Text style={styles.completedBadgeText}>Done</Text>
                    </View>
                  ) : (
                    <View style={[styles.typeBadge, { backgroundColor: getTypeColor(item.type) + '20' }]}>
                      <Text style={[styles.typeBadgeText, { color: getTypeColor(item.type) }]}>
                        {getTypeLabel(item.type)}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.itemDuration, { color: colors.textSecondary }]}>{item.duration} • {item.tags[0]}</Text>

                {/* Extra info - Hide if completed to clean up UI? Or keep it? Keeping for now. */}
                {!item.completed && (
                  <View style={styles.itemFooter}>
                    {item.streak !== undefined && item.streak > 0 && (
                      <View style={styles.streakBadge}>
                        <FontAwesome name="fire" size={12} color="#F59E0B" />
                        <Text style={styles.streakText}>{item.streak} day streak</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </View>
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Add Button */}
      <TouchableOpacity style={styles.addButton} onPress={() => router.push('/add-task')}>
        <FontAwesome name="plus" size={16} color="#FFFFFF" />
        <Text style={styles.addButtonText}>Add to Plan</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: '#F8F9FE', // Dynamic
    paddingTop: 50,
  },
  header: {
    flexDirection: 'column', // Changed to column to stack title and filters
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    // color: '#1F2937', // Dynamic
  },
  filterTabs: {
    flexDirection: 'row',
    // backgroundColor: '#E5E7EB', // Dynamic
    borderRadius: 10,
    padding: 3,
    alignSelf: 'flex-start',
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
  },
  filterTabActiveShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  filterTabActive: {
    // backgroundColor dynamic
  },
  filterText: {
    fontSize: 13,
    // color: '#6B7280', // Dynamic
    fontWeight: '500',
  },
  filterTextActive: {
    // color: '#1F2937', // Dynamic
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    // backgroundColor: '#FFFFFF', // Dynamic
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: '#4A6CF7',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    // color: '#6B7280', // Dynamic
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
    gap: 8,
  },
  aiBadgeText: {
    fontSize: 12,
    // color: '#6B7280', // Dynamic
    flex: 1,
  },
  optimizedBadge: {
    // backgroundColor: '#ECFDF5', // Dynamic
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  optimizedText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '500',
  },
  timeline: {
    flex: 1,
    paddingHorizontal: 20,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timeColumn: {
    width: 50,
    alignItems: 'center',
  },
  timeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 4,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '600',
    // color: '#6B7280', // Dynamic
  },
  timeLine: {
    width: 2,
    flex: 1,
    // backgroundColor: '#E5E7EB', // Dynamic
    marginTop: 8,
  },
  itemCard: {
    flex: 1,
    // backgroundColor: '#FFFFFF', // Dynamic
    borderRadius: 16,
    padding: 16,
    marginLeft: 12,
    borderWidth: 1,
    // borderColor: '#E5E7EB', // Dynamic
  },
  itemCardCompleted: {
    // backgroundColor: '#F9FAFB', // Dynamic
    // borderColor: '#E5E7EB', // Dynamic
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    // color: '#1F2937', // Dynamic
    flex: 1,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  itemDuration: {
    fontSize: 13,
    // color: '#6B7280', // Dynamic
    marginBottom: 8,
  },
  itemFooter: {
    marginTop: 4,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  streakText: {
    fontSize: 12,
    color: '#F59E0B',
  },
  completedBadge: {
    flexDirection: 'row',
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
    gap: 4,
  },
  completedBadgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    backgroundColor: '#4A6CF7',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
