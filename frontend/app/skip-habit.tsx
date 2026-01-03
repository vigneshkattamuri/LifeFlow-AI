import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

type SkipReason = 'low-energy' | 'no-time' | 'not-well' | 'conflict' | 'other';

const reasons = [
    { id: 'low-energy' as SkipReason, label: 'Low energy today', icon: 'battery-quarter' as const },
    { id: 'no-time' as SkipReason, label: 'Not enough time', icon: 'clock-o' as const },
    { id: 'not-well' as SkipReason, label: 'Not feeling well', icon: 'heart-o' as const },
    { id: 'conflict' as SkipReason, label: 'Schedule conflict', icon: 'calendar-times-o' as const },
    { id: 'other' as SkipReason, label: 'Other reason', icon: 'ellipsis-h' as const },
];

export default function SkipHabitScreen() {
    const router = useRouter();
    const [selectedReason, setSelectedReason] = useState<SkipReason | null>(null);
    const [notes, setNotes] = useState('');

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <FontAwesome name="arrow-left" size={20} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.title}>Skip Habit</Text>
                <View style={{ width: 20 }} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Habit Info Card */}
                <View style={styles.habitCard}>
                    <View style={styles.habitIcon}>
                        <FontAwesome name="check" size={24} color="#10B981" />
                    </View>
                    <Text style={styles.habitName}>Morning Meditation</Text>
                    <Text style={styles.habitDescription}>
                        It's okay to take a break. Let us know why you're skipping today.
                    </Text>
                </View>

                {/* Reason Selection */}
                <Text style={styles.sectionTitle}>Why are you skipping?</Text>
                <View style={styles.reasonsList}>
                    {reasons.map((reason) => (
                        <TouchableOpacity
                            key={reason.id}
                            style={[
                                styles.reasonCard,
                                selectedReason === reason.id && styles.reasonCardSelected,
                            ]}
                            onPress={() => setSelectedReason(reason.id)}
                        >
                            <FontAwesome
                                name={reason.icon}
                                size={18}
                                color={selectedReason === reason.id ? '#4A6CF7' : '#6B7280'}
                            />
                            <Text style={[
                                styles.reasonText,
                                selectedReason === reason.id && styles.reasonTextSelected,
                            ]}>
                                {reason.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Additional Notes */}
                <Text style={styles.notesLabel}>Additional notes (optional)</Text>
                <TextInput
                    style={styles.notesInput}
                    placeholder="Tell us more if you'd like..."
                    placeholderTextColor="#9CA3AF"
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                    numberOfLines={3}
                />

                {/* Remember Card */}
                <View style={styles.rememberCard}>
                    <View style={styles.rememberIcon}>
                        <FontAwesome name="heart" size={16} color="#F59E0B" />
                    </View>
                    <View style={styles.rememberContent}>
                        <Text style={styles.rememberTitle}>Remember</Text>
                        <Text style={styles.rememberText}>
                            Progress isn't about perfection. Taking a mindful break is part of the journey. Your streak will be preserved, and we'll help you get back on track.
                        </Text>
                    </View>
                </View>

                <View style={{ height: 120 }} />
            </ScrollView>

            {/* Bottom Buttons */}
            <View style={styles.bottomButtons}>
                <TouchableOpacity style={styles.skipButton} onPress={() => router.back()}>
                    <Text style={styles.skipButtonText}>Skip for Today</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={styles.goBackText}>Go Back</Text>
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
    habitCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    habitIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#ECFDF5',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    habitName: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 8,
    },
    habitDescription: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 12,
    },
    reasonsList: {
        gap: 10,
        marginBottom: 24,
    },
    reasonCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    reasonCardSelected: {
        borderColor: '#4A6CF7',
        backgroundColor: '#F0F4FF',
    },
    reasonText: {
        fontSize: 15,
        color: '#374151',
    },
    reasonTextSelected: {
        color: '#4A6CF7',
        fontWeight: '500',
    },
    notesLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#374151',
        marginBottom: 8,
        textDecorationLine: 'underline',
    },
    notesInput: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        fontSize: 15,
        color: '#1F2937',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        minHeight: 80,
        textAlignVertical: 'top',
        marginBottom: 24,
    },
    rememberCard: {
        backgroundColor: '#FEF3C7',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        borderWidth: 1,
        borderColor: '#FCD34D',
    },
    rememberIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    rememberContent: {
        flex: 1,
    },
    rememberTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#92400E',
        marginBottom: 4,
    },
    rememberText: {
        fontSize: 13,
        color: '#78350F',
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
    skipButton: {
        backgroundColor: '#4A6CF7',
        borderRadius: 12,
        padding: 18,
        alignItems: 'center',
        marginBottom: 12,
    },
    skipButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    goBackText: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
    },
});
