import { View, Text, TouchableOpacity } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

interface TaskCardProps {
    task: any;
    onPress?: () => void;
    onComplete?: () => void;
}

export default function TaskCard({ task, onPress, onComplete }: TaskCardProps) {
    return (
        <TouchableOpacity onPress={onPress} className={`p-4 rounded-xl mb-3 shadow-sm border border-gray-100 dark:border-gray-800 flex-row items-center justify-between ${task.is_completed ? 'bg-gray-100 dark:bg-gray-900 opacity-60' : 'bg-white dark:bg-gray-800'}`}>
            <View>
                <Text className={`text-lg font-bold ${task.is_completed ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white'}`}>{task.title}</Text>
                <Text className="text-sm text-gray-500">Energy: {task.energy_required}</Text>
            </View>
            <TouchableOpacity onPress={onComplete} className={`h-10 w-10 items-center justify-center rounded-full ${task.is_completed ? 'bg-green-500' : 'bg-gray-100 dark:bg-gray-700'}`}>
                <FontAwesome name="check" size={20} color={task.is_completed ? 'white' : '#cbd5e1'} />
            </TouchableOpacity>
        </TouchableOpacity>
    );
}
