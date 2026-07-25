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
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Colors } from "@/src/constants/colors";
import { registerUser } from "@/src/services/authService";

export default function RegisterScreen() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!fullName.trim()) {
      Alert.alert("Validation", "Enter your full name.");
      return;
    }

    if (!email.trim()) {
      Alert.alert("Validation", "Enter your email.");
      return;
    }

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      Alert.alert(
        "Validation",
        "Enter a valid email."
      );
      return;
    }

    if (!phone.trim()) {
      Alert.alert(
        "Validation",
        "Enter your phone number."
      );
      return;
    }

    if (phone.length < 10) {
      Alert.alert(
        "Validation",
        "Phone number is invalid."
      );
      return;
    }

    if (password.length < 8) {
      Alert.alert(
        "Validation",
        "Password must be at least 8 characters."
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(
        "Validation",
        "Passwords do not match."
      );
      return;
    }

    try {
      setLoading(true);

      const result = await registerUser({
        fullName,
        email,
        phone,
        password,
      });

      if (!result.success) {
        Alert.alert(
          "Registration Failed",
          result.message
        );
        return;
      }

      router.replace("/(tabs)/dashboard");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.logo}>
            EzDocs - Document Vault
          </Text>

          <Text style={styles.heading}>
            Create Account
          </Text>

          <Text style={styles.subtitle}>
            Register to securely manage your
            documents.
          </Text>

          <TextInput
            placeholder="Full Name"
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
          />

          <TextInput
            placeholder="Email"
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
            value={email}
            onChangeText={setEmail}
          />

          <TextInput
            placeholder="Phone Number"
            keyboardType="phone-pad"
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
          />

          <TextInput
            placeholder="Password"
            secureTextEntry
            style={styles.input}
            value={password}
            onChangeText={setPassword}
          />

          <TextInput
            placeholder="Confirm Password"
            secureTextEntry
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

          <TouchableOpacity
            style={styles.button}
            disabled={loading}
            onPress={handleRegister}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.buttonText}>
                Create Account
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Already have an account?
            </Text>

            <TouchableOpacity
              onPress={() =>
                router.replace("/(auth)/login")
              }
            >
              <Text style={styles.loginText}>
                Login
              </Text>
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
    backgroundColor: "#FFFFFF",
  },

  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },

  logo: {
    fontSize: 32,
    fontWeight: "700",
    color: Colors.primary,
    textAlign: "center",
    marginBottom: 8,
  },

  heading: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
  },

  subtitle: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 40,
  },

  input: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 55,
    marginBottom: 18,
    fontSize: 16,
  },

  button: {
    height: 55,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },

  buttonText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 16,
  },

  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 28,
  },

  footerText: {
    color: "#666",
  },

  loginText: {
    color: Colors.primary,
    fontWeight: "700",
    marginLeft: 6,
  },
});