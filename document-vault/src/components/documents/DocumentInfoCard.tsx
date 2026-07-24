import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { DocumentRecord } from "@/src/types/document";

type Props = {
  document: DocumentRecord;
};

export default function DocumentInfoCard({
  document,
}: Props) {
  return (
    <View style={styles.card}>
      <InfoRow
        label="Document Type"
        value={document.title}
      />

      <InfoRow
        label="Document Number"
        value={
          document.documentNumber ??
          "Not Available"
        }
      />

     {document.issueDate &&       
     <InfoRow
        label="Issue Date"
        value={
          document.issueDate ??
          "Not Available"
        }
      /> }


    {document.expiryDate &&     
       <InfoRow
        label="Expiry Date"
        value={
          document.expiryDate ??
          "Not Available"
        }
      />}

     {document.notes  &&
      <InfoRow
        label="Notes"
        value={
          document.notes ??
          "No Notes"
        }
      />
       }
     
    </View>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>
        {label}
      </Text>

      <Text style={styles.value}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    elevation: 2,
  },

  row: {
    marginBottom: 16,
  },

  label: {
    fontSize: 13,
    color: "#888",
    marginBottom: 4,
  },

  value: {
    fontSize: 16,
    fontWeight: "600",
  },
});