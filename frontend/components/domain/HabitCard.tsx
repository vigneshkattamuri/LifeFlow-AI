import { View, Text, TouchableOpacity } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

interface HabitCardProps {
    habit: any;
    onPress?: () => void;
    onComplete?: () => void;
}

export default function HabitCard({ habit, onPress, onComplete }: HabitCardProps) {
    return (
        <TouchableOpacity onPress={onPress} className="bg-white dark:bg-gray-900 p-4 rounded-xl mb-3 shadow-sm border border-gray-100 dark:border-gray-800 flex-row items-center justify-between">
            <View>
                <Text className="text-lg font-bold text-gray-900 dark:text-white">{habit.title}</Text>
                <Text className="text-sm text-gray-500">
                    Energy: {habit.energy_cost}
                    {habit.priority ? ` • Priority: ${habit.priority}` : ''}
                </Text>
            </View>
            <TouchableOpacity onPress={onComplete} className="bg-gray-100 dark:bg-gray-800 h-10 w-10 items-center justify-center rounded-full active:bg-green-100">
                <FontAwesome name="check" size={20} color="#cbd5e1" />
            </TouchableOpacity>
        </TouchableOpacity>
    );
}
