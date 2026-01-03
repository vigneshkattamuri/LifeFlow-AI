import '../global.css';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { ThemeProvider as NavThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native'; // Rename to avoid conflict
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../context/AuthProvider';
import { ThemeProvider, useTheme } from '../context/ThemeContext'; // Import custom theme

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Start on the Welcome/Splash screen
  initialRouteName: 'index',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <ThemeProvider>
        <SafeAreaProvider>
          <RootLayoutNav />
        </SafeAreaProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

function RootLayoutNav() {
  const { theme } = useTheme(); // Use custom hook

  return (
    <NavThemeProvider value={theme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        <Stack.Screen name="add-habit" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="add-task" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="check-in" options={{ presentation: 'modal', title: 'Daily Check-in' }} />
        <Stack.Screen name="skip-habit" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="analytics" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="digital-twin" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="profile" options={{ presentation: 'card', headerTitle: 'Profile', headerShown: false }} />
        <Stack.Screen name="edit-profile" options={{ presentation: 'modal', headerShown: false }} />
      </Stack>
    </NavThemeProvider>
  );
}
