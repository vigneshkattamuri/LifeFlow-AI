const tintColorLight = '#2f95dc';
const tintColorDark = '#fff';

export default {
  light: {
    text: '#111827',
    textSecondary: '#6B7280',
    background: '#F8F9FE',
    card: '#FFFFFF',
    border: '#E5E7EB',
    primary: '#4A6CF7',
    tint: tintColorLight,
    tabIconDefault: '#9CA3AF',
    tabIconSelected: tintColorLight,
    success: '#10B981',
    successBg: '#ECFDF5',
    warning: '#F59E0B',
    warningBg: '#FEF3C7',
  },
  dark: {
    text: '#F9FAFB',
    textSecondary: '#9CA3AF',
    background: '#111827', // Gray 900
    card: '#1F2937',      // Gray 800
    border: '#374151',    // Gray 700
    primary: '#60A5FA',   // Blue 400 (lighter for dark mode)
    tint: tintColorDark,
    tabIconDefault: '#6B7280',
    tabIconSelected: tintColorDark,
    success: '#34D399',
    successBg: '#064E3B',
    warning: '#FBBF24',
    warningBg: '#78350F',
  },
};
