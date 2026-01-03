import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useTheme } from '../context/ThemeContext';
import { useState } from 'react';

export default function HelpSupportScreen() {
    const router = useRouter();
    const { colors, theme } = useTheme();

    const faqs = [
        {
            id: '1',
            question: 'How does the AI scheduling work?',
            answer: 'LifeFlow uses AI to analyze your tasks, priorities, and energy levels to suggest the best times for deep work and breaks.'
        },
        {
            id: '2',
            question: 'Can I sync with Google Calendar?',
            answer: 'Not yet, but we are working on calendar integrations for the next major update!'
        },
        {
            id: '3',
            question: 'how are my habits tracked?',
            answer: 'Habits are tracked daily. You can mark them as complete from the Habits tab or the Plan timeline. Trends are analyzed weekly.'
        },
        {
            id: '4',
            question: 'Is my data private?',
            answer: 'Yes, your personal data is stored securely. We only use anonymized metrics for AI pattern analysis.'
        }
    ];

    const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

    const toggleFaq = (id: string) => {
        setExpandedFaq(prev => prev === id ? null : id);
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <FontAwesome name="arrow-left" size={20} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>Help & Support</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Contact Section */}
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={[styles.iconContainer, { backgroundColor: theme === 'dark' ? '#1E3A8A' : '#EEF2FF' }]}>
                        <FontAwesome name="support" size={24} color={colors.primary} />
                    </View>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>Need help?</Text>
                    <Text style={[styles.cardText, { color: colors.textSecondary }]}>
                        Our support team is available 24/7 to assist you.
                    </Text>
                    <TouchableOpacity
                        style={[styles.contactButton, { backgroundColor: colors.primary }]}
                        onPress={() => Linking.openURL('mailto:support@lifeflow.app')}
                    >
                        <Text style={styles.contactButtonText}>Contact Support</Text>
                    </TouchableOpacity>
                </View>

                {/* FAQ Section */}
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Frequently Asked Questions</Text>
                <View style={styles.faqList}>
                    {faqs.map((faq) => (
                        <TouchableOpacity
                            key={faq.id}
                            style={[
                                styles.faqItem,
                                { backgroundColor: colors.card, borderColor: colors.border }
                            ]}
                            onPress={() => toggleFaq(faq.id)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.faqHeader}>
                                <Text style={[styles.faqQuestion, { color: colors.text }]}>{faq.question}</Text>
                                <FontAwesome
                                    name={expandedFaq === faq.id ? "chevron-up" : "chevron-down"}
                                    size={14}
                                    color={colors.textSecondary}
                                />
                            </View>
                            {expandedFaq === faq.id && (
                                <Text style={[styles.faqAnswer, { color: colors.textSecondary }]}>
                                    {faq.answer}
                                </Text>
                            )}
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Footer Info */}
                <View style={styles.footer}>
                    <Text style={[styles.versionText, { color: colors.textSecondary }]}>LifeFlow v1.0.0</Text>
                    <TouchableOpacity>
                        <Text style={[styles.linkText, { color: colors.primary }]}>Terms of Service</Text>
                    </TouchableOpacity>
                    <TouchableOpacity>
                        <Text style={[styles.linkText, { color: colors.primary }]}>Privacy Policy</Text>
                    </TouchableOpacity>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 16,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
    },
    content: {
        flex: 1,
        padding: 20,
    },
    card: {
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        marginBottom: 32,
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
    },
    cardText: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 20,
    },
    contactButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
        width: '100%',
        alignItems: 'center',
    },
    contactButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
    },
    faqList: {
        gap: 12,
        marginBottom: 32,
    },
    faqItem: {
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
    },
    faqHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    faqQuestion: {
        fontSize: 15,
        fontWeight: '500',
        flex: 1,
        paddingRight: 16,
    },
    faqAnswer: {
        fontSize: 14,
        lineHeight: 20,
        marginTop: 12,
    },
    footer: {
        alignItems: 'center',
        gap: 12,
        marginBottom: 20,
    },
    versionText: {
        fontSize: 13,
    },
    linkText: {
        fontSize: 13,
        fontWeight: '500',
    }
});
