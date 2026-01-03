import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import { generateHabitFeedback } from '../lib/ai';

type TimeOfDay = 'morning' | 'afternoon' | 'evening';
type Difficulty = 'easy' | 'medium' | 'hard';
type DurationUnit = 'minutes' | 'hours';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function AddHabitScreen() {
    const router = useRouter();
    const { theme, colors } = useTheme();

    // Form State
    const [habitName, setHabitName] = useState('');
    const [category, setCategory] = useState(''); // Text Input now
    const [frequencyType, setFrequencyType] = useState<'daily' | 'custom'>('daily');
    const [selectedDays, setSelectedDays] = useState<string[]>([]);
    const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('morning');
    const [duration, setDuration] = useState('15');
    const [durationUnit, setDurationUnit] = useState<DurationUnit>('minutes');
    const [difficulty, setDifficulty] = useState<Difficulty>('easy');
    const [aiFeedback, setAiFeedback] = useState('');

    const [loading, setLoading] = useState(false);
    const { id } = useLocalSearchParams();
    const isEditing = !!id;

    useEffect(() => {
        if (isEditing) {
            fetchHabitDetails();
        }
    }, [id]);

    const fetchHabitDetails = async () => {
        try {
            const { data: habit, error } = await supabase
                .from('habits')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            if (habit) {
                setHabitName(habit.title);
                setCategory(habit.category || '');
                setTimeOfDay(habit.time_of_day || 'morning');
                setDifficulty(habit.difficulty || 'easy');

                // Frequency Parsing
                const freq = habit.frequency;
                if (Array.isArray(freq)) {
                    if (freq.includes('daily') || freq.length === 7) {
                        setFrequencyType('daily');
                        setSelectedDays([]);
                    } else {
                        setFrequencyType('custom');
                        setSelectedDays(freq);
                    }
                }

                // Duration Parsing
                const min = habit.duration || 15;
                if (min >= 60 && min % 60 === 0) {
                    setDuration((min / 60).toString());
                    setDurationUnit('hours');
                } else {
                    setDuration(min.toString());
                    setDurationUnit('minutes');
                }
            }
        } catch (e) {
            console.error('Error fetching habit:', e);
            Alert.alert('Error', 'Could not load habit details');
            router.back();
        }
    };

    // AI Insight Generator
    useEffect(() => {
        const checkHabit = async () => {
            // Calculate Duration
            let durationMinutes = parseInt(duration) || 15;
            if (durationUnit === 'hours') durationMinutes *= 60;

            const insight = await generateHabitFeedback({
                title: habitName,
                category,
                frequencyType,
                selectedDays,
                timeOfDay,
                durationMinutes,
                difficulty
            });
            setAiFeedback(insight);
        };

        const timer = setTimeout(() => {
            checkHabit();
        }, 5000); // Increased debounce to 5s as per user request to avoid rate limits

        return () => clearTimeout(timer);
    }, [habitName, category, frequencyType, selectedDays, timeOfDay, duration, durationUnit, difficulty]);

    const toggleDay = (day: string) => {
        if (selectedDays.includes(day)) {
            setSelectedDays(selectedDays.filter(d => d !== day));
        } else {
            setSelectedDays([...selectedDays, day]);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <FontAwesome name="arrow-left" size={20} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>{isEditing ? 'Edit Habit' : 'Add New Habit'}</Text>
                {isEditing ? (
                    <TouchableOpacity onPress={() => {
                        Alert.alert("Delete Habit", "Are you sure you want to delete this habit? All history will be lost.", [
                            { text: "Cancel", style: "cancel" },
                            {
                                text: "Delete",
                                style: "destructive",
                                onPress: async () => {
                                    setLoading(true);
                                    const { error } = await supabase.from('habits').delete().eq('id', id);
                                    if (error) {
                                        Alert.alert("Error", "Could not delete habit. Logs might still be attached.");
                                        setLoading(false);
                                    } else {
                                        router.replace('/(tabs)/habits');
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
                {/* Habit Name */}
                <Text style={[styles.label, { color: colors.text }]}>Habit Name</Text>
                <TextInput
                    style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                    placeholder="e.g., Morning Yoga"
                    placeholderTextColor={colors.textSecondary}
                    value={habitName}
                    onChangeText={setHabitName}
                />

                {/* Category - NOW TEXT INPUT */}
                <Text style={[styles.label, { color: colors.text }]}>Category</Text>
                <TextInput
                    style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                    placeholder="e.g., Health, Work, Mindfulness"
                    placeholderTextColor={colors.textSecondary}
                    value={category}
                    onChangeText={setCategory}
                />

                {/* Frequency - NOW INTERACTIVE */}
                <Text style={[styles.label, { color: colors.text }]}>Frequency</Text>
                <View style={[styles.frequencyContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <TouchableOpacity
                        style={[styles.freqOption, frequencyType === 'daily' && { backgroundColor: theme === 'dark' ? '#374151' : '#EEF2FF' }]}
                        onPress={() => setFrequencyType('daily')}
                    >
                        <Text style={[styles.freqText, frequencyType === 'daily' ? { color: colors.primary, fontWeight: '600' } : { color: colors.textSecondary }]}>Daily</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.freqOption, frequencyType === 'custom' && { backgroundColor: theme === 'dark' ? '#374151' : '#EEF2FF' }]}
                        onPress={() => {
                            setFrequencyType('custom');
                            if (selectedDays.length === 0) setSelectedDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
                        }}
                    >
                        <Text style={[styles.freqText, frequencyType === 'custom' ? { color: colors.primary, fontWeight: '600' } : { color: colors.textSecondary }]}>Custom Days</Text>
                    </TouchableOpacity>
                </View>

                {frequencyType === 'custom' && (
                    <View style={styles.daysContainer}>
                        {DAYS_OF_WEEK.map((day) => {
                            const isSelected = selectedDays.includes(day);
                            return (
                                <TouchableOpacity
                                    key={day}
                                    style={[
                                        styles.dayBubble,
                                        { backgroundColor: isSelected ? colors.primary : colors.card, borderColor: isSelected ? colors.primary : colors.border }
                                    ]}
                                    onPress={() => toggleDay(day)}
                                >
                                    <Text style={[styles.dayText, { color: isSelected ? '#FFFFFF' : colors.textSecondary }, isSelected && styles.dayTextSelected]}>{day.charAt(0)}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}

                {/* Time of Day */}
                <Text style={[styles.label, { color: colors.text }]}>Time of Day</Text>
                <View style={styles.timeSelector}>
                    {(['morning', 'afternoon', 'evening'] as TimeOfDay[]).map((time) => (
                        <TouchableOpacity
                            key={time}
                            style={[
                                styles.timeOption,
                                { backgroundColor: colors.card, borderColor: colors.border },
                                timeOfDay === time && { borderColor: colors.primary, backgroundColor: theme === 'dark' ? 'rgba(74, 108, 247, 0.1)' : '#F0F4FF' },
                            ]}
                            onPress={() => setTimeOfDay(time)}
                        >
                            <Text style={[
                                styles.timeText,
                                { color: colors.textSecondary },
                                timeOfDay === time && { color: colors.primary, fontWeight: '500' },
                            ]}>
                                {time.charAt(0).toUpperCase() + time.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Duration - NOW WITH TOGGLE */}
                <Text style={[styles.label, { color: colors.text }]}>Duration</Text>
                <View style={[styles.durationRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <TextInput
                        style={[styles.durationInput, { color: colors.text }]}
                        value={duration}
                        onChangeText={setDuration}
                        keyboardType="numeric"
                    />
                    <TouchableOpacity onPress={() => setDurationUnit(prev => prev === 'minutes' ? 'hours' : 'minutes')}>
                        <Text style={[styles.durationUnit, { color: colors.primary }]}>{durationUnit}</Text>
                        <Text style={styles.durationHint}>(tap to switch)</Text>
                    </TouchableOpacity>
                </View>

                {/* Difficulty */}
                <Text style={[styles.label, { color: colors.text }]}>Difficulty</Text>
                <View style={styles.difficultySelector}>
                    {(['easy', 'medium', 'hard'] as Difficulty[]).map((diff) => (
                        <TouchableOpacity
                            key={diff}
                            style={[
                                styles.difficultyOption,
                                { backgroundColor: colors.card, borderColor: colors.border },
                                difficulty === diff && { borderColor: colors.primary, backgroundColor: theme === 'dark' ? 'rgba(74, 108, 247, 0.1)' : '#F0F4FF' },
                            ]}
                            onPress={() => setDifficulty(diff)}
                        >
                            <Text style={[
                                styles.difficultyText,
                                { color: colors.textSecondary },
                                difficulty === diff && { color: colors.primary, fontWeight: '500' },
                            ]}>
                                {diff.charAt(0).toUpperCase() + diff.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* AI Suggestion */}
                <View style={[styles.aiCard, { backgroundColor: theme === 'dark' ? '#374151' : '#EEF2FF', borderColor: theme === 'dark' ? '#4B5563' : '#C7D2FE' }]}>
                    <View style={[styles.aiIcon, { backgroundColor: theme === 'dark' ? '#1F2937' : '#FFFFFF' }]}>
                        <FontAwesome name="lightbulb-o" size={20} color={colors.primary} />
                    </View>
                    <View style={styles.aiContent}>
                        <Text style={[styles.aiTitle, { color: colors.text }]}>AI Suggestion</Text>
                        <Text style={[styles.aiDescription, { color: colors.textSecondary }]}>
                            {aiFeedback || "Enter habit details to get AI suggestions."}
                        </Text>
                    </View>
                </View>

                <View style={{ height: 200 }} />
            </ScrollView>

            {/* Bottom Buttons */}
            <View style={[styles.bottomButtons, { backgroundColor: colors.background }]}>
                <TouchableOpacity
                    style={[styles.createButton, loading && { opacity: 0.7 }, { backgroundColor: colors.primary }]}
                    onPress={async () => {
                        if (!habitName.trim()) {
                            Alert.alert('Error', 'Please enter a habit name');
                            return;
                        }
                        if (!category.trim()) {
                            Alert.alert('Error', 'Please enter a category');
                            return;
                        }
                        if (frequencyType === 'custom' && selectedDays.length === 0) {
                            Alert.alert('Error', 'Please select at least one day for custom frequency');
                            return;
                        }

                        setLoading(true);
                        try {
                            const { data: { user } } = await supabase.auth.getUser();
                            if (!user) throw new Error('No user found');

                            // Calculate Duration
                            let durationMinutes = parseInt(duration) || 15;
                            if (durationUnit === 'hours') durationMinutes *= 60;

                            // Determine Frequency Array
                            const frequencyArray = frequencyType === 'daily' ? ['daily'] : selectedDays;

                            let error;
                            if (isEditing) {
                                const { error: updateError } = await supabase
                                    .from('habits')
                                    .update({
                                        title: habitName,
                                        category: category,
                                        frequency: frequencyArray,
                                        time_of_day: timeOfDay,
                                        duration: durationMinutes,
                                        difficulty
                                    })
                                    .eq('id', id);
                                error = updateError;
                            } else {
                                const { error: insertError } = await supabase
                                    .from('habits')
                                    .insert({
                                        user_id: user.id,
                                        title: habitName,
                                        category: category,
                                        frequency: frequencyArray,
                                        time_of_day: timeOfDay,
                                        duration: durationMinutes,
                                        difficulty
                                    });
                                error = insertError;
                            }

                            if (error) throw error;

                            router.replace('/(tabs)/habits');
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
                        <Text style={styles.createButtonText}>{isEditing ? 'Update Habit' : 'Create Habit'}</Text>
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
    frequencyContainer: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 4,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginBottom: 10,
    },
    freqOption: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 8,
    },
    freqOptionSelected: {
        backgroundColor: '#EEF2FF',
    },
    freqText: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
    },
    freqTextSelected: {
        color: '#4A6CF7',
        fontWeight: '600',
    },
    daysContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    dayBubble: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    dayBubbleSelected: {
        backgroundColor: '#4A6CF7',
        borderColor: '#4A6CF7',
    },
    dayText: {
        fontSize: 14,
        color: '#6B7280',
    },
    dayTextSelected: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    timeSelector: {
        flexDirection: 'row',
        gap: 12,
    },
    timeOption: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    timeOptionSelected: {
        borderColor: '#4A6CF7',
        backgroundColor: '#F0F4FF',
    },
    timeText: {
        fontSize: 14,
        color: '#6B7280',
    },
    timeTextSelected: {
        color: '#4A6CF7',
        fontWeight: '500',
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
    difficultySelector: {
        flexDirection: 'row',
        gap: 12,
    },
    difficultyOption: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    difficultyOptionSelected: {
        borderColor: '#4A6CF7',
        backgroundColor: '#F0F4FF',
    },
    difficultyText: {
        fontSize: 14,
        color: '#6B7280',
    },
    difficultyTextSelected: {
        color: '#4A6CF7',
        fontWeight: '500',
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
    bottomButtons: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#F8F9FE',
        padding: 20,
        paddingBottom: 40,
    },
    createButton: {
        backgroundColor: '#4A6CF7',
        borderRadius: 12,
        padding: 18,
        alignItems: 'center',
        marginBottom: 12,
    },
    createButtonText: {
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
