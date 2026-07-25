import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { formatDateSimple } from "@/src/utils/formatDate";
import type { DocumentRecord } from "@/src/types/document";

type Props = {
  document: DocumentRecord;
};

type ExpiryStatus = "expired" | "soon" | "valid" | "none";

const getExpiryStatus = (
  expiryDate?: string | null
): ExpiryStatus => {
  if (!expiryDate) return "none";

  const today = new Date();
  const expiry = new Date(expiryDate);

  const diffDays = Math.ceil(
    (expiry.getTime() - today.getTime()) /
      (1000 * 60 * 60 * 24)
  );

  if (diffDays < 0) return "expired";
  if (diffDays <= 30) return "soon";

  return "valid";
};

const expiryConfig: Record<
  ExpiryStatus,
  {
    label: string;
    color: string;
    icon: keyof typeof Ionicons.glyphMap;
  }
> = {
  expired: {
    label: "Expired",
    color: "#DC2626",
    icon: "close-circle-outline",
  },
  soon: {
    label: "Expiring Soon",
    color: "#D97706",
    icon: "warning-outline",
  },
  valid: {
    label: "Valid",
    color: "#16A34A",
    icon: "checkmark-circle-outline",
  },
  none: {
    label: "No Expiry",
    color: "#6B7280",
    icon: "infinite-outline",
  },
};

function InfoChip({
  icon,
  label,
  value,
  valueColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.chip}>
      <Ionicons
        name={icon}
        size={15}
        color="#2563EB"
      />

      <View style={styles.chipText}>
        <Text style={styles.chipLabel}>
          {label}
        </Text>

        <Text
          style={[
            styles.chipValue,
            valueColor
              ? { color: valueColor }
              : null,
          ]}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

export default function DocumentInfoCard({
  document,
}: Props) {
  const expiryStatus = getExpiryStatus(
    document.expiryDate
  );

  const expiry = expiryConfig[expiryStatus];

  const isImage =
    document.mimeType.startsWith("image");

  return (
    <>
      <LinearGradient
        colors={["#2563EB", "#7C3AED"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <View style={styles.fileTypePill}>
          <Ionicons
            name={
              isImage
                ? "image-outline"
                : "document-outline"
            }
            size={12}
            color="#FFF"
          />

          <Text style={styles.fileTypePillText}>
            {isImage ? "IMAGE" : "PDF"}
          </Text>
        </View>

        <Text style={styles.heroTitle}>
          {document.title}
        </Text>

        {document.documentNumber && (
          <Text style={styles.heroDocNumber}>
            {document.documentNumber}
          </Text>
        )}

        <View
          style={styles.expiryBadge}
        >
          <Ionicons
            name={expiry.icon}
            size={14}
            color="#FFF"
          />

          <Text style={styles.expiryBadgeText}>
            {expiry.label}
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.chipsContainer}>
        {document.issueDate && (
          <InfoChip
            icon="calendar-outline"
            label="Issue Date"
            value={formatDateSimple(
              document.issueDate
            )}
          />
        )}

        {document.expiryDate && (
          <InfoChip
            icon="time-outline"
            label="Expiry"
            value={formatDateSimple(
              document.expiryDate
            )}
            valueColor={expiry.color}
          />
        )}

        {document.fileSize && (
          <InfoChip
            icon="archive-outline"
            label="File Size"
            value={`${(
              document.fileSize /
              1024 /
              1024
            ).toFixed(2)} MB`}
          />
        )}

        <InfoChip
          icon="refresh-outline"
          label="Last Updated"
          value={formatDateSimple(
            new Date(
              document.updatedAt ??
                document.createdAt
            )
              .toISOString()
              .split("T")[0]
          )}
        />
      </View>

      {document.notes && (
        <View style={styles.notesCard}>
          <View
            style={styles.notesTitleRow}
          >
            <Ionicons
              name="chatbox-ellipses-outline"
              size={16}
              color="#6B7280"
            />

            <Text style={styles.notesLabel}>
              Notes
            </Text>
          </View>

          <Text style={styles.notesText}>
            {document.notes}
          </Text>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#2563EB",
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    elevation: 8,
  },

  fileTypePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor:
      "rgba(255,255,255,0.2)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
    alignSelf: "flex-end",
    marginBottom: 16,
  },

  fileTypePillText: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  heroTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFF",
    textAlign: "center",
    marginBottom: 6,
  },

  heroDocNumber: {
    fontSize: 15,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "500",
    letterSpacing: 1,
    marginBottom: 16,
  },

  expiryBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 5,
    backgroundColor:
      "rgba(255,255,255,0.2)",
  },

  expiryBadgeText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "600",
  },

  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },

  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 8,
    flex: 1,
    minWidth: "45%",
  },

  chipText: {
    flex: 1,
  },

  chipLabel: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "500",
  },

  chipValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1F2937",
    marginTop: 1,
  },

  notesCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },

  notesTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },

  notesLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  notesText: {
    fontSize: 15,
    color: "#374151",
    lineHeight: 22,
  },
});