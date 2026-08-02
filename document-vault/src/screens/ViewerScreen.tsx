import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { deleteDocument, getDocumentById, updateDocument, updateDocumentFileUri } from "@/src/database/documentRepository";
import DocumentPreview from "@/src/components/documents/DocumentPreview";
import DocumentInfoCard from "../components/documents/DocumentInfoCard";
import DocumentActionSheet, { DocumentActionSheetRef } from "../components/documents/DocumentActionSheet";
import { deleteFile } from "../utils/fileStorage";
import { DocumentRecord } from "../types/document";
import { deleteDocumentFileAndCleanFolder, deleteFileFromDrive, downloadFileFromDrive } from "@/src/services/driveSyncService"; // Import your Drive download helper

export default function ViewerScreen() {
  const { id } = useLocalSearchParams();
  const initialDocument = getDocumentById(id as string);
  
  const [document, setDocument] = useState<DocumentRecord | null>(initialDocument);
  const [downloading, setDownloading] = useState(false);

  const actionSheetRef = useRef<DocumentActionSheetRef>(null);

  // ── Download file from Drive on demand if fileUri is empty ──
  useEffect(() => {
    async function ensureLocalFile() {
      if (!document) return;

      // Check if fileUri is missing but googleDriveFileId is available
      if ((!document.fileUri || document.fileUri === "") && document.googleDriveFileId) {
        try {
          setDownloading(true);
          
          // Download file locally using googleDriveFileId
          const localUri = await downloadFileFromDrive(
            document.googleDriveFileId,
            document.fileName || `${document.id}.pdf`
          );

          if (localUri) {
            // Update SQLite with the local file URI
            updateDocumentFileUri(document.id, localUri);
            // Update local state to trigger preview re-render
            setDocument((prev) => (prev ? { ...prev, fileUri: localUri } : null));
          }
        } catch (error) {
          console.error("Failed to download file from Google Drive:", error);
          Alert.alert("Download Error", "Unable to load document preview from Google Drive.");
        } finally {
          setDownloading(false);
        }
      }
    }

    ensureLocalFile();
  }, [id, document?.googleDriveFileId]);

  const handleDeleteDocument = (doc: DocumentRecord) => {
    Alert.alert(
      "Delete Document",
      `Are you sure you want to delete "${doc.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          // onPress: async () => {
          //   try {
          //     if (doc.fileUri) {
          //       await deleteFile(doc.fileUri);
          //     }
          //     deleteDocument(doc.id);
          //     router.back();
          //   } catch (error) {
          //     console.error(error);
          //     Alert.alert("Error", "Unable to delete document.");
          //   }
          // },
            onPress: async () => {
                 try {
                      // 1. Attempt Drive deletion safely (non-blocking for local delete)
                      if (doc.googleDriveFileId) {
                        try {
                          await deleteDocumentFileAndCleanFolder(doc.googleDriveFileId);
                        } catch (driveErr) {
                          console.warn(
                            "Google Drive deletion failed/offline. Proceeding with local delete:",
                            driveErr
                          );
                        }
                      }
          
                      // 2. Delete local physical file from phone storage
                      if (doc.fileUri) {
                        await deleteFile(doc.fileUri);
                      }
          
                      // 3. Remove document record from local SQLite database
                      deleteDocument(doc.id);
          
                      // 4. back to main screen
                      router.back();
                    } catch (error) {
                      console.error("Failed to delete local document:", error);
          
                      Alert.alert(
                        "Error",
                        "Unable to delete document from device."
                      );
                    }
          },
        },

      ]
    );
  };

  if (!document) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={52} color="#9CA3AF" />
        <Text style={styles.errorText}>Document not found</Text>
        <TouchableOpacity style={styles.errorBack} onPress={() => router.back()}>
          <Text style={styles.errorBackText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {document.title}
        </Text>
        <TouchableOpacity
          style={styles.moreButton}
          onPress={() => {
            requestAnimationFrame(() => {
              actionSheetRef.current?.open(document);
            });
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="ellipsis-vertical" size={20} color="#1F2937" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <DocumentInfoCard document={document} />

        {/* ── Preview section ── */}
        <View style={styles.previewSection}>
          <View style={styles.previewTitleRow}>
            <Ionicons name="eye-outline" size={16} color="#6B7280" />
            <Text style={styles.previewLabel}>Document Preview</Text>
          </View>
          <View style={styles.previewBox}>
            {downloading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2563EB" />
                <Text style={styles.loadingText}>Downloading file from Drive...</Text>
              </View>
            ) : (
              <DocumentPreview fileUri={document.fileUri} mimeType={document.mimeType} />
            )}
          </View>
        </View>
      </ScrollView>

      <DocumentActionSheet
        ref={actionSheetRef}
        onDelete={handleDeleteDocument}
        showOption={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    gap: 10,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: "700", color: "#1F2937" },
  moreButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  scroll: { padding: 16, paddingBottom: 40 },
  previewSection: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  previewTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  previewLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  previewBox: { height: 440 },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    gap: 12,
  },
  errorText: { fontSize: 17, color: "#6B7280", fontWeight: "600" },
  errorBack: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#2563EB",
    borderRadius: 12,
  },
  errorBackText: { color: "#FFF", fontWeight: "700", fontSize: 15 },
});