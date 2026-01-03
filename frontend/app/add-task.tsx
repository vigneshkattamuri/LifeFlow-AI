import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { supabase } from '../lib/supabase';
import { generateSchedulingFeedback } from '../lib/ai';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../context/ThemeContext';

type Priority = 'high' | 'medium' | 'low';
type CognitiveLoad = 'light' | 'medium' | 'deep';
type DurationUnit = 'minutes' | 'hours';

const priorities = [
    { id: 'high' as Priority, label: 'High Priority', color: '#EF4444' },
    { id: 'medium' as Priority, label: 'Medium Priority', color: '#F59E0B' },
    { id: 'low' as Priority, label: 'Low Priority', color: '#4A6CF7' },
];

export default function AddTaskScreen() {
    const router = useRouter();
    const { theme, colors } = useTheme();
    const [taskTitle, setTaskTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState<Priority>('high');
    const [cognitiveLoad, setCognitiveLoad] = useState<CognitiveLoad>('light');
    const [duration, setDuration] = useState('1');
    const [durationUnit, setDurationUnit] = useState<DurationUnit>('hours');
    const [loading, setLoading] = useState(false);
    const { id } = useLocalSearchParams();
    const isEditing = !!id;

    useEffect(() => {
        if (isEditing) {
            fetchTaskDetails();
        }
    }, [id]);

    const fetchTaskDetails = async () => {
        try {
            const { data: task, error } = await supabase
                .from('tasks')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            if (task) {
                setTaskTitle(task.title);
                setDescription(task.description || '');
                setPriority(task.priority.toLowerCase() as Priority);
                setCognitiveLoad(task.cognitive_load || 'light');
                if (task.due_date) {
                    setDueDate(new Date(task.due_date));
                }

                // Duration parsing
                const min = task.duration || 30;
                if (min >= 60 && min % 60 === 0) {
                    setDuration((min / 60).toString());
                    setDurationUnit('hours');
                } else {
                    setDuration(min.toString());
                    setDurationUnit('minutes');
                }
            }
        } catch (e) {
            console.error('Error fetching task:', e);
            Alert.alert('Error', 'Could not load task details');
            router.back();
        }
    };

    // Date & Time State
    const [dueDate, setDueDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);

    // AI State
    const [aiFeedback, setAiFeedback] = useState('');
    const [analyzing, setAnalyzing] = useState(false);

    useEffect(() => {
        // Real-time check when task details change
        const checkSchedule = async () => {
            // Only analyze if we have at least a title or it's been a meaningful change
            if (!taskTitle && !description && priority === 'high') return;

            setAnalyzing(true);
            try {
                let durationMinutes = parseInt(duration) || 30;
                if (durationUnit === 'hours') durationMinutes *= 60;

                const feedback = await generateSchedulingFeedback({
                    title: taskTitle,
                    description,
                    priority,
                    cognitiveLoad,
                    dueDate,
                    durationMinutes
                });
                setAiFeedback(feedback);
            } catch (err) {
                console.log('AI Error', err);
            } finally {
                setAnalyzing(false);
            }
        };

        const timer = setTimeout(() => {
            checkSchedule();
        }, 5000); // Increased debounce to 5s as per user request to avoid rate limits

        return () => clearTimeout(timer);
    }, [taskTitle, description, priority, cognitiveLoad, dueDate, duration, durationUnit]);

    const onDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate) {
            // Keep the time from the current dueDate, only update the date part
            const newDate = new Date(dueDate);
            newDate.setFullYear(selectedDate.getFullYear());
            newDate.setMonth(selectedDate.getMonth());
            newDate.setDate(selectedDate.getDate());
            setDueDate(newDate);
        }
    };

    const onTimeChange = (event: any, selectedDate?: Date) => {
        setShowTimePicker(false);
        if (selectedDate) {
            // Keep the date from the current dueDate, only update the time part
            const newDate = new Date(dueDate);
            newDate.setHours(selectedDate.getHours());
            newDate.setMinutes(selectedDate.getMinutes());
            setDueDate(newDate);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <FontAwesome name="arrow-left" size={20} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>{isEditing ? 'Edit Task' : 'Add New Task'}</Text>
                {isEditing ? (
                    <TouchableOpacity onPress={() => {
                        Alert.alert("Delete Task", "Are you sure you want to delete this task?", [
                            { text: "Cancel", style: "cancel" },
                            {
                                text: "Delete",
                                style: "destructive",
                                onPress: async () => {
                                    setLoading(true);
                                    const { error } = await supabase.from('tasks').delete().eq('id', id);
                                    if (error) {
                                        Alert.alert("Error", error.message);
                                        setLoading(false);
                                    } else {
                                        router.replace('/(tabs)/tasks');
                                    }
                                }
                            }
                        ]);
                    }}>
                        <FontAwesome name="trash" size={20} color="#EF4444" />
                    </TouchableOpacity>
                ) : (
                    <View style={{ width: 20 }} />
                )}
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Task Title */}
                <Text style={[styles.label, { color: colors.textSecondary }]}>Task Title</Text>
                <TextInput
                    style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                    placeholder="e.g., Review project proposal"
                    placeholderTextColor={colors.textSecondary}
                    value={taskTitle}
                    onChangeText={setTaskTitle}
                />

                {/* Description */}
                <Text style={[styles.label, { color: colors.textSecondary }]}>Description (optional)</Text>
                <TextInput
                    style={[styles.input, styles.textArea, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                    placeholder="Add details about this task..."
                    placeholderTextColor={colors.textSecondary}
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={3}
                />

                {/* Priority */}
                <Text style={[styles.label, { color: colors.textSecondary }]}>Priority</Text>
                <View style={styles.priorityList}>
                    {priorities.map((p) => (
                        <TouchableOpacity
                            key={p.id}
                            style={[
                                styles.priorityOption,
                                { backgroundColor: colors.card, borderColor: colors.border },
                                priority === p.id && { borderColor: p.color, backgroundColor: p.color + '10' },
                            ]}
                            onPress={() => setPriority(p.id)}
                        >
                            <View style={[styles.radioCircle, { borderColor: p.color }]}>
                                {priority === p.id && (
                                    <View style={[styles.radioInner, { backgroundColor: p.color }]} />
                                )}
                            </View>
                            <Text style={[styles.priorityLabel, { color: p.color }]}>{p.label}</Text>
                            {priority === p.id && (
                                <FontAwesome name="check" size={16} color={p.color} style={styles.checkIcon} />
                            )}
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Cognitive Load */}
                <Text style={[styles.label, { color: colors.textSecondary }]}>Cognitive Load</Text>
                <View style={styles.cognitiveSelector}>
                    {(['light', 'medium', 'deep'] as CognitiveLoad[]).map((load) => (
                        <TouchableOpacity
                            key={load}
                            style={[
                                styles.cognitiveOption,
                                { backgroundColor: colors.card, borderColor: colors.border },
                                cognitiveLoad === load && { borderColor: '#4A6CF7', backgroundColor: theme === 'dark' ? '#1E3A8A' : '#F0F4FF' },
                            ]}
                            onPress={() => setCognitiveLoad(load)}
                        >
                            <Text style={[
                                styles.cognitiveText,
                                { color: colors.textSecondary },
                                cognitiveLoad === load && styles.cognitiveTextSelected,
                            ]}>
                                {load.charAt(0).toUpperCase() + load.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
                <Text style={[styles.helperText, { color: colors.textSecondary }]}>How much mental effort does this task require?</Text>

                {/* Due Date & Time */}
                <Text style={[styles.label, { color: colors.textSecondary }]}>Due Date & Time</Text>
                <View style={styles.dateTimeRow}>
                    <TouchableOpacity
                        style={[styles.dateButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                        onPress={() => setShowDatePicker(true)}
                    >
                        <FontAwesome name="calendar" size={16} color={colors.textSecondary} />
                        <Text style={[styles.dateButtonText, { color: colors.text }]}>{dueDate.toLocaleDateString()}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.timeButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                        onPress={() => setShowTimePicker(true)}
                    >
                        <FontAwesome name="clock-o" size={16} color={colors.textSecondary} />
                        <Text style={[styles.timeButtonText, { color: colors.text }]}>
                            {dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    </TouchableOpacity>
                </View>

                {showDatePicker && (
                    <DateTimePicker
                        value={dueDate}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={onDateChange}
                        themeVariant={theme}
                    />
                )}

                {showTimePicker && (
                    <DateTimePicker
                        value={dueDate}
                        mode="time"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={onTimeChange}
                        themeVariant={theme}
                    />
                )}

                {/* Estimated Duration */}
                <Text style={[styles.label, { color: colors.textSecondary }]}>Estimated Duration</Text>
                <View style={[styles.durationRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <TextInput
                        style={[styles.durationInput, { color: colors.text }]}
                        value={duration}
                        onChangeText={setDuration}
                        keyboardType="numeric"
                        placeholderTextColor={colors.textSecondary}
                    />
                    <TouchableOpacity onPress={() => setDurationUnit(prev => prev === 'hours' ? 'minutes' : 'hours')}>
                        <Text style={styles.durationUnit}>{durationUnit}</Text>
                        <Text style={[styles.durationHint, { color: colors.textSecondary }]}>(tap to switch)</Text>
                    </TouchableOpacity>
                </View>

                {/* AI Recommendation */}
                <View style={[styles.aiCard, { backgroundColor: theme === 'dark' ? '#1E3A8A' : '#EEF2FF', borderColor: theme === 'dark' ? '#1E40AF' : '#C7D2FE' }]}>
                    <View style={[styles.aiIcon, { backgroundColor: theme === 'dark' ? '#172554' : '#FFFFFF' }]}>
                        {analyzing ? (
                            <ActivityIndicator size="small" color="#4A6CF7" />
                        ) : (
                            <FontAwesome name="magic" size={20} color="#4A6CF7" />
                        )}
                    </View>
                    <View style={styles.aiContent}>
                        <Text style={[styles.aiTitle, { color: colors.text }]}>AI Insight</Text>
                        <Text style={[styles.aiDescription, { color: colors.textSecondary }]}>
                            {aiFeedback || "Select a priority and time to get smart scheduling advice."}
                        </Text>
                    </View>
                </View>

                <View style={{ height: 200 }} />
            </ScrollView>

            {/* Bottom Buttons */}
            <View style={[styles.bottomButtons, { backgroundColor: colors.background }]}>
                <TouchableOpacity
                    style={[styles.addButton, loading && { opacity: 0.7 }]}
                    onPress={async () => {
                        if (!taskTitle.trim()) {
                            Alert.alert('Error', 'Please enter a task title');
                            return;
                        }

                        setLoading(true);
                        try {
                            const { data: { user } } = await supabase.auth.getUser();
                            if (!user) throw new Error('No user found');

                            // Calculate total minutes
                            let durationMinutes = parseInt(duration) || 0;
                            if (durationUnit === 'hours') {
                                durationMinutes = durationMinutes * 60;
                            }
                            if (durationMinutes === 0) durationMinutes = 30; // Default min

                            let error;
                            if (isEditing) {
                                const { error: updateError } = await supabase
                                    .from('tasks')
                                    .update({
                                        title: taskTitle,
                                        description: description,
                                        priority: priority.charAt(0).toUpperCase() + priority.slice(1),
                                        cognitive_load: cognitiveLoad,
                                        duration: durationMinutes,
                                        due_date: dueDate.toISOString(),
                                    })
                                    .eq('id', id);
                                error = updateError;
                            } else {
                                const { error: insertError } = await supabase
                                    .from('tasks')
                                    .insert({
                                        user_id: user.id,
                                        title: taskTitle,
                                        description: description,
                                        priority: priority.charAt(0).toUpperCase() + priority.slice(1),
                                        cognitive_load: cognitiveLoad,
                                        duration: durationMinutes,
                                        due_date: dueDate.toISOString(),
                                        status: 'pending'
                                    });
                                error = insertError;
                            }

                            if (error) throw error;

                            router.replace('/(tabs)/tasks');
                        } catch (e: any) {
                            Alert.alert('Error', e.message);
                        } finally {
                            setLoading(false);
                        }
                    }}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <Text style={styles.addButtonText}>{isEditing ? 'Update Task' : 'Add Task'}</Text>
                    )}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
            </View>
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
    content: {
        flex: 1,
        paddingHorizontal: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: '#374151',
        marginBottom: 8,
        marginTop: 16,
    },
    input: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: '#1F2937',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    textArea: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    priorityList: {
        gap: 10,
    },
    priorityOption: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        borderWidth: 2,
        borderColor: '#E5E7EB',
    },
    radioCircle: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    priorityLabel: {
        fontSize: 15,
        fontWeight: '500',
        flex: 1,
    },
    checkIcon: {
        marginLeft: 'auto',
    },
    cognitiveSelector: {
        flexDirection: 'row',
        gap: 12,
    },
    cognitiveOption: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    cognitiveOptionSelected: {
        borderColor: '#4A6CF7',
        backgroundColor: '#F0F4FF',
    },
    cognitiveText: {
        fontSize: 14,
        color: '#6B7280',
    },
    cognitiveTextSelected: {
        color: '#4A6CF7',
        fontWeight: '500',
    },
    helperText: {
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 8,
        fontStyle: 'italic',
    },
    dateTimeRow: {
        flexDirection: 'row',
        gap: 12,
    },
    dateButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    dateButtonText: {
        fontSize: 15,
        color: '#1F2937',
    },
    timeButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    timeButtonText: {
        fontSize: 15,
        color: '#1F2937',
    },
    durationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        paddingHorizontal: 16,
    },
    durationInput: {
        flex: 1,
        fontSize: 24,
        fontWeight: '600',
        color: '#1F2937',
        paddingVertical: 16,
        textAlign: 'center',
    },
    durationUnit: {
        fontSize: 16,
        color: '#4A6CF7',
        fontWeight: '600',
        textAlign: 'right',
    },
    durationHint: {
        fontSize: 10,
        color: '#9CA3AF',
        textAlign: 'right',
    },
    aiCard: {
        backgroundColor: '#EEF2FF',
        borderRadius: 16,
        padding: 16,
        marginTop: 24,
        flexDirection: 'row',
        borderWidth: 1,
        borderColor: '#C7D2FE',
    },
    aiIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    aiContent: {
        flex: 1,
    },
    aiTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 4,
    },
    aiDescription: {
        fontSize: 13,
        color: '#6B7280',
        lineHeight: 18,
    },
    aiHighlight: {
        color: '#4A6CF7',
        fontWeight: '500',
    },
    bottomButtons: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#F8F9FE',
        padding: 20,
        paddingBottom: 40,
    },
    addButton: {
        backgroundColor: '#4A6CF7',
        borderRadius: 12,
        padding: 18,
        alignItems: 'center',
        marginBottom: 12,
    },
    addButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    cancelText: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
    },
});
