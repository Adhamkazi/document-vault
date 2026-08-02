import React from "react";
import {
  View,
  Text,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/src/constants/colors";
import { DocumentRecord } from "@/src/types/document";
import { getExpiryStatus } from "@/src/utils/dateUtils";


type Props = {
  documents: DocumentRecord[];
};


export default function ExpiringDocumentsCard({
  documents,
}: Props) {
  if (documents.length === 0) {
    return null;
  }

  return (
    <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIcon}>
              <Ionicons name="warning-outline" size={20} color="#D97706" />
            </View>

            <Text style={styles.title}>
              Expiring Documents
            </Text>
          </View>

          <View style={styles.countBadge}>
            <Text style={styles.countText}>
              {documents.length}
            </Text>
          </View>
        </View>

      {documents.map((document) => {
        const expiry = getExpiryStatus(
          document.expiryDate!
        );

        return (
          <View
            key={document.id}
            style={styles.item}
          >
            <View style={styles.iconTile}>
              <Ionicons
                name="document-text-outline"
                size={20}
                color={Colors.primary}
              />
            </View>

            <View style={styles.info}>
              <Text style={styles.name} numberOfLines={1}>
                {document.displayName ?? document.title}
              </Text>

              <View style={styles.metaRow}>
                <View style={styles.profileBadge}>
                  <Ionicons
                    name="person-outline"
                    size={11}
                    color="#6B7280"
                  />

                  <Text style={styles.profileText} numberOfLines={1}>
                    {document.profileName}
                  </Text>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: expiry.backgroundColor,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      {
                        color: expiry.color,
                      },
                    ]}
                  >
                    {expiry.label}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}



const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    marginTop: 18,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#FEF3C7",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    marginLeft: 10,
    fontSize: 17,
    fontWeight: "700",
    color: Colors.text,
  },
  countBadge: {
    backgroundColor: "#FEF3C7",
    minWidth: 30,
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  countText: {
    color: "#92400E",
    fontWeight: "700",
    fontSize: 13,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E7EB",
  },
  iconTile: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#EEF4FF",
    justifyContent: "center",
    alignItems: "center",
  },
  info: {
    marginLeft: 12,
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  profileBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  profileText: {
    marginLeft: 4,
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
    maxWidth: 90,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
});