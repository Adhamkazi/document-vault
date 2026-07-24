import React from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Colors } from "@/src/constants/colors";
import type { DocumentType } from "@/src/types/documentType";

type Props = {
  item: DocumentType;
  selected: boolean;
  onPress: () => void;
};

export default function DocumentTypeItem({
  item,
  selected,
  onPress,
}: Props) {
  return (
    <TouchableOpacity
      style={[
        styles.container,
        selected && styles.selectedContainer,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.title,
          selected && styles.selectedTitle,
        ]}
      >
        {item.name}
      </Text>

      {selected && (
        <Ionicons
          name="checkmark"
          size={18}
          color={Colors.primary}
        />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 14,
    paddingHorizontal: 16,

    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",

    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },

  selectedContainer: {
    backgroundColor: "#EFF6FF",
  },

  title: {
    fontSize: 15,
    color: Colors.text,
  },

  selectedTitle: {
    color: Colors.primary,
    fontWeight: "700",
  },
});