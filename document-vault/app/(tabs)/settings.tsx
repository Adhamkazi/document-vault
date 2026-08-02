import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import Constants from "expo-constants";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { Colors } from "@/src/constants/colors";
import { showSuccess, showError } from "@/src/utils/toast";

import {
  getMasterDriveAccount,
  connectMasterDrive,
  disconnectMasterDrive,
  syncAndRecoverFromDrive,
} from "@/src/services/driveSyncService";

import { getCurrentProfileId, getCurrentUserId } from "@/src/utils/authStorage";
import { getProfileById } from "@/src/database/profileRepository";
import { getUserById } from "@/src/database/userRepository";
import {
  getProfileStorageStats,
  getDocumentsByProfile,
} from "@/src/database/documentRepository";
import {
  getAppSettings,
  updateLastSyncedAt,
} from "@/src/database/appSettingsRepository";

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );
  const value = bytes / Math.pow(1024, i);
  return `${value >= 100 || i === 0 ? Math.round(value) : value.toFixed(1)} ${units[i]}`;
}

function formatRelativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

export default function SettingsScreen() {
  const [loading, setLoading] = useState(false);
  const [connectedEmail, setConnectedEmail] = useState<string | null>(null);
  const [isViewerOwner, setIsViewerOwner] = useState(false);

  const [storageStats, setStorageStats] = useState<{
    count: number;
    totalBytes: number;
  }>({ count: 0, totalBytes: 0 });
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [googleSignedIn, setGoogleSignedIn] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const [accountInfo, setAccountInfo] = useState<{
    name: string;
    email: string;
    isOwner: boolean;
    vaultName: string;
  }>({ name: "", email: "", isOwner: false, vaultName: "" });

  useEffect(() => {
    checkPermissionsAndDriveStatus();
    loadStorageInfo();
    loadAccountInfo();
    checkGoogleSession();
  }, []);

  const checkGoogleSession = async () => {
    try {
      await GoogleSignin.getTokens();
      setGoogleSignedIn(true);
    } catch (error) {
      setGoogleSignedIn(false);
    }
  };

  const handleConnectMemberSync = async () => {
    setConnecting(true);
    try {
      const result = await connectMasterDrive();
      if (result.success) {
        setGoogleSignedIn(true);
        showSuccess("Connected", "Your Google account is linked for syncing.");
      } else {
        showError(result.message || "Failed to connect Google.");
      }
    } catch (error) {
      console.error("Member Connect Error:", error);
      showError("Failed to connect Google.");
    } finally {
      setConnecting(false);
    }
  };

  const loadAccountInfo = async () => {
    try {
      const userId = await getCurrentUserId();
      const profileId = await getCurrentProfileId();

      const profile = profileId ? getProfileById(profileId) : null;
      const user = userId ? getUserById(userId) : null;

      setAccountInfo({
        name: profile?.name ?? "",
        email: profile?.email || user?.email || "",
        isOwner: profile?.isOwner === 1,
        vaultName: profile?.name ?? "",
      });
    } catch (error) {
      console.error("Failed to load account info:", error);
    }
  };

  const handleExportBackup = async () => {
    try {
      const profileId = await getCurrentProfileId();
      if (!profileId) {
        showError("No active vault to export.");
        return;
      }

      const docs = getDocumentsByProfile(profileId);
      const payload = {
        app: "EzDocs",
        exportedAt: new Date().toISOString(),
        profileId,
        count: docs.length,
        documents: docs.map((d) => ({
          id: d.id,
          title: d.title,
          displayName: d.displayName,
          documentNumber: d.documentNumber,
          documentTypeName: d.documentTypeName,
          issueDate: d.issueDate,
          expiryDate: d.expiryDate,
          fileName: d.fileName,
          notes: d.notes,
        })),
      };

      const fileName = `ezdocs-backup-${Date.now()}.json`;
      const uri = `${FileSystem.cacheDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(uri, JSON.stringify(payload, null, 2));

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/json",
          dialogTitle: "Export EzDocs backup",
        });
      } else {
        showError("Sharing is not available on this device.");
      }
    } catch (error) {
      console.error("Export Error:", error);
      showError("Failed to export backup.");
    }
  };

  const openLink = (url: string) => {
    Linking.openURL(url).catch(() => showError("Could not open link."));
  };

  const checkPermissionsAndDriveStatus = async () => {
    try {
      // 1. Verify if active user is Owner
      const currentProfileId = await getCurrentProfileId();
      if (currentProfileId) {
        const activeProfile = getProfileById(currentProfileId);
        setIsViewerOwner(activeProfile?.isOwner === 1);
      }

      // 2. Fetch Drive Account status
      const account = await getMasterDriveAccount();
      setConnectedEmail(account?.email ?? null);
    } catch (error) {
      console.error("Failed to check Drive status:", error);
    }
  };

  const handleConnectDrive = async () => {
    setLoading(true);
    try {
      const result = await connectMasterDrive();
      if (result.success && result.email) {
        setConnectedEmail(result.email);
        showSuccess("Connected", `Master Drive linked to ${result.email}`);
      } else {
        showError(result.message || "Failed to connect Google Drive.");
      }
    } catch (error) {
      console.error("Connect Drive Error:", error);
      showError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnectDrive = () => {
    Alert.alert(
      "Disconnect Master Drive",
      "Are you sure? Family members won't be able to sync documents until reconnected.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              await disconnectMasterDrive();
              setConnectedEmail(null);
              showSuccess("Disconnected", "Master Drive account removed.");
            } catch (error) {
              showError("Failed to disconnect Drive.");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const loadStorageInfo = async () => {
    try {
      const profileId = await getCurrentProfileId();
      const userId = await getCurrentUserId();

      if (profileId) {
        setStorageStats(getProfileStorageStats(profileId));
      }

      if (userId) {
        const settings = getAppSettings(userId);
        setLastSyncedAt(settings?.lastSyncedAt ?? null);
      }
    } catch (error) {
      console.error("Failed to load storage info:", error);
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      const userId = await getCurrentUserId();
      const profileId = await getCurrentProfileId();

      if (!userId) {
        showError("Could not identify your account. Please log in again.");
        return;
      }

      const result = await syncAndRecoverFromDrive(
        userId,
        profileId ?? undefined
      );

      if (userId) {
        await updateLastSyncedAt(userId, Date.now());
      }

      await loadStorageInfo();

      if (result?.recoveredCount && result.recoveredCount > 0) {
        showSuccess("Sync Complete", `${result.recoveredCount} document(s) synced.`);
      } else {
        showSuccess("Sync Complete", "Your documents are up to date.");
      }
    } catch (error) {
      console.error("Sync Now Error:", error);
      const msg = String((error as any)?.message ?? "");
      if (msg.includes("SIGN_IN_REQUIRED") || msg.includes("signInRequired")) {
        showError("Connect a Google account to sync your vault.");
      } else {
        showError("Sync failed. Check your network and Google sign-in.");
      }
    } finally {
      setSyncing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Storage & security settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionHeader}>Cloud Integration</Text>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconBadge}>
              <Ionicons name="logo-google" size={22} color={Colors.primary} />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>Master Google Drive</Text>
              <Text style={styles.cardSubtitle}>
                {connectedEmail
                  ? `Connected as ${connectedEmail}`
                  : "Primary storage vault for family documents"}
              </Text>
            </View>
          </View>

          {/* Conditional Controls based on isViewerOwner */}
          {loading ? (
            <ActivityIndicator style={{ marginTop: 16 }} color={Colors.primary} />
          ) : isViewerOwner ? (
            /* OWNER VIEW: Full Connect / Disconnect controls */
            connectedEmail ? (
              <View style={styles.statusRow}>
                <View style={styles.badgeSuccess}>
                  <Ionicons name="checkmark-circle" size={16} color="#166534" />
                  <Text style={styles.badgeTextSuccess}>Connected</Text>
                </View>

                <TouchableOpacity
                  style={styles.disconnectButton}
                  onPress={handleDisconnectDrive}
                >
                  <Text style={styles.disconnectText}>Disconnect</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.connectButton}
                onPress={handleConnectDrive}
                activeOpacity={0.8}
              >
                <Ionicons name="cloud-upload-outline" size={20} color="#FFF" />
                <Text style={styles.connectButtonText}>Connect Master Drive</Text>
              </TouchableOpacity>
            )
          ) : (
            /* NON-OWNER VIEW: Connect their own Google account if not signed in */
            googleSignedIn ? (
              <View style={styles.statusRow}>
                <View style={styles.badgeSuccess}>
                  <Ionicons name="checkmark-circle" size={16} color="#166534" />
                  <Text style={styles.badgeTextSuccess}>Storage Synced</Text>
                </View>
              </View>
            ) : (
              <View style={styles.connectWrap}>
                <Text style={styles.memberHint}>
                  Connect a Google account to sync your vault with the family folder.
                </Text>
                <TouchableOpacity
                  style={[styles.connectButton, connecting && { opacity: 0.7 }]}
                  onPress={handleConnectMemberSync}
                  disabled={connecting}
                  activeOpacity={0.8}
                >
                  {connecting ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Ionicons name="logo-google" size={20} color="#FFF" />
                  )}
                  <Text style={styles.connectButtonText}>
                    {connecting ? "Connecting..." : "Connect Google Account"}
                  </Text>
                </TouchableOpacity>
              </View>
            )
          )}
        </View>

        <Text style={styles.sectionHeader}>Storage & Sync</Text>

        <View style={styles.card}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{storageStats.count}</Text>
              <Text style={styles.statLabel}>Documents</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatBytes(storageStats.totalBytes)}</Text>
              <Text style={styles.statLabel}>Stored</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {lastSyncedAt ? formatRelativeTime(lastSyncedAt) : "Never"}
              </Text>
              <Text style={styles.statLabel}>Last Synced</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.syncButton, syncing && { opacity: 0.7 }]}
            onPress={handleSyncNow}
            disabled={syncing}
            activeOpacity={0.8}
          >
            {syncing ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Ionicons name="cloud-done-outline" size={20} color="#FFF" />
            )}
            <Text style={styles.syncButtonText}>
              {syncing ? "Syncing..." : "Sync Now"}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionHeader}>Account & Vault</Text>

        <View style={styles.card}>
          <View style={styles.accountRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {(accountInfo.name || "?").charAt(0).toUpperCase()}
              </Text>
            </View>

            <View style={styles.cardText}>
              <View style={styles.accountNameRow}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {accountInfo.name || "Your Account"}
                </Text>
                <View
                  style={[
                    styles.roleBadge,
                    { backgroundColor: accountInfo.isOwner ? "#DCFCE7" : "#FEF3C7" },
                  ]}
                >
                  <Text
                    style={[
                      styles.roleText,
                      { color: accountInfo.isOwner ? "#15803D" : "#B45309" },
                    ]}
                  >
                    {accountInfo.isOwner ? "Master Admin" : "Family Member"}
                  </Text>
                </View>
              </View>
              <Text style={styles.cardSubtitle}>
                {accountInfo.email || "No email linked"}
              </Text>
            </View>
          </View>

          <View style={styles.activeVaultRow}>
            <Ionicons name="shield-checkmark-outline" size={18} color={Colors.primary} />
            <Text style={styles.activeVaultText}>
              Active vault: {accountInfo.vaultName || "—"}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionHeader}>Content & Data</Text>

        <View style={styles.card}>
          <TouchableOpacity
            style={styles.cardHeader}
            onPress={handleExportBackup}
            activeOpacity={0.7}
          >
            <View style={styles.iconBadge}>
              <Ionicons name="download-outline" size={22} color={Colors.primary} />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>Export backup</Text>
              <Text style={styles.cardSubtitle}>
                Share a copy of this vault's document list
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.subtitle} />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionHeader}>About</Text>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconBadge}>
              <Ionicons name="shield-checkmark" size={22} color={Colors.primary} />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>EzDocs</Text>
              <Text style={styles.cardSubtitle}>
                Version {Constants.expoConfig?.version ?? "1.0.0"}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => openLink("https://ezdocs.example.com/privacy")}
            activeOpacity={0.7}
          >
            <Ionicons name="document-lock-outline" size={20} color={Colors.subtitle} />
            <Text style={styles.linkText}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.subtitle} />
          </TouchableOpacity>

          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => openLink("https://ezdocs.example.com/terms")}
            activeOpacity={0.7}
          >
            <Ionicons name="document-text-outline" size={20} color={Colors.subtitle} />
            <Text style={styles.linkText}>Terms of Service</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.subtitle} />
          </TouchableOpacity>

          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => openLink("mailto:support@ezdocs.example.com")}
            activeOpacity={0.7}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={20} color={Colors.subtitle} />
            <Text style={styles.linkText}>Contact & Feedback</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.subtitle} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 18,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.text,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 15,
    color: Colors.subtitle,
  },
  content: {
    paddingHorizontal: 20,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.subtitle,
    marginBottom: 12,
    marginTop: 8,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
  },
  cardSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
    lineHeight: 18,
  },
  connectButton: {
    marginTop: 16,
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  connectButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  statusRow: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badgeSuccess: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  badgeTextSuccess: {
    color: "#166534",
    fontSize: 13,
    fontWeight: "600",
  },
  badgeWarning: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFEDD5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  badgeTextWarning: {
    color: "#9A3412",
    fontSize: 13,
    fontWeight: "600",
  },
  disconnectButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  disconnectText: {
    color: "#EF4444",
    fontSize: 13,
    fontWeight: "600",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
  },
  statLabel: {
    marginTop: 3,
    fontSize: 12,
    color: "#6B7280",
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: "#F3F4F6",
  },
  syncButton: {
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  syncButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  connectWrap: {
    marginTop: 16,
  },
  memberHint: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
    marginBottom: 12,
  },
  accountRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#EEF4FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.primary,
  },
  accountNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  roleText: {
    fontSize: 11,
    fontWeight: "700",
  },
  activeVaultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  activeVaultText: {
    fontSize: 13,
    color: "#6B7280",
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 4,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  linkText: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    marginLeft: 12,
  },
});