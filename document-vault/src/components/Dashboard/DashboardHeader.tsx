import React, { useCallback, useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/src/constants/colors";

import { Profile } from "@/src/types/profile";
import { getActiveProfile } from "@/src/services/profileService";
import { clearSession } from "@/src/utils/authStorage";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { router, useFocusEffect } from "expo-router";

export default function DashboardHeader() {
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);

  const loadProfiles = useCallback(async () => {
    try {
      const current = await getActiveProfile();
      setActiveProfile(current);
    } catch (err) {
      console.error("Failed to load active profile in header:", err);
    }
  }, []);

  // Reload on every focus so the badge/name reflect profiles switched via the
  // Family Members screen.
  useFocusEffect(
    useCallback(() => {
      loadProfiles();
    }, [loadProfiles])
  );

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            await clearSession();
            await GoogleSignin.signOut();
            await GoogleSignin.revokeAccess();
          } catch (error) {
            // SIGN_IN_REQUIRED just means there was no Google session to revoke
            // (already logged out) — expected, not an error.
            const msg = String((error as any)?.message ?? "");
            if (!msg.includes("SIGN_IN_REQUIRED")) {
              console.error("Google disconnect error:", error);
            }
          } finally {
            router.replace("/(auth)/login");
          }
        },
      },
    ]);
  };

  const isOwner = activeProfile?.isOwner === 1;
  const initial = (activeProfile?.name || "?").charAt(0).toUpperCase();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#EAF1FF", "#D8E6FF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.topRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>

          <View style={styles.greetingBlock}>
            <Text style={styles.greetingText}>Welcome back</Text>
            <Text style={styles.greetingName} numberOfLines={1}>
              {activeProfile?.name || "Your Vault"}
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleLogout}
            activeOpacity={0.8}
            style={styles.logoutButton}
            hitSlop={8}
          >
            <Ionicons name="log-out-outline" size={18} color="#DC2626" />
          </TouchableOpacity>
        </View>

        <View style={styles.metaRow}>
          {activeProfile && (
            <View style={styles.roleBadge}>
              <View
                style={[styles.roleDot, { backgroundColor: isOwner ? "#16A34A" : "#D97706" }]}
              />
              <Text style={styles.roleText}>
                {isOwner ? "Master Admin" : "Family Member"}
              </Text>
            </View>
          )}
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 22,
  },
  hero: {
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    shadowColor: "#1E40AF",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.primary,
  },
  greetingBlock: {
    flex: 1,
    marginLeft: 14,
  },
  greetingText: {
    fontSize: 13,
    color: Colors.subtitle,
  },
  greetingName: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.text,
    marginTop: 1,
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    gap: 8,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.85)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.2)",
  },
  roleDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#16A34A",
  },
  roleText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.subtitle,
  },
});
