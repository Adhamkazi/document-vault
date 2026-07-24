import React, { useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { Colors } from "@/src/constants/colors";
import type { DocumentType } from "@/src/types/documentType";

import DocumentTypeItem from "./DocumentTypeItem";

type Props = {
  documentTypes: DocumentType[];
  selectedTypeId: string;
  onSelect: (id: string) => void;
};

export default function DocumentTypeDropdown({
  documentTypes,
  selectedTypeId,
  onSelect,
}: Props) {
  const [visible, setVisible] = useState(false);

  const selectedType = documentTypes.find(
    (item) => item.id === selectedTypeId
  );

  return (
    <View>
      <Text style={styles.label}>
        Select Document Type *
      </Text>

      <TouchableOpacity
        style={styles.header}
        onPress={() => setVisible(!visible)}
      >
        <Text style={styles.headerText}>
          {selectedType?.name ?? "Select Type"}
        </Text>

        <Ionicons
          name={visible ? "chevron-up" : "chevron-down"}
          size={20}
          color={Colors.text}
        />
      </TouchableOpacity>

      {visible && (
        <View style={styles.list}>
          <FlatList
            data={documentTypes}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <DocumentTypeItem
                item={item}
                selected={item.id === selectedTypeId}
                onPress={() => {
                  onSelect(item.id);
                  setVisible(false);
                }}
              />
            )}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
    marginTop: 12,
  },

  header: {
    height: 52,

    borderWidth: 1,
    borderColor: "#E5E7EB",

    borderRadius: 12,

    paddingHorizontal: 16,

    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",

    backgroundColor: "#F9FAFB",
  },

  headerText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
  },

  list: {
    marginTop: 6,

    borderWidth: 1,
    borderColor: "#E5E7EB",

    borderRadius: 12,

    backgroundColor: "#FFF",

    maxHeight: 250,

    overflow: "hidden",
  },
});