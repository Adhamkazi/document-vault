import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Colors } from "@/src/constants/colors";
import type { Profile } from "@/src/types/profile";

type Props = {
  profile?: Profile;
  empty?: boolean;
  isCurrent?: boolean;
  onPress?: () => void;
  onAdd?: () => void;
};

export default function FamilyMemberCard({
  profile,
  empty,
  onPress,
  isCurrent,
  onAdd,
}: Props) {


  if (empty) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconCircle}>
          <Ionicons
            name="people-outline"
            size={40}
            color={Colors.primary}
          />
        </View>

        <Text style={styles.emptyTitle}>
          No Family Members
        </Text>

        <Text style={styles.emptySubtitle}>
          Add family members to securely manage
          their documents separately.
        </Text>

        <TouchableOpacity
          style={styles.addButton}
          onPress={onAdd}
          activeOpacity={0.85}
        >
          <Ionicons
            name="person-add-outline"
            size={20}
            color="#FFF"
          />

          <Text style={styles.addButtonText}>
            Add Family Member
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!profile) return null;

  const initial = (profile.name || "?").charAt(0).toUpperCase();

  return (
    <TouchableOpacity
      style={[styles.card, isCurrent && styles.cardCurrent]}
      activeOpacity={0.85}
      onPress={onPress}
    >
      <View style={styles.left}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>

        <View style={styles.textContainer}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {profile.name}
            </Text>

            {isCurrent && (
              <View style={styles.currentBadge}>
                <Text style={styles.currentText}>Active</Text>
              </View>
            )}
          </View>
          <Text style={styles.subtitle}>
            {profile.email || (profile.isOwner === 1 ? "Owner" : "Family Member")}
          </Text>
        </View>
      </View>

      <View style={styles.chevron}>
        <Ionicons
          name="chevron-forward"
          size={18}
          color={Colors.subtitle}
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,

    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",

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

  cardCurrent: {
    borderColor: "#BFDBFE",
    backgroundColor: "#F9FBFF",
  },

  left: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EEF4FF",
    justifyContent: "center",
    alignItems: "center",
  },

  avatarText: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.primary,
  },

  textContainer: {
    marginLeft: 14,
    flex: 1,
  },

  name: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
  },

  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: Colors.subtitle,
  },

  chevron: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F6FC",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  emptyContainer: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
    marginTop: 20,

    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#EEF4FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 6,
  },

  emptySubtitle: {
    textAlign: "center",
    color: Colors.subtitle,
    lineHeight: 20,
    marginBottom: 20,
  },

  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },

  addButtonText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 15,

  },
    nameRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  currentBadge: {
    marginLeft: 8,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },

  currentText: {
    color: "#15803D",
    fontSize: 11,
    fontWeight: "700",
  },
});