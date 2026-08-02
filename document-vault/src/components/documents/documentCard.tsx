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

  const displayTitle = document.documentTypeName || document.title;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={onPress}
    >
      <View style={styles.iconTile}>
        <Ionicons name="document-text-outline" size={22} color={Colors.primary} />
      </View>

      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {displayTitle}
        </Text>

        <Text style={styles.subtitle} numberOfLines={1}>
          {document.documentNumber || document.fileName || "No Document Number"}
        </Text>
      </View>

      <TouchableOpacity
        onPress={onMorePress}
        hitSlop={12}
        style={styles.moreButton}
      >
        <Ionicons name="ellipsis-horizontal" size={20} color={Colors.subtitle} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    padding: 14,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },

  iconTile: {
    width: 44,
    height: 44,
    borderRadius: 12,
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

  moreButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },
});