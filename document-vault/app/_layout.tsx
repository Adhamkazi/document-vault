import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useColorScheme } from '@/hooks/use-color-scheme';
import { initializeDatabase } from '@/src/database/migrations';
import Toast from "react-native-toast-message";
import { toastConfig } from "@/src/config/toastConfig";
import { registerForPushNotifications } from "@/src/services/notificationService";
import { AuthProvider } from '../src/context/AuthContext';
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { checkProfiles, cleanupDuplicateProfiles, cleanupProfiles } from '@/src/database/cleanUpFunctions';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [isDbReady, setIsDbReady] = useState(false);

//   useEffect(() => {
// // //   checkProfiles();
// cleanupProfiles()
//  cleanupDuplicateProfiles() 

//   },[]);

  useEffect(() => {
    async function setupApp() {
      try {
        initializeDatabase();
        await registerForPushNotifications();
        setIsDbReady(true);
      } catch (error) {
        console.log("❌ Database Init Error:", error);
      }
    }
    
    setupApp();
  }, []);

  // 4. Guard clause: Do not render the navigation stack until the DB is ready
  if (!isDbReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
         <BottomSheetModalProvider>
       <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="viewer" />
          <Stack.Screen
            name="modal"
            options={{
              presentation: "modal",
            }}
          />
        </Stack>
        <StatusBar style="auto" />
        <Toast config={toastConfig} />
        </BottomSheetModalProvider>
      </GestureHandlerRootView>
      </AuthProvider>
    </ThemeProvider>
  );
}