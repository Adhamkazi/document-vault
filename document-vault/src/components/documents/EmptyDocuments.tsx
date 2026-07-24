import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function EmptyDocuments() {
  return (
    <View style={styles.container}>
      <Ionicons
        name="folder-open-outline"
        size={70}
        color="#CFCFCF"
      />

      <Text style={styles.title}>
        No Documents Found
      </Text>

      <Text style={styles.subtitle}>
        Upload your first document to get started.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 120,
    alignItems: "center",
  },

  title: {
    marginTop: 18,
    fontSize: 20,
    fontWeight: "700",
  },

  subtitle: {
    marginTop: 8,
    color: "#777",
    textAlign: "center",
    paddingHorizontal: 30,
  },
});