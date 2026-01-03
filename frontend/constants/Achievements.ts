import { ComponentProps } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';

export interface Achievement {
    id: string;
    title: string;
    description: string;
    icon: ComponentProps<typeof FontAwesome>['name'];
    color: string;
    bgColor: string;
    // Calculation criteria (simplified for MVP logic)
    criteria: {
        type: 'streak' | 'tasks_total' | 'habits_total' | 'days_active' | 'early_bird' | 'night_owl' | 'perfect_day';
        threshold: number;
    };
}

export const ACHIEVEMENTS: Achievement[] = [
    // Streak Badges
    {
        id: 'streak_3',
        title: 'Momentum',
        description: 'Maintain a 3-day streak',
        icon: 'fire',
        color: '#F59E0B',
        bgColor: '#FEF3C7',
        criteria: { type: 'streak', threshold: 3 }
    },
    {
        id: 'streak_7',
        title: 'Unstoppable',
        description: 'Reach a 7-day streak',
        icon: 'rocket',
        color: '#EF4444',
        bgColor: '#FEE2E2',
        criteria: { type: 'streak', threshold: 7 }
    },
    {
        id: 'streak_30',
        title: 'Legendary',
        description: '30-day streak. You are a machine!',
        icon: 'trophy',
        color: '#8B5CF6',
        bgColor: '#EDE9FE',
        criteria: { type: 'streak', threshold: 30 }
    },

    // Habit Badges
    {
        id: 'habits_3',
        title: 'Habitual',
        description: 'Create 3 active habits',
        icon: 'refresh',
        color: '#84CC16',
        bgColor: '#ECFCCB',
        criteria: { type: 'habits_total', threshold: 3 }
    },

    // Task Badges
    {
        id: 'tasks_1',
        title: 'First Step',
        description: 'Complete your first task',
        icon: 'check',
        color: '#10B981',
        bgColor: '#ECFDF5',
        criteria: { type: 'tasks_total', threshold: 1 }
    },
    {
        id: 'tasks_50',
        title: 'Task Master',
        description: 'Complete 50 tasks',
        icon: 'list-alt',
        color: '#3B82F6',
        bgColor: '#DBEAFE',
        criteria: { type: 'tasks_total', threshold: 50 }
    },
    {
        id: 'tasks_100',
        title: 'Century Club',
        description: 'Complete 100 tasks',
        icon: 'star',
        color: '#FBBF24',
        bgColor: '#FFFBEB',
        criteria: { type: 'tasks_total', threshold: 100 }
    },

    // Consistency Badges
    {
        id: 'active_7',
        title: 'Fan',
        description: 'Active for 7 days',
        icon: 'calendar',
        color: '#6B7280',
        bgColor: '#F3F4F6',
        criteria: { type: 'days_active', threshold: 7 }
    },
    {
        id: 'active_30',
        title: 'Regular',
        description: 'Active for 30 days',
        icon: 'calendar-check-o',
        color: '#4B5563',
        bgColor: '#E5E7EB',
        criteria: { type: 'days_active', threshold: 30 }
    },

    // Special Badges (Mocked logic for now or needs complex queries)
    {
        id: 'perfect_day',
        title: 'Perfect Day',
        description: 'Completed all tasks and habits in a day',
        icon: 'diamond',
        color: '#EC4899',
        bgColor: '#FCE7F3',
        criteria: { type: 'perfect_day', threshold: 1 }
    },
    {
        id: 'early_bird',
        title: 'Early Bird',
        description: 'Complete a task before 8 AM',
        icon: 'coffee',
        color: '#D97706',
        bgColor: '#FEF3C7',
        criteria: { type: 'early_bird', threshold: 1 }
    }
];
