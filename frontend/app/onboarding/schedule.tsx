import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import FontAwesome from '@expo/vector-icons/FontAwesome';

type ProductiveTime = 'morning' | 'afternoon' | 'evening';
type WorkSchedule = '9-5' | 'flexible';

export default function ScheduleScreen() {
    const router = useRouter();
    const [productiveTime, setProductiveTime] = useState<ProductiveTime>('morning');
    const [wakeUpHour, setWakeUpHour] = useState(7);
    const [wakeUpMinute, setWakeUpMinute] = useState(0);
    const [workSchedule, setWorkSchedule] = useState<WorkSchedule>('9-5');

    const formatTime = () => {
        const hour = wakeUpHour % 12 || 12;
        const period = wakeUpHour < 12 ? 'AM' : 'PM';
        const min = wakeUpMinute.toString().padStart(2, '0');
        return `${hour}:${min} ${period}`;
    };

    const adjustTime = (direction: 'up' | 'down') => {
        if (direction === 'up') {
            if (wakeUpMinute === 45) {
                if (wakeUpHour < 11) {
                    setWakeUpHour(prev => prev + 1);
                    setWakeUpMinute(0);
                }
            } else {
                setWakeUpMinute(prev => prev + 15);
            }
        } else {
            if (wakeUpMinute === 0) {
                if (wakeUpHour > 4) {
                    setWakeUpHour(prev => prev - 1);
                    setWakeUpMinute(45);
                }
            } else {
                setWakeUpMinute(prev => prev - 15);
            }
        }
    };

    const productiveOptions = [
        { id: 'morning' as ProductiveTime, label: 'Morning (6am - 12pm)', icon: 'sun-o' as const, color: '#F59E0B' },
        { id: 'afternoon' as ProductiveTime, label: 'Afternoon (12pm - 6pm)', icon: 'sun-o' as const, color: '#F97316' },
        { id: 'evening' as ProductiveTime, label: 'Evening (6pm - 12am)', icon: 'moon-o' as const, color: '#8B5CF6' },
    ];

    return (
        <View style={styles.container}>
            {/* Top Bar */}
            <View style={styles.topBar}>
                <TouchableOpacity onPress={() => router.back()}>
                    <FontAwesome name="arrow-left" size={20} color="#1F2937" />
                </TouchableOpacity>

                {/* Progress Dots - all completed */}
                <View style={styles.progressDots}>
                    <View style={[styles.dot, styles.dotActive]} />
                    <View style={[styles.dot, styles.dotActive]} />
                    <View style={[styles.dot, styles.dotActive]} />
                </View>

                {/* Skip Button */}
                <TouchableOpacity onPress={() => router.replace('/(tabs)')}>
                    <Text style={styles.skipText}>Skip</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Title */}
                <Text style={styles.title}>When do you{'\n'}work best?</Text>

                {/* Subtitle */}
                <Text style={styles.subtitle}>
                    We'll optimize your schedule around your natural rhythm
                </Text>

                {/* Productive Time Section */}
                <Text style={styles.sectionTitle}>I'm most productive</Text>
                <View style={styles.card}>
                    {productiveOptions.map((option) => (
                        <TouchableOpacity
                            key={option.id}
                            style={styles.radioRow}
                            onPress={() => setProductiveTime(option.id)}
                        >
                            <View style={[
                                styles.radioCircle,
                                productiveTime === option.id && styles.radioCircleSelected,
                            ]}>
                                {productiveTime === option.id && <View style={styles.radioInner} />}
                            </View>
                            <FontAwesome name={option.icon} size={16} color={option.color} style={styles.radioIcon} />
                            <Text style={styles.radioLabel}>{option.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Wake-up Time Section */}
                <Text style={styles.sectionTitle}>Preferred wake-up time</Text>
                <View style={styles.card}>
                    <View style={styles.timeRow}>
                        <Text style={styles.timeLabel}>Time</Text>
                        <View style={styles.timePickerContainer}>
                            <TouchableOpacity
                                style={styles.timeButton}
                                onPress={() => adjustTime('down')}
                            >
                                <FontAwesome name="minus" size={12} color="#4A6CF7" />
                            </TouchableOpacity>
                            <Text style={styles.timeText}>{formatTime()}</Text>
                            <TouchableOpacity
                                style={styles.timeButton}
                                onPress={() => adjustTime('up')}
                            >
                                <FontAwesome name="plus" size={12} color="#4A6CF7" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Work Schedule Section */}
                <Text style={styles.sectionTitle}>Work schedule</Text>
                <View style={styles.card}>
                    <View style={styles.scheduleRow}>
                        <TouchableOpacity
                            style={[
                                styles.scheduleOption,
                                workSchedule === '9-5' && styles.scheduleOptionSelected,
                            ]}
                            onPress={() => setWorkSchedule('9-5')}
                        >
                            <View style={[
                                styles.radioCircle,
                                workSchedule === '9-5' && styles.radioCircleSelected,
                            ]}>
                                {workSchedule === '9-5' && <View style={styles.radioInner} />}
                            </View>
                            <Text style={styles.scheduleLabel}>9-5</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.scheduleOption,
                                workSchedule === 'flexible' && styles.scheduleOptionSelected,
                            ]}
                            onPress={() => setWorkSchedule('flexible')}
                        >
                            <View style={[
                                styles.radioCircle,
                                workSchedule === 'flexible' && styles.radioCircleSelected,
                            ]}>
                                {workSchedule === 'flexible' && <View style={styles.radioInner} />}
                            </View>
                            <Text style={styles.scheduleLabel}>Flexible</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>

            {/* Bottom Button */}
            <View style={styles.bottom}>
                <TouchableOpacity
                    style={styles.completeButton}
                    onPress={async () => {
                        const { data: { user } } = await supabase.auth.getUser();
                        if (user) {
                            await supabase
                                .from('profiles')
                                .update({ has_completed_onboarding: true })
                                .eq('id', user.id);
                        }
                        router.replace('/(tabs)');
                    }}
                >
                    <Text style={styles.completeText}>Complete Setup</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FE',
        paddingTop: 60,
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        marginBottom: 24,
    },
    progressDots: {
        flexDirection: 'row',
        gap: 6,
    },
    dot: {
        width: 24,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#E5E7EB',
    },
    dotActive: {
        backgroundColor: '#4A6CF7',
    },
    skipText: {
        fontSize: 14,
        color: '#4A6CF7',
        fontWeight: '500',
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 12,
        lineHeight: 36,
    },
    subtitle: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 28,
        lineHeight: 20,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6B7280',
        marginBottom: 12,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    radioRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
    },
    radioCircle: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: '#D1D5DB',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    radioCircleSelected: {
        borderColor: '#4A6CF7',
    },
    radioInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#4A6CF7',
    },
    radioIcon: {
        marginRight: 10,
    },
    radioLabel: {
        fontSize: 15,
        color: '#1F2937',
    },
    timeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },
    timeLabel: {
        fontSize: 15,
        color: '#6B7280',
    },
    timePickerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    timeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#EEF2FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    timeDisplay: {
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    timeText: {
        fontSize: 20,
        fontWeight: '600',
        color: '#1F2937',
        minWidth: 80,
        textAlign: 'center',
    },
    scheduleRow: {
        flexDirection: 'row',
        gap: 16,
    },
    scheduleOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    scheduleOptionSelected: {
        borderColor: '#4A6CF7',
        backgroundColor: '#F0F4FF',
    },
    scheduleLabel: {
        fontSize: 15,
        color: '#1F2937',
        marginLeft: 8,
    },
    bottom: {
        padding: 24,
        paddingBottom: 40,
    },
    completeButton: {
        backgroundColor: '#4A6CF7',
        borderRadius: 12,
        padding: 18,
        alignItems: 'center',
    },
    completeText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});
