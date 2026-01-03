import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Slider from '@react-native-community/slider';

const moods = ['😫', '😔', '😐', '🙂', '😊'];

export default function BaselineScreen() {
    const router = useRouter();
    const [energy, setEnergy] = useState(70);
    const [mood, setMood] = useState(4); // 0-4 index
    const [focus, setFocus] = useState(40);

    const getEnergyText = () => {
        if (energy > 66) return "You're feeling energized today";
        if (energy > 33) return "You're at a balanced energy level";
        return "You're feeling low on energy";
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
                    <View style={styles.dot} />
                    <View style={[styles.dot, styles.dotActive]} />
                </View>

                {/* Skip Button */}
                <TouchableOpacity onPress={() => router.replace('/(tabs)')}>
                    <Text style={styles.skipText}>Skip</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Title */}
                <Text style={styles.title}>How are you{'\n'}feeling today?</Text>

                {/* Subtitle */}
                <Text style={styles.subtitle}>
                    This helps us understand your <Text style={styles.subtitleHighlight}>baseline</Text> and adapt to your <Text style={styles.subtitleHighlight}>rhythm</Text>
                </Text>

                {/* Energy Level Card */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>Energy Level</Text>
                        <FontAwesome name="bolt" size={20} color="#F59E0B" />
                    </View>
                    <Slider
                        style={styles.slider}
                        minimumValue={0}
                        maximumValue={100}
                        value={energy}
                        onValueChange={setEnergy}
                        minimumTrackTintColor="#4A6CF7"
                        maximumTrackTintColor="#E5E7EB"
                        thumbTintColor="#4A6CF7"
                    />
                    <View style={styles.sliderLabels}>
                        <Text style={styles.sliderLabel}>Low</Text>
                        <Text style={styles.sliderLabel}>Medium</Text>
                        <Text style={styles.sliderLabel}>High</Text>
                    </View>
                    <Text style={styles.feedbackText}>{getEnergyText()}</Text>
                </View>

                {/* Mood Card */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>Mood</Text>
                        <Text style={styles.selectedMoodEmoji}>{moods[mood]}</Text>
                    </View>
                    <View style={styles.moodContainer}>
                        {moods.map((emoji, index) => (
                            <TouchableOpacity
                                key={index}
                                style={[
                                    styles.moodButton,
                                    mood === index && styles.moodButtonSelected,
                                ]}
                                onPress={() => setMood(index)}
                            >
                                <Text style={styles.moodEmoji}>{emoji}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Focus Capacity Card */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>Focus Capacity</Text>
                        <FontAwesome name="bullseye" size={20} color="#EF4444" />
                    </View>
                    <Slider
                        style={styles.slider}
                        minimumValue={0}
                        maximumValue={100}
                        value={focus}
                        onValueChange={setFocus}
                        minimumTrackTintColor="#4A6CF7"
                        maximumTrackTintColor="#E5E7EB"
                        thumbTintColor="#4A6CF7"
                    />
                    <View style={styles.sliderLabelsTwo}>
                        <Text style={styles.sliderLabel}>Scattered</Text>
                        <Text style={styles.sliderLabel}>Focused</Text>
                    </View>
                </View>
            </ScrollView>

            {/* Bottom Button */}
            <View style={styles.bottom}>
                <TouchableOpacity
                    style={styles.continueButton}
                    // onPress={() => router.push('/onboarding/schedule')}
                    onPress={async () => {
                        try {
                            const { data: { user } } = await supabase.auth.getUser();
                            if (user) {
                                // Create today's date string YYYY-MM-DD
                                const today = new Date().toISOString().split('T')[0];

                                const { error } = await supabase
                                    .from('daily_metrics')
                                    .upsert({
                                        user_id: user.id,
                                        date: today,
                                        energy_level: Math.round(energy),
                                        mood_score: mood,
                                        focus_level: Math.round(focus)
                                    }, { onConflict: 'user_id, date' });

                                if (error) console.error('Error saving baseline:', error);
                            }
                        } catch (e) {
                            console.error('Error in baseline:', e);
                        }
                        router.push('/onboarding/schedule');
                    }}
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
        marginBottom: 24,
        lineHeight: 20,
    },
    subtitleHighlight: {
        color: '#4A6CF7',
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
    },
    slider: {
        width: '100%',
        height: 40,
    },
    sliderLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: -8,
    },
    sliderLabelsTwo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: -8,
    },
    sliderLabel: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    feedbackText: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        marginTop: 12,
        fontStyle: 'italic',
    },
    moodContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
    },
    moodButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FEF3C7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    moodButtonSelected: {
        backgroundColor: '#FCD34D',
        transform: [{ scale: 1.1 }],
    },
    moodEmoji: {
        fontSize: 24,
    },
    selectedMoodEmoji: {
        fontSize: 24,
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
