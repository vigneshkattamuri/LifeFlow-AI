import { View, Text } from 'react-native';

export default function TwinScreen() {
    return (
        <View className="flex-1 items-center justify-center bg-white dark:bg-black">
            <Text className="text-xl font-bold text-black dark:text-white">Digital Twin</Text>
            <View className="h-[1px] my-[30px] w-[80%] bg-gray-200 dark:bg-gray-800" />
            <Text className="text-base text-gray-500">Coming soon...</Text>
        </View>
    );
}
