import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { Ionicons } from "@expo/vector-icons";
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
              name="index"
              options={{
                title: "Dashboard",
                tabBarIcon: ({ color,size }) => (
                <Ionicons name="home" size={size} color={color} />
                ),
              }}
            />
      <Tabs.Screen
        name="documents"
        options={{
          title: "Documents",
          tabBarIcon: ({ color,size }) => (
                <Ionicons name="folder" size={size} color={color} />
                ),
        }}
      />
      <Tabs.Screen
        name="family"
        options={{
          title: "Family",
          tabBarIcon: ({ color,size }) => (
                <Ionicons name="people" size={size} color={color} />
                ),
        }}
      />
       <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color,size }) => (
                <Ionicons name="settings" size={size} color={color} />
                ),
        }}
      />
    </Tabs>
  );
}
