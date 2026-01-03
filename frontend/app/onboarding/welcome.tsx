import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

export default function WelcomeOnboarding() {
    const router = useRouter();

    return (
        <View style={styles.container}>
            {/* Top Bar */}
            <View style={styles.topBar}>
                {/* Progress Dots */}
                <View style={styles.progressDots}>
                    <View style={[styles.dot, styles.dotActive]} />
                    <View style={styles.dot} />
                    <View style={styles.dot} />
                </View>

                {/* Skip Button */}
                <TouchableOpacity onPress={() => router.replace('/(tabs)')}>
                    <Text style={styles.skipText}>Skip</Text>
                </TouchableOpacity>
            </View>

            {/* Main Content */}
            <View style={styles.content}>
                {/* Illustration Circle */}
                <View style={styles.illustrationContainer}>
                    <View style={styles.illustrationInner}>
                        <FontAwesome name="question" size={48} color="#4A6CF7" style={{ opacity: 0.5 }} />
                    </View>
                </View>

                {/* Title */}
                <Text style={styles.title}>Welcome to</Text>
                <Text style={styles.titleBrand}>LifeFlow AI</Text>

                {/* Description */}
                <Text style={styles.description}>
                    Your personal AI companion that understands your energy, adapts to your rhythm, and helps you build lasting habits
                </Text>
            </View>

            {/* Bottom Button */}
            <View style={styles.bottom}>
                <TouchableOpacity
                    style={styles.getStartedButton}
                    onPress={() => router.push('/onboarding/goals')}
                >
                    <Text style={styles.getStartedText}>Get Started</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FE',
        paddingHorizontal: 24,
        paddingTop: 60,
        paddingBottom: 40,
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 40,
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
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    illustrationContainer: {
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: '#EEF2FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 40,
    },
    illustrationInner: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 2,
        borderColor: '#4A6CF7',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 4,
    },
    titleBrand: {
        fontSize: 32,
        fontWeight: '700',
        color: '#4A6CF7',
        marginBottom: 20,
    },
    description: {
        fontSize: 15,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 24,
        paddingHorizontal: 16,
    },
    bottom: {
        paddingTop: 24,
    },
    getStartedButton: {
        backgroundColor: '#4A6CF7',
        borderRadius: 12,
        padding: 18,
        alignItems: 'center',
    },
    getStartedText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});
