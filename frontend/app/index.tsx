import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

export default function WelcomeScreen() {
    const router = useRouter();

    return (
        <View style={styles.container}>
            {/* Main Content */}
            <View style={styles.content}>
                {/* Brain Icon */}
                <View style={styles.iconContainer}>
                    <FontAwesome name="lightbulb-o" size={48} color="#4A6CF7" />
                </View>

                {/* Title */}
                <Text style={styles.title}>LifeFlow AI</Text>

                {/* Subtitle */}
                <Text style={styles.subtitle}>
                    Your intelligent companion{'\n'}for mindful growth
                </Text>
            </View>

            {/* Bottom Section - Arrow Only */}
            <View style={styles.bottom}>
                <TouchableOpacity
                    style={styles.arrowButton}
                    onPress={() => router.push('/(auth)/login')}
                >
                    <FontAwesome name="arrow-right" size={32} color="white" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FE',
        justifyContent: 'space-between',
        paddingVertical: 60,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconContainer: {
        width: 100,
        height: 100,
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
        marginBottom: 32,
    },
    title: {
        fontSize: 32,
        fontWeight: '700',
        color: '#1A1A2E',
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 24,
    },
    bottom: {
        alignItems: 'center',
        paddingBottom: 80,
    },
    arrowButton: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#4A6CF7',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#4A6CF7',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
});
