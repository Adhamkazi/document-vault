import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Colors } from "@/src/constants/colors";
import type { DocumentRecord } from "@/src/types/document";
import { SafeAreaView } from "react-native-safe-area-context";

type Props = {
  document: DocumentRecord;
  onPress: () => void;
  onMorePress: () => void;
};

export default function DocumentCard({
  document,
  onPress,
  onMorePress
}: Props) {
  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      onPress={onPress}
    >
      <View style={styles.info}>
        <Text style={styles.title}>
          {document.title}
        </Text>

        <Text style={styles.subtitle}>
          {document.documentNumber || "No Document Number"}
        </Text>
      </View>

      <View style={styles.iconContainer}>
        <TouchableOpacity
            onPress={onMorePress}
            hitSlop={10}
          >
            <Ionicons
                name="ellipsis-vertical"
                size={22}
                color="#777"
            />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 14,

    flexDirection: "row",
    alignItems: "center",

    marginBottom: 14,

    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },

  iconContainer: {
    width: 48,
    height: 48,

    borderRadius: 24,

    backgroundColor: "#EEF4FF",

    justifyContent: "center",
    alignItems: "center",

    marginRight: 14,
  },

  info: {
    flex: 1,
  },

  title: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
  },

  subtitle: {
    marginTop: 3,
    fontSize: 13,
    color: "#6B7280",
  },
});