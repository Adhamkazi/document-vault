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
                <Ionicons
                    name="warning-outline"
                    size={22}
                    color="#F59E0B"
                />

                <Text style={styles.title}>
                    Expiring Documents
                </Text>
            </View>

            <Text style={styles.count}>
                {documents.length}
            </Text>
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
            <View style={styles.left}>
            <View style={styles.iconContainer}>
                <Ionicons
                    name="document-text-outline"
                    size={20}
                    color={Colors.primary}
                />
            </View>

              <View style={styles.info}>
                <Text style={styles.name}>
                 {document.displayName ?? document.title}
                </Text>

                <View style={styles.profileBadge}>
                  <Ionicons
                      name="person-outline"
                      size={11}
                      color="#6B7280"
                  />

                  <Text style={styles.profileText}>
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
    borderRadius: 18,
    padding: 18,

    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 2,
  },
  iconContainer: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: "#EEF4FF",
      justifyContent: "center",
      alignItems: "center",
  },
name: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
},
profile: {
    marginTop: 2,
    fontSize: 13,
    color: Colors.subtitle,
},
header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
},

headerLeft: {
    flexDirection: "row",
    alignItems: "center",
},
  type: {
    marginTop: 2,
    fontSize: 13,
    color: Colors.subtitle,
    },
count: {
    backgroundColor: "#FEF3C7",
    color: "#92400E",
    fontWeight: "700",
    paddingHorizontal: 10,
    paddingVertical: 5,

    borderRadius: 20,
},
  title: {
    marginLeft: 8,
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
  },

  item: {
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E7EB",
  },

  left: {
    flexDirection: "row",
    alignItems: "center",
  },

  info: {
    marginLeft: 12,
    flex: 1,
  },

  status: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "600",
  },
  profileBadge: {
    marginTop: 5,
    alignSelf: "flex-start",
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
},
statusBadge: {
    marginTop: 8,
    alignSelf: "flex-start",

    paddingHorizontal: 8,
    paddingVertical: 4,

    borderRadius: 20,
},

statusText: {
    fontSize: 12,
    fontWeight: "700",
},

});