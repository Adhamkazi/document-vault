import React, { useCallback, useState,useRef } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert
} from "react-native";
import { useFocusEffect, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/src/constants/colors";
import { getCurrentProfileId } from "@/src/utils/authStorage";
import {
  getDocumentsByProfile,
} from "@/src/database/documentRepository";
import type { DocumentRecord } from "@/src/types/document";
import EmptyDocuments from "@/src/components/documents/EmptyDocuments";
import DocumentCard from "../components/documents/documentCard";
import { SafeAreaView } from "react-native-safe-area-context";
import { deleteDocument } from "@/src/database/documentRepository";
import { deleteFile } from "@/src/utils/fileStorage";
import DocumentActionSheet, { DocumentActionSheetRef} from "@/src/components/documents/DocumentActionSheet";
import { deleteDocumentFileAndCleanFolder, deleteFileFromDrive } from "../services/driveSyncService";


export default function DocumentsScreen() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);


  const actionSheetRef =
  useRef<DocumentActionSheetRef>(null);


const handleDeleteDocument = (document: DocumentRecord) => {
  Alert.alert(
    "Delete Document",
    `Are you sure you want to delete "${document.title}"?`,
    [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            // 1. Attempt Drive deletion safely (non-blocking for local delete)
            if (document.googleDriveFileId) {
              try {
                await deleteDocumentFileAndCleanFolder(document.googleDriveFileId);
              } catch (driveErr) {
                console.warn(
                  "Google Drive deletion failed/offline. Proceeding with local delete:",
                  driveErr
                );
              }
            }

            // 2. Delete local physical file from phone storage
            if (document.fileUri) {
              await deleteFile(document.fileUri);
            }

            // 3. Remove document record from local SQLite database
            deleteDocument(document.id);

            // 4. Refresh UI state
            loadDocuments();
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
  const loadDocuments = async () => {
    const profileId = await getCurrentProfileId();
    if (!profileId) return;
    const data = getDocumentsByProfile(profileId);
    setDocuments(data);
  };

  useFocusEffect(
    useCallback(() => {
      loadDocuments();
    }, [])
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>

        <View style={styles.headerText}>
          <Text style={styles.title}>My Documents</Text>
          <Text style={styles.subtitle}>
            {documents.length === 0
              ? "No documents stored"
              : `${documents.length} Document${documents.length > 1 ? "s" : ""}`}
          </Text>
        </View>
      </View>

      <FlatList
        data={documents}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          padding: 20,
          flexGrow: 1,
        }}
        renderItem={({ item }) => (
          <DocumentCard
            document={item}
            onPress={() => {
             router.push({
              pathname: "/viewer",
              params: {
                id: item.id,
              },
            });
            }}
             onMorePress={() =>
                actionSheetRef.current?.open(item)
            }
          />
        )}
        ListEmptyComponent={<EmptyDocuments />}
      />
      <DocumentActionSheet
         ref={actionSheetRef}
         onDelete={handleDeleteDocument}
         showOption = {true}

      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 14,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },

  headerText: {
    flex: 1,
  },

  title: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.text,
  },

  subtitle: {
    marginTop: 2,
    fontSize: 13,
    color: "#6B7280",
  },
});