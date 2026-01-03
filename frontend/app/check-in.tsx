import { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView } from 'react-native';
import Slider from '@react-native-community/slider';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';

export default function CheckIn() {
    const [sleep, setSleep] = useState(7);
    const [mood, setMood] = useState(7);
    const [energy, setEnergy] = useState(7);
    const router = useRouter();

    async function submitCheckIn() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const today = new Date().toISOString().split('T')[0];

        const { error } = await supabase.from('daily_metrics').upsert({
            user_id: user.id,
            date: today,
            sleep_quality: sleep,
            mood_score: mood,
            energy_level: energy,
        } as any);

        if (error) Alert.alert('Error', error.message);
        else {
            router.back();
        }
    }

    const renderSlider = (label: string, value: number, setValue: (v: number) => void) => (
        <View className="mb-6 bg-gray-50 dark:bg-gray-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
            <View className="flex-row justify-between mb-2">
                <Text className="text-gray-700 dark:text-gray-300 font-bold text-lg">{label}</Text>
                <Text className="text-blue-600 font-bold text-lg">{value}/10</Text>
            </View>
            <Slider
                style={{ width: '100%', height: 40 }}
                minimumValue={1}
                maximumValue={10}
                step={1}
                value={value}
                onValueChange={setValue}
                minimumTrackTintColor="#2563EB"
                maximumTrackTintColor="#d1d5db"
                thumbTintColor="#2563EB"
            />
        </View>
    );

    return (
        <ScrollView className="flex-1 bg-white dark:bg-black p-6">
            <View className="mb-8">
                <Text className="text-3xl font-bold text-black dark:text-white mb-2">Daily Check-in</Text>
                <Text className="text-gray-500 text-base">Help LifeFlow adapt to your state.</Text>
            </View>

            {renderSlider("Sleep Quality", sleep, setSleep)}
            {renderSlider("Current Mood", mood, setMood)}
            {renderSlider("Energy Level", energy, setEnergy)}

            <TouchableOpacity
                className="bg-blue-600 p-4 rounded-lg items-center mt-4 mb-10"
                onPress={submitCheckIn}
            >
                <Text className="text-white font-bold text-lg">Start My Day</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}
