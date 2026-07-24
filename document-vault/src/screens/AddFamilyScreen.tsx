import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  ActivityIndicator
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { addFamilyMember, updateFamilyMember } from "@/src/services/addFamilyService";
import { Colors } from "@/src/constants/colors";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { getProfileById } from "../database/profileRepository";
import {showSuccess} from "@/src/utils/toast";

export default function AddFamilyScreen() {
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const { profileId } = useLocalSearchParams();

  const isEdit = !!profileId;

  const handleSave = async () => {
  if (!name.trim()) {
    Alert.alert(
      "Validation",
      "Please enter the family member's name."
    );
    return;
  }
  try {
    setSaving(true);
    const result = isEdit
      ? await updateFamilyMember({
          id: profileId as string,
          name,
          email,
          phone,
          address,
        })
      : await addFamilyMember({
          name,
          email,
          phone,
          address,
        });
    if (!result.success) {
      Alert.alert(
        "Error",
        result.message ?? "Unable to save family member."
      );
      return;
    }
    showSuccess(
      isEdit
        ? "Family member updated successfully."
        : "Family member added successfully."
    );

    router.back();
  } catch (error) {
    console.error(error);
    Alert.alert(
      "Error",
      "Something went wrong."
    );
  } finally {
    setSaving(false);
  }
};

useEffect(() => {
  if (!profileId) return;
  const profile = getProfileById(profileId as string);
  if (!profile) return;
  setName(profile.name);
  setEmail(profile.email ?? "");
  setPhone(profile.phone ?? "");
  setAddress(profile.address ?? "");
}, [profileId]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
    <KeyboardAvoidingView
      style={styles.container}
      behavior={
        Platform.OS === "ios" ? "padding" : undefined
      }
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}

        <View style={styles.header}>
          <Text style={styles.title}>
              {isEdit
              ? "Edit Family Member"
              : "Add Family Member"}
          </Text>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => router.back()}
          >
            <Ionicons
              name="close"
              size={24}
              color={Colors.text}
            />
          </TouchableOpacity>
        </View>

        {/* Full Name */}

        <Text style={styles.label}>
          Full Name *
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Enter full name"
          placeholderTextColor="#9CA3AF"
          value={name}
          onChangeText={setName}
        />

        {/* Email */}

        <Text style={styles.label}>
          Email (Optional)
        </Text>

        <TextInput
          style={styles.input}
          placeholder="example@email.com"
          placeholderTextColor="#9CA3AF"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        {/* Phone */}

        <Text style={styles.label}>
          Phone Number (Optional)
        </Text>

        <TextInput
          style={styles.input}
          placeholder="9876543210"
          placeholderTextColor="#9CA3AF"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />

        {/* Address */}

        <Text style={styles.label}>
          Address (Optional)
        </Text>

        <TextInput
          style={[styles.input, styles.address]}
          placeholder="Enter address"
          placeholderTextColor="#9CA3AF"
          multiline
          textAlignVertical="top"
          value={address}
          onChangeText={setAddress}
        />

        {/* Buttons */}

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => router.back()}
          >
            <Text style={styles.cancelText}>
              Cancel
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.saveButton,
              saving && { opacity: 0.7 },
            ]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.saveText}>
              {isEdit ? "Update" : "Save"}
            </Text>
          )}
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
    backgroundColor: "#FFF",
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 24,
  },

  title: {
    fontSize: 26,
    fontWeight: "700",
    color: Colors.text,
  },

  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },

  label: {
    marginTop: 14,
    marginBottom: 6,
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },

  input: {
    height: 52,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 16,
    fontSize: 15,
    color: Colors.text,
  },

  address: {
    height: 100,
    paddingTop: 12,
  },

  dropdownHeader: {
    height: 52,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  dropdownText: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: "600",
  },

  dropdownList: {
    marginTop: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFF",
  },

  dropdownItem: {
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },

  dropdownItemSelected: {
    backgroundColor: "#EFF6FF",
  },

  dropdownItemText: {
    fontSize: 15,
    color: Colors.text,
  },

  dropdownItemTextSelected: {
    color: Colors.primary,
    fontWeight: "700",
  },

  footer: {
    flexDirection: "row",
    marginTop: 34,
    gap: 12,
  },

  cancelButton: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },

  cancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
  },

  saveButton: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },

  saveText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFF",
  },
});