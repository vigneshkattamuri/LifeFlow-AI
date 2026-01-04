import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_KEY = process.env.EXPO_PUBLIC_AI_API_KEY;
const PROVIDER = process.env.EXPO_PUBLIC_AI_PROVIDER || 'gemini';

// Mock Data for fallback/testing
const MOCK_INSIGHTS = [
    "⚡ High productivity window detected! Schedule deep work now.",
    "🌙 Late night detected. Consider a lighter cognitive load.",
    "🚀 You're on a streak! Keep the momentum going.",
    "⚠️ High cognitive load for this time. Take breaks.",
    "📅 Perfect timing for this priority level."
];

// Simple in-memory cache
const AI_CACHE = new Map<string, string>();

export const generateInsight = async (prompt: string) => {
    // Check Cache first
    if (AI_CACHE.has(prompt)) {
        console.log("⚡ using cached AI response");
        return AI_CACHE.get(prompt) as string;
    }

    // Check if we should use Mock Mode (e.g. if key is missing or testing)
    // For now, let's fallback to mock if API Request fails

    if (!API_KEY || API_KEY === 'YOUR_API_KEY_HERE') {
        console.warn("AI_API_KEY missing, returning mock data.");
        return MOCK_INSIGHTS[Math.floor(Math.random() * MOCK_INSIGHTS.length)];
    }
    console.log("Using API Key ending in:", API_KEY.slice(-6));

    try {
        if (PROVIDER === 'openai') {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`,
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [{ role: 'user', content: prompt }],
                }),
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            return data.choices?.[0]?.message?.content || "No insight generated.";
        } else {
            // Default to Gemini (Google) - Using Flash 2.5 (2026 Standard Model)
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                }),
            });
            const data = await response.json();

            if (data.error) {
                // Handle Rate Limiting gracefully
                if (data.error.code === 429 || data.error.status === 'RESOURCE_EXHAUSTED') {
                    console.warn("⚠️ AI Rate Limit Hit (429). Using Mock Data for now.");
                    console.warn("Details:", data.error.message);
                    return `(Mock) ${MOCK_INSIGHTS[Math.floor(Math.random() * MOCK_INSIGHTS.length)]}`;
                }

                console.error("Gemini API Error:", JSON.stringify(data.error, null, 2));
                // Fallback to Mock Data on API Error to keep UI working
                return `(Mock) ${MOCK_INSIGHTS[Math.floor(Math.random() * MOCK_INSIGHTS.length)]}`;
            }

            const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "No insight generated.";

            // Cache successful response
            if (!textResponse.startsWith('(Mock)')) {
                AI_CACHE.set(prompt, textResponse);
            }

            return textResponse;
        }
    } catch (error: any) {
        console.error('AI Service Exception:', error);
        return `(Mock) ${MOCK_INSIGHTS[Math.floor(Math.random() * MOCK_INSIGHTS.length)]}`;
    }
};

export const buildInsightPrompt = (stats: any) => {
    return `
    You are an AI Life Coach for the app "LifeFlow". 
    Analyze the user's activity from the LAST 30 DAYS on meaningful trends.
    
    Recent Data (30 Days):
    - Habits Completed: ${stats.recentHabits}
    - Tasks Completed: ${stats.recentTasks}
    - Avg Energy: ${stats.avgEnergy}/100
    - Mood: ${stats.mood}
    - Best Focus Window: ${stats.peakWindow}
    
    Provide a "Monthly Review":
    1. 📈 Trend Analysis (Are they consistent?).
    2. 💡 One specific tip to improve energy or output next month.
    3. ⭐ A short encouraging closing.
    
    Format nicely with bold headers and emojis. Keep it under 150 words.
    `;
};

export const generateSchedulingFeedback = async (
    taskDetails: {
        title: string;
        description: string;
        priority: string;
        cognitiveLoad: string;
        dueDate: Date; // Keep as Date object for easier handling
        durationMinutes: number;
    }
) => {
    // Safety check for Date object
    const dateObj = taskDetails.dueDate instanceof Date ? taskDetails.dueDate : new Date();

    // Format info for prompt
    const timeString = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateString = dateObj.toLocaleDateString();

    const prompt = `
    User is scheduling a new task:
    - Title: "${taskDetails.title}"
    - Description: "${taskDetails.description}"
    - Priority: ${taskDetails.priority}
    - Cognitive Load: ${taskDetails.cognitiveLoad}
    - Due: ${dateString} at ${timeString}
    - Duration: ${taskDetails.durationMinutes} minutes

    Context:
    - User has low energy around 3 PM and high energy at 10 AM.
    - Deep work is best done in the morning.
    - Long tasks (>60m) should be broken down if energy is low.

    Analyze this schedule.
    If the scheduling fits the user's energy/patterns, encourage them.
    If there's a mismatch (e.g. High Cognitive Load at 3 PM, or huge duration without breaks), warn them constructively.
    
    Output strictly one short sentence (max 20 words). Start with an emoji.
    `;

    return await generateInsight(prompt);
};

export const generateHabitFeedback = async (
    habitDetails: {
        title: string;
        category: string;
        frequencyType: string;
        selectedDays: string[];
        timeOfDay: string;
        durationMinutes: number;
        difficulty: string;
    }
) => {
    // Format info for prompt
    const frequency = habitDetails.frequencyType === 'daily'
        ? 'Daily'
        : `Custom Days (${habitDetails.selectedDays.join(', ')})`;

    const prompt = `
    User is planning a new habit:
    - Habit: "${habitDetails.title}"
    - Category: "${habitDetails.category}"
    - Frequency: ${frequency}
    - Time of Day: ${habitDetails.timeOfDay}
    - Duration: ${habitDetails.durationMinutes} minutes
    - Difficulty: ${habitDetails.difficulty}

    Context:
    - User has low energy around 3 PM and high energy at 10 AM.
    - Start small to build consistency.
    - Mornings are better for high-cognitive habits.
    
    Analyze this habit plan.
    If it looks solid and realistic, be encouraging.
    If it's too ambitious (e.g. "Hard" difficulty for 60 mins daily on a new habit), warn them to start smaller.
    
    Output strictly one short sentence (max 20 words). Start with an emoji.
    `;

    return await generateInsight(prompt);
};

export const generateDailyOutlook = async (energy: number, pendingTasks: number) => {
    const prompt = `
    User Energy: ${energy}/100.
    Pending Tasks: ${pendingTasks}.
    Time: ${new Date().toLocaleTimeString()}.
    
    Predict one potential obstacle OR opportunity for today.
    Output strictly one short sentence (max 12 words). Start with an emoji.
    Example: ⚡ High energy detected! Crush your hardest task now.
    `;
    return await generateInsight(prompt);
};

export const generateKeyPatterns = async (stats: any) => {
    const prompt = `
    Analyze this user's weekly data:
    - Habit Completions: ${stats.habitsCount}
    - Task Completions: ${stats.tasksCompleted}
    - Average Energy Level: ${stats.avgEnergy}/100
    - Mood: ${stats.mood}
    - Most Active Hour: ${stats.peakWindow}

    Identify 3 distinct, genuine patterns/insights.
    Return strictly a JSON array of 3 objects. No markdown formatting.
    Format:
    [
      { "title": "Pattern Title", "description": "One sentence description.", "icon": "font-awesome-icon-name", "color": "hex-code", "bgColor": "hex-code" }
    ]
    Example Icons: bolt, heart, check-circle, moon-o, sun-o, star, fire, clock-o, calendar, battery.
    Example Colors: #F59E0B (Orange), #10B981 (Green), #4A6CF7 (Blue), #EF4444 (Red), #8B5CF6 (Purple).
    `;
    try {
        const result = await generateInsight(prompt);

        // Handle Safe Failure
        if (result.startsWith('(Mock)') || result.startsWith('No insight')) {
            throw new Error("AI returned Mock/Error");
        }

        const cleanJson = result.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJson);

        // Sanitize Icons specifically for FontAwesome
        // AI often returns 'moon' but FontAwesome needs 'moon-o'
        const sanitized = parsed.map((p: any) => {
            let icon = p.icon;
            if (icon === 'moon') icon = 'moon-o';
            if (icon === 'sun') icon = 'sun-o';
            if (icon === 'clock') icon = 'clock-o';
            return { ...p, icon };
        });

        return sanitized;
    } catch (e) {
        console.warn("AI Pattern Gen Failed (JSON Parse), falling back to empty string to trigger local calc.");
        return "(Mock) Failed";
    }
};

export async function generateDigitalTwin(stats: any) {
    const prompt = `
    Analyze the following user stats and project their "Digital Twin" 6 months into the future.
    
    User Stats:
    - Habit Consistency: ${stats.consistency}%
    - Current Energy Avg: ${stats.energyLevel}/100
    - Tasks Completed: ${stats.tasksCompleted}
    - Mood Trend: ${stats.mood}
    
    Generate two personas in JSON format:
    1. "The Achiever": If they improve their consistency by 20%.
    2. "The Drifter": If they drop their consistency by 20%.
    
    Response Format (JSON ONLY):
    {
        "achiever": {
            "title": "Optimized You",
            "narrative": "A short paragraph describing their successful day 6 months from now.",
            "stats": { "energy": 90, "productivity": 95, "health": 85 }
        },
        "drifter": {
            "title": "Stagnant You",
            "narrative": "A short paragraph describing a sluggish day 6 months from now.",
            "stats": { "energy": 40, "productivity": 50, "health": 60 }
        }
    }
    `;

    try {
        const result = await generateInsight(prompt);

        // Handle Mock/Error response gracefully
        if (result.startsWith('(Mock)') || result.startsWith('No insight')) {
            throw new Error("Received Mock/Error from AI");
        }

        // Clean markdown
        const cleanJson = result.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanJson);
    } catch (e) {
        console.error("Digital Twin Gen Error", e);
        // Fallback Mock
        return {
            achiever: {
                title: "Optimized You",
                narrative: "You wake up energized at 6 AM, having crushed your goals consistently. Your focus is razor-sharp.",
                stats: { energy: 90, productivity: 95, health: 88 }
            },
            drifter: {
                title: "Drifting You",
                narrative: "You struggle to get out of bed. Missed habits have piled up, leaving you feeling overwhelmed and drained.",
                stats: { energy: 45, productivity: 50, "health": 60 }
            }
        };
    }
}

export async function generateTwinNarrative(currentStats: any, optimizedStats: any, days: number) {
    // 1. Check Daily Cache
    const today = new Date().toISOString().split('T')[0];
    const cacheKey = `ai_twin_${days}_${today}`;

    try {
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached && !cached.startsWith('(Mock)')) {
            console.log(`⚡ Using persistent cache for Twin ${days} days`);
            return cached;
        }
    } catch (e) {
        // Ignore cache read errors
    }

    const prompt = `
    Context:
    comparing "Current User" vs "Optimized User" in ${days} days.
    
    Current Path:
    - Consistency: ${currentStats.consistency}% (Stagnant)
    - Burnout Risk: ${currentStats.burnout}
    
    Optimized Path:
    - Consistency: ${optimizedStats.consistency}% (Improving)
    - Burnout Risk: ${optimizedStats.burnout}
    
    Task:
    Write a SHORT, CALM, INTELLIGENT explanation (max 2 sentences) of why the optimized path leads to better stability.
    Focus on the "Why" (e.g. compounding habits, stabilized energy).
    Do not mention specific numbers.
    `;

    try {
        const result = await generateInsight(prompt);

        // 2. Save to Daily Cache if valid
        if (!result.startsWith('(Mock)') && !result.startsWith('No insight')) {
            AsyncStorage.setItem(cacheKey, result).catch(err => console.error("Cache save failed", err));
            return result;
        }

        if (result.startsWith('(Mock)') || result.startsWith('No insight')) return "Small consistent actions today compound into massive stability tomorrow.";
        return result;
    } catch (e) {
        return "Small consistent actions today compound into massive stability tomorrow.";
    }
}
