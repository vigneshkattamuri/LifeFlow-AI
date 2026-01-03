import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../context/ThemeContext';

type FilterTab = 'all' | 'completed' | 'pending';
type Priority = 'high' | 'medium' | 'low';

interface Task {
    id: string;
    title: string;
    priority: Priority;
    tags: string[];
    dueTime: string;
    completed: boolean;
    completedAt?: string;
    dueDate?: Date;
}



const getPriorityColor = (priority: Priority) => {
    switch (priority) {
        case 'high': return '#EF4444';
        case 'medium': return '#F59E0B';
        case 'low': return '#4A6CF7';
    }
};

const getPriorityLabel = (priority: Priority) => {
    switch (priority) {
        case 'high': return 'High Priority';
        case 'medium': return 'Medium Priority';
        case 'low': return 'Low Priority';
    }
};

export default function TasksScreen() {
    const router = useRouter();
    const { theme, colors } = useTheme();
    const [activeTab, setActiveTab] = useState<FilterTab>('all');
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            fetchTasks();
        }, [])
    );

    const fetchTasks = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('tasks')
                .select('*')
                .eq('user_id', user.id)
                .order('due_date', { ascending: true }); // Order by due date

            if (error) throw error;

            const mappedTasks: Task[] = data.map((t: any) => ({
                id: t.id,
                title: t.title,
                priority: t.priority.toLowerCase() as Priority,
                tags: t.cognitive_load ? [t.cognitive_load] : [], // Map cognitive load to tags
                dueTime: new Date(t.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                dueDate: new Date(t.due_date),
                completed: t.status === 'completed',
                completedAt: t.updated_at // Approximate
            }));

            setTasks(mappedTasks);
        } catch (error) {
            console.error('Error fetching tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleTask = async (taskId: string, currentStatus: boolean) => {
        try {
            // Optimistic update
            setTasks(prev => prev.map(t =>
                t.id === taskId ? { ...t, completed: !currentStatus } : t
            ));

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase
                .from('tasks')
                .update({ status: !currentStatus ? 'completed' : 'pending' })
                .eq('id', taskId)
                .eq('user_id', user.id);

            if (error) throw error;

        } catch (error) {
            console.error('Error toggling task:', error);
            // Revert
            setTasks(prev => prev.map(t =>
                t.id === taskId ? { ...t, completed: currentStatus } : t
            ));
        }
    };

    const filterTasks = (taskList: Task[]) => {
        if (activeTab === 'completed') return taskList.filter(t => t.completed);
        if (activeTab === 'pending') return taskList.filter(t => !t.completed);
        return taskList;
    };

    // Helper to split filtered tasks by day
    const getGroupedTasks = () => {
        const filtered = filterTasks(tasks);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayTasks = filtered.filter(t => {
            if (!t.dueDate) return false;
            const d = new Date(t.dueDate);
            d.setHours(0, 0, 0, 0);
            return d.getTime() === today.getTime() || d.getTime() < today.getTime(); // Include overdue in today
        });

        const tomorrowTasks = filtered.filter(t => {
            if (!t.dueDate) return false;
            const d = new Date(t.dueDate);
            d.setHours(0, 0, 0, 0);
            return d.getTime() === tomorrow.getTime();
        });

        // Future/other logic could go here

        return { todayTasks, tomorrowTasks };
    };

    const { todayTasks, tomorrowTasks } = getGroupedTasks();


    const renderTask = (task: Task) => (
        <View key={task.id} style={[styles.taskCard, { backgroundColor: colors.card, borderColor: colors.border }, task.completed && { opacity: 0.6 }]}>
            <View style={styles.taskRow}>
                {/* Priority Indicator / Checkbox */}
                <TouchableOpacity
                    style={styles.checkboxColumn}
                    onPress={() => toggleTask(task.id, task.completed)}
                >
                    {task.completed ? (
                        <View style={styles.checkboxChecked}>
                            <FontAwesome name="check" size={12} color="#FFFFFF" />
                        </View>
                    ) : (
                        <View style={[styles.checkbox, { borderColor: getPriorityColor(task.priority) }]} />
                    )}
                </TouchableOpacity>

                {/* Content */}
                <View style={styles.taskContent}>
                    <Text style={[styles.taskTitle, { color: colors.text }, task.completed && styles.taskTitleCompleted]}>
                        {task.title}
                    </Text>
                    <View style={styles.tagsRow}>
                        <Text style={[styles.priorityTag, { color: getPriorityColor(task.priority) }]}>
                            {getPriorityLabel(task.priority)}
                        </Text>
                        {task.tags.map((tag, i) => (
                            <View key={i} style={[styles.tagChip, { backgroundColor: theme === 'dark' ? '#374151' : '#F3F4F6' }]}>
                                <Text style={[styles.tagText, { color: colors.textSecondary }]}>{tag}</Text>
                            </View>
                        ))}
                    </View>
                    <View style={styles.dueRow}>
                        <FontAwesome name="clock-o" size={12} color={colors.textSecondary} />
                        <Text style={[styles.dueText, { color: colors.textSecondary }]}>{task.dueTime}</Text>
                    </View>
                </View>

                {/* Edit Button */}
                <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => router.push({ pathname: '/add-task', params: { id: task.id } })}
                >
                    <FontAwesome name="pencil" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={[styles.title, { color: colors.text }]}>Tasks</Text>
                <TouchableOpacity style={styles.addButton} onPress={() => router.push('/add-task')}>
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

            {/* Tasks List */}
            <ScrollView
                style={styles.list}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={loading} onRefresh={fetchTasks} tintColor={colors.primary} />
                }
            >
                {/* Today Section */}
                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Today</Text>
                    <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>{todayTasks.length} tasks</Text>
                </View>
                {todayTasks.length === 0 && !loading ? (
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No tasks for today.</Text>
                ) : (
                    todayTasks.map(renderTask)
                )}

                {/* Tomorrow Section */}
                {tomorrowTasks.length > 0 && (
                    <>
                        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Tomorrow</Text>
                            <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>{tomorrowTasks.length} tasks</Text>
                        </View>
                        {tomorrowTasks.map(renderTask)}
                    </>
                )}

                <View style={{ height: 100 }} />
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
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
    },
    sectionCount: {
        fontSize: 13,
        color: '#6B7280',
    },
    taskCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    taskRow: {
        flexDirection: 'row',
    },
    checkboxColumn: {
        marginRight: 12,
        paddingTop: 4,
    },
    priorityDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        backgroundColor: 'transparent',
    },
    checkboxChecked: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#10B981',
        justifyContent: 'center',
        alignItems: 'center',
    },
    taskContent: {
        flex: 1,
    },
    taskTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 6,
    },
    taskTitleCompleted: {
        textDecorationLine: 'line-through',
        color: '#9CA3AF',
    },
    tagsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
        flexWrap: 'wrap',
    },
    priorityTag: {
        fontSize: 12,
        fontWeight: '500',
    },
    tagChip: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    tagText: {
        fontSize: 11,
        color: '#6B7280',
    },
    dueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    dueText: {
        fontSize: 12,
        color: '#6B7280',
    },
    emptyText: {
        fontSize: 14,
        color: '#9CA3AF',
        textAlign: 'center',
        marginTop: 20,
        marginBottom: 20,
        fontStyle: 'italic',
    },

    editButton: {
        padding: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
