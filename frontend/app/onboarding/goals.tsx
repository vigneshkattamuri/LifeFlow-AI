import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

type Goal = 'productivity' | 'habits' | 'balance' | 'wellness';

const goals = [
    {
        id: 'productivity' as Goal,
        title: 'Productivity',
        description: 'Get more done with focus and clarity',
        icon: 'rocket' as const,
        color: '#4A6CF7',
        bgColor: '#EEF2FF',
    },
    {
        id: 'habits' as Goal,
        title: 'Healthy Habits',
        description: 'Build routines that stick and thrive',
        icon: 'heart' as const,
        color: '#10B981',
        bgColor: '#ECFDF5',
    },
    {
        id: 'balance' as Goal,
        title: 'Life Balance',
        description: 'Find harmony between work and rest',
        icon: 'balance-scale' as const,
        color: '#3B82F6',
        bgColor: '#EFF6FF',
    },
    {
        id: 'wellness' as Goal,
        title: 'Mental Wellness',
        description: 'Reduce stress and improve mindfulness',
        icon: 'leaf' as const,
        color: '#8B5CF6',
        bgColor: '#F5F3FF',
    },
];

export default function GoalSelection() {
    const router = useRouter();
    const [selectedGoals, setSelectedGoals] = useState<Goal[]>(['productivity', 'balance']);

    const toggleGoal = (goalId: Goal) => {
        setSelectedGoals(prev =>
            prev.includes(goalId)
                ? prev.filter(id => id !== goalId)
                : [...prev, goalId]
        );
    };

    return (
        <View style={styles.container}>
            {/* Top Bar */}
            <View style={styles.topBar}>
                <TouchableOpacity onPress={() => router.back()}>
                    <FontAwesome name="arrow-left" size={20} color="#1F2937" />
                </TouchableOpacity>

                {/* Progress Dots */}
                <View style={styles.progressDots}>
                    <View style={styles.dot} />
                    <View style={[styles.dot, styles.dotActive]} />
                    <View style={styles.dot} />
                </View>

                {/* Skip Button */}
                <TouchableOpacity onPress={() => router.replace('/(tabs)')}>
                    <Text style={styles.skipText}>Skip</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Title */}
                <Text style={styles.title}>What matters most{'\n'}to you?</Text>

                {/* Subtitle */}
                <Text style={styles.subtitle}>
                    Select all that apply. We'll personalize your experience
                </Text>

                {/* Goal Cards */}
                <View style={styles.cardsContainer}>
                    {goals.map((goal) => {
                        const isSelected = selectedGoals.includes(goal.id);
                        return (
                            <TouchableOpacity
                                key={goal.id}
                                style={[
                                    styles.card,
                                    isSelected && styles.cardSelected,
                                ]}
                                onPress={() => toggleGoal(goal.id)}
                            >
                                <View style={[styles.iconContainer, { backgroundColor: goal.bgColor }]}>
                                    <FontAwesome name={goal.icon} size={20} color={goal.color} />
                                </View>
                                <View style={styles.cardContent}>
                                    <Text style={styles.cardTitle}>{goal.title}</Text>
                                    <Text style={styles.cardDescription}>{goal.description}</Text>
                                </View>
                                {isSelected && (
                                    <View style={styles.checkCircle}>
                                        <FontAwesome name="check" size={12} color="white" />
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>

            {/* Bottom Button */}
            <View style={styles.bottom}>
                <TouchableOpacity
                    style={styles.continueButton}
                    onPress={() => router.push('/onboarding/baseline')}
                >
                    <Text style={styles.continueText}>Continue</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
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
        marginBottom: 24,
        lineHeight: 20,
    },
    cardsContainer: {
        gap: 12,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
    },
    cardSelected: {
        borderColor: '#4A6CF7',
        backgroundColor: '#FAFAFF',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    cardContent: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 4,
    },
    cardDescription: {
        fontSize: 13,
        color: '#6B7280',
        lineHeight: 18,
    },
    checkCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#4A6CF7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    bottom: {
        padding: 24,
        paddingBottom: 40,
    },
    continueButton: {
        backgroundColor: '#4A6CF7',
        borderRadius: 12,
        padding: 18,
        alignItems: 'center',
    },
    continueText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});
