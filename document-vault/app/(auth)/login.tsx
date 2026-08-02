import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

import { Colors } from "@/src/constants/colors";
import { router } from "expo-router";
import { loginUser } from "@/src/services/loginUser";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/src/context/AuthContext";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const { signInWithCredentials, signInWithGoogle } = useAuth();

  const handleLogin = async () => {
    if (!email.trim()) {
      Alert.alert("Validation", "Please enter your email.");
      return;
    }

    if (!password.trim()) {
      Alert.alert("Validation", "Please enter your password.");
      return;
    }

    try {
      setLoading(true);

      const result = await loginUser({
        email: email.trim().toLowerCase(),
        password,
      });

      if (result.success && result.userId && result.profileId) {
        await signInWithCredentials(result.userId, result.profileId);
        router.replace("/(tabs)/dashboard");
      } else {
        Alert.alert("Login Failed", result.message ?? "Unable to login.");
      }
    } catch (error) {
      console.error("Login error:", error);
      Alert.alert("Error", "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);
      const result = await signInWithGoogle();

      if (!result) {
        Alert.alert("Google Sign-In Failed", "Could not complete sign in with Google.");
        return;
      }

      if (result.needsOnboarding) {
        router.replace({
          pathname: "/(tabs)/dashboard" as const,
          params: {
            screen: "dashboard",
            email: result.email,
            showOnboarding: "true",
          },
        });
      } else {
        router.replace("/(tabs)/dashboard" as const);
      }
    } catch (error: any) {
      console.error("Google Sign-In error:", error);
      Alert.alert("Error", "An unexpected error occurred during Google Sign-In.");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={["#EEF4FF", Colors.background]}
        style={styles.background}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Brand */}
          <View style={styles.brandSection}>
            <LinearGradient
              colors={[Colors.primary, "#1E40AF"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoBadge}
            >
              <Ionicons name="lock-closed" size={34} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.brandTitle}>EzDocs - Document Vault</Text>
            <Text style={styles.brandTagline}>Your family document vault</Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            <Text style={styles.heading}>Welcome Back</Text>
            <Text style={styles.subtitle}>Login to access your documents.</Text>

            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color={Colors.subtitle} style={styles.inputIcon} />
              <TextInput
                placeholder="Email"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
                style={styles.input}
              />
            </View>

            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color={Colors.subtitle} style={styles.inputIcon} />
              <TextInput
                placeholder="Password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                autoCapitalize="none"
                value={password}
                onChangeText={setPassword}
                style={styles.input}
              />
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={handleLogin}
              disabled={loading || googleLoading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.buttonText}>Login</Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google Sign-In Button */}
            <TouchableOpacity
              style={styles.googleButton}
              onPress={handleGoogleSignIn}
              disabled={loading || googleLoading}
              activeOpacity={0.85}
            >
              {googleLoading ? (
                <ActivityIndicator color="#333" />
              ) : (
                <>
                  <Ionicons name="logo-google" size={20} color="#4285F4" style={styles.googleIcon} />
                  <Text style={styles.googleButtonText}>Sign in with Google</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account?</Text>
            <TouchableOpacity onPress={() => router.replace("/(auth)/register")}>
              <Text style={styles.link}>Register</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  brandSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoBadge: {
    width: 76,
    height: 76,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: Colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.text,
    letterSpacing: 0.5,
  },
  brandTagline: {
    color: Colors.subtitle,
    fontSize: 17,
    marginTop: 4,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 24,
    padding: 22,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  heading: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.text,
  },
  subtitle: {
    color: Colors.subtitle,
    marginTop: 4,
    marginBottom: 20,
    fontSize: 16,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F4F6FB",
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 54,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "transparent",
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: "100%",
    color: Colors.text,
  },
  button: {
    height: 54,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 6,
    shadowColor: Colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  buttonText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 16,
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    marginHorizontal: 12,
    color: Colors.subtitle,
    fontWeight: "600",
    fontSize: 13,
  },
  googleButton: {
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: "#FFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  googleIcon: {
    marginRight: 10,
  },
  googleButtonText: {
    color: Colors.text,
    fontWeight: "600",
    fontSize: 16,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 26,
  },
  footerText: {
    color: Colors.subtitle,
  },
  link: {
    color: Colors.primary,
    fontWeight: "700",
    marginLeft: 6,
  },
});
