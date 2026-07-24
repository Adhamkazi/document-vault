import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { Colors } from "@/src/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import { clearSession, getCurrentProfileId } from "@/src/utils/authStorage";
import { router } from "expo-router";
import React, { useCallback,useState} from "react";
import { useFocusEffect } from "expo-router";
import { getProfileById } from "@/src/database/profileRepository";


export default function DashboardHeader() {
  const hour = new Date().getHours();
  const [profileName, setProfileName] = useState("User");

  let greeting = "Good Evening";

  if (hour < 12) greeting = "Good Morning";
  else if (hour < 17) greeting = "Good Afternoon";

  useFocusEffect(
    useCallback(() => {
      async function loadProfile() {
        const profileId =
          await getCurrentProfileId();

        if (!profileId) return;

        const profile =
          getProfileById(profileId);

        if (profile) {
          setProfileName(profile.name);
        }
      }

      loadProfile();
    }, [])
  );

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            await clearSession();
            router.replace("/(auth)/login");
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>
            {greeting}  {profileName}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={22} color="#EF4444" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.subtitle}>
        Securely store and manage all your important documents in one place.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 30,
  },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  greeting: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.text,
  },

  title: {
  marginTop: 6,
  fontSize: 15,
  lineHeight: 22,
  color: Colors.subtitle,
},

  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },

  logoutText: {
    color: "#EF4444",
    fontWeight: "600",
    fontSize: 14,
  },

  subtitle: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.subtitle,
  },
});
