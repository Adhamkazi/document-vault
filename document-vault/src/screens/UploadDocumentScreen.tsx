import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Colors } from "@/src/constants/colors";
import { getDocumentTypes, initializeDocumentTypesTable } from "@/src/database/documentTypeRepository";
import { createDocument, getDocumentById, updateDocument, updateDocumentNotificationIds } from "@/src/database/documentRepository";
import { getCurrentProfileId } from "@/src/utils/authStorage";
import { pickDocument } from "@/src/utils/filePicker";
import { saveFileToAppStorage } from "@/src/utils/fileStorage";
import type { DocumentType } from "@/src/types/documentType";
import uuid from "react-native-uuid";
import { cancelDocumentNotification, scheduleDocumentExpiryNotification } from "../services/notificationService";
import { getProfileById } from "../database/profileRepository";
import { useLocalSearchParams } from "expo-router";
import { File } from "expo-file-system";


const getCategoryIcon = (typeName: string): keyof typeof Ionicons.glyphMap => {
  const lower = typeName.toLowerCase();
  if (lower.includes("aadhar") || lower.includes("pan") || lower.includes("voter") || lower.includes("passport")) return "id-card-outline";
  if (lower.includes("license") || lower.includes("vehicle") || lower.includes("rc")) return "car-outline";
  if (lower.includes("certificate") || lower.includes("ssc") || lower.includes("hsc") || lower.includes("graduation")) return "school-outline";
  if (lower.includes("insurance") || lower.includes("medical")) return "medical-outline";
  if (lower.includes("offer") || lower.includes("payslip") || lower.includes("relieving")) return "briefcase-outline";
  return "document-text-outline";
};

export default function UploadDocumentScreen() {
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<string>("");
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [documentNumber, setDocumentNumber] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedFile, setSelectedFile] = useState<{  uri: string;  name: string;  mimeType: string; size?: number} | null>(null);
  const [saving, setSaving] = useState(false);

   const { documentId } = useLocalSearchParams();

  const isEdit = !!documentId;

  useEffect(() => {
  if (!documentId) return;
  const document = getDocumentById(documentId as string);
  if (!document) return;
  setSelectedTypeId(document.documentTypeId);
  setDocumentNumber(document.documentNumber ?? "");
  setIssueDate(document.issueDate ?? "");
  setExpiryDate(document.expiryDate ?? "");
  setNotes(document.notes ?? "");
  setSelectedFile({
    name: document.fileName,
    uri: document.fileUri,
    mimeType: document.mimeType,
    size: document.fileSize ?? undefined,
  });
}, [documentId]);

  useEffect(() => {
    try {
      initializeDocumentTypesTable();
      const types = getDocumentTypes();
      setDocumentTypes(types);
     if (!isEdit && types.length > 0) {
      setSelectedTypeId(types[0].id);
    }
    } catch (e) {
      console.error("Failed to load document types", e);
    }
  }, []);

  const selectedType = documentTypes.find((t) => t.id === selectedTypeId);

  const filteredTypes = documentTypes.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePickFile = async () => {
    try {
      const result = await pickDocument();
      if (result) {
        setSelectedFile({
          uri: result.uri,
          name: result.name,
          mimeType: result.mimeType ?? "application/octet-stream",
          size: result.size,
        });
      }
    } catch (error) {
      console.error("Error picking document:", error);
      Alert.alert("Error", "Failed to select document file.");
    }
  };

 const handleSave = async () => {
  if (!selectedTypeId) {
    Alert.alert("Validation", "Please select a document type.");
    return;
  }

  if (!selectedFile) {
    Alert.alert("Validation", "Please select a document file/image.");
    return;
  }

  try {
    setSaving(true);

    const profileId =
      (await getCurrentProfileId()) ?? "default-profile";

    const profile = getProfileById(profileId);

    const existingDocument = isEdit
      ? getDocumentById(documentId as string)
      : null;

    const oldFileUri = existingDocument?.fileUri;

    const documentDbId = isEdit
      ? (documentId as string)
      : (uuid.v4() as string);

    const title = selectedType
      ? selectedType.name
      : "Document";

    // Detect whether user selected a new file
    const isFileReplaced =
      isEdit &&
      existingDocument &&
      selectedFile.uri !== existingDocument.fileUri;

    let storedFileUri = selectedFile.uri;

    // Save file only when:
    // 1. Adding a new document
    // 2. User replaced the file
    if (!isEdit || isFileReplaced) {
      storedFileUri = await saveFileToAppStorage(
        selectedFile.uri,
        selectedFile.name
      );
    }

    if (isEdit && existingDocument) {
      // Cancel previous notifications
      await cancelDocumentNotification(
        existingDocument.notificationIds
      );

      updateDocument({
        ...existingDocument,

        documentTypeId: selectedTypeId,

        title,

        displayName: title,

        documentNumber:
          documentNumber.trim() || null,

        issueDate:
          issueDate.trim() || null,

        expiryDate:
          expiryDate.trim() || null,

        fileName: selectedFile.name,
        fileUri: storedFileUri,
        mimeType: selectedFile.mimeType,
        fileSize: selectedFile.size ?? null,

        notes:
          notes.trim() || null,

        updatedAt: Date.now(),
      });

    } else {
      createDocument({
        id: documentDbId,

        profileId,

        documentTypeId: selectedTypeId,

        title,

        displayName: title,

        documentNumber:
          documentNumber.trim() || null,

        issueDate:
          issueDate.trim() || null,

        expiryDate:
          expiryDate.trim() || null,

        fileName: selectedFile.name,

        fileUri: storedFileUri,

        mimeType: selectedFile.mimeType,

        fileSize: selectedFile.size ?? null,

        notes:
          notes.trim() || null,

        createdAt: Date.now(),
      });
    }

    // Schedule fresh notifications
    const notificationIds =
      await scheduleDocumentExpiryNotification({
        title,
        displayName: title,
        profileName: profile?.name ?? "",
        expiryDate:
          expiryDate.trim() || null,
      });

    updateDocumentNotificationIds(
      documentDbId,
      JSON.stringify(notificationIds)
    );

    // Delete old file only after everything succeeded
      if (
        isEdit &&
        oldFileUri &&
        oldFileUri !== storedFileUri
      ) {
        try {
         const oldFile = new File(oldFileUri);

          if (oldFile.exists) {
            await oldFile.delete();
          }
        } catch (e) {
          console.warn("Couldn't delete old file", e);
        }
      }
    Alert.alert(
      "Success",
      isEdit
        ? "Document updated successfully!"
        : "Document uploaded successfully!",
      [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]
    );
  } catch (error) {
    console.error("Save Document Error:", error);

    Alert.alert(
      "Error",
      "Failed to save document. Please try again."
    );
  } finally {
    setSaving(false);
  }
};
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
              {isEdit ? "Edit Document" : "Upload Document"}
            </Text>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          {/* 1. Document Type Picker Button */}
          <Text style={styles.label}>Select Document Type *</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => {
              setSearchQuery("");
              setShowTypeModal(true);
            }}
            activeOpacity={0.8}
          >
            <View style={styles.pickerLeft}>
              <View style={styles.pickerIconBadge}>
                <Ionicons
                  name={getCategoryIcon(selectedType?.name ?? "")}
                  size={22}
                  color={Colors.primary}
                />
              </View>
              <Text style={styles.pickerText}>
                {selectedType ? selectedType.name : "Select Type"}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={20} color={Colors.subtitle} />
          </TouchableOpacity>

          {/* 2. Document Number / ID */}
          <Text style={styles.label}>Document Number / ID</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. ISJPM1312N or 1234-5678-9012"
            placeholderTextColor="#999"
            value={documentNumber}
            onChangeText={setDocumentNumber}
            autoCapitalize="characters"
          />

          {/* 3. Dates Row */}
          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Issue Date</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#999"
                value={issueDate}
                onChangeText={setIssueDate}
              />
            </View>

            <View style={styles.col}>
              <Text style={styles.label}>
                Expiry Date {selectedType?.hasExpiry ? "*" : ""}
              </Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#999"
                value={expiryDate}
                onChangeText={setExpiryDate}
              />
            </View>
          </View>

          {/* 4. Notes */}
          <Text style={styles.label}>Notes (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Add any additional details or notes..."
            placeholderTextColor="#999"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />

          {/* 5. File Picker Area */}
          <Text style={styles.label}>Document File / Image *</Text>
          <TouchableOpacity
            style={styles.filePickerCard}
            onPress={handlePickFile}
            activeOpacity={0.7}
          >
            <View style={styles.filePickerIconCircle}>
              <Ionicons
                name={selectedFile ? "document-attach" : "cloud-upload-outline"}
                size={28}
                color={Colors.primary}
              />
            </View>

            {selectedFile ? (
              <View style={styles.fileDetails}>
                <Text style={styles.fileName} numberOfLines={1}>
                  {selectedFile.name}
                </Text>
                <Text style={styles.fileSize}>
                  {selectedFile.size
                    ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`
                    : "File attached"}
                </Text>
              </View>
            ) : (
              <View style={styles.fileDetails}>
                <Text style={styles.filePickerText}>
                  {isEdit ? "Tap to Replace File / Photo" : "Tap to upload File / Photo"}
                </Text>
                <Text style={styles.filePickerSubtext}>Supports PDF & Images</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* 6. Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, saving && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.saveButtonText}>
                {isEdit ? "Update Document" : "Save Document"}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modern Document Type Selection Modal */}
      <Modal
        visible={showTypeModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowTypeModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowTypeModal(false)}
        >
          <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.modalDragHandle} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Document Type</Text>
              <TouchableOpacity onPress={() => setShowTypeModal(false)}>
                <Ionicons name="close-circle" size={26} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {/* Search Input inside Modal */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={18} color="#9CA3AF" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search document types..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
                clearButtonMode="while-editing"
              />
            </View>

            {/* Type Items List */}
            <FlatList
              data={filteredTypes}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
              renderItem={({ item }) => {
                const isSelected = item.id === selectedTypeId;
                const iconName = getCategoryIcon(item.name);

                return (
                  <TouchableOpacity
                    style={[
                      styles.modalItem,
                      isSelected && styles.modalItemSelected,
                    ]}
                    onPress={() => {
                      setSelectedTypeId(item.id);
                      setShowTypeModal(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.modalItemLeft}>
                      <View
                        style={[
                          styles.modalItemIconBg,
                          isSelected && styles.modalItemIconBgSelected,
                        ]}
                      >
                        <Ionicons
                          name={iconName}
                          size={20}
                          color={isSelected ? Colors.primary : "#6B7280"}
                        />
                      </View>
                      <Text
                        style={[
                          styles.modalItemText,
                          isSelected && styles.modalItemTextSelected,
                        ]}
                      >
                        {item.name}
                      </Text>
                    </View>

                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={22}
                        color={Colors.primary}
                      />
                    )}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.modalEmpty}>
                  <Text style={styles.modalEmptyText}>No document types found</Text>
                </View>
              }
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    marginTop: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.text,
  },
  closeButton: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
    marginTop: 14,
  },
  pickerButton: {
    height: 56,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  pickerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  pickerIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#EEF4FF",
    justifyContent: "center",
    alignItems: "center",
  },
  pickerText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    color: Colors.text,
    backgroundColor: "#F9FAFB",
  },
  textArea: {
    height: 80,
    paddingTop: 12,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  col: {
    flex: 1,
  },
  filePickerCard: {
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: "dashed",
    borderRadius: 14,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F4F7FF",
    marginTop: 6,
  },
  filePickerIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E0E7FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
  },
  fileSize: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  filePickerText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.primary,
  },
  filePickerSubtext: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  saveButton: {
    height: 54,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 28,
    shadowColor: Colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  saveButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
  /* Selection Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  modalDragHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#E5E7EB",
    alignSelf: "center",
    marginBottom: 14,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.text,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
    height: 46,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
  },
  modalItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 6,
  },
  modalItemSelected: {
    backgroundColor: "#EFF6FF",
  },
  modalItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  modalItemIconBg: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  modalItemIconBgSelected: {
    backgroundColor: "#DBEAFE",
  },
  modalItemText: {
    fontSize: 16,
    fontWeight: "500",
    color: Colors.text,
  },
  modalItemTextSelected: {
    fontWeight: "700",
    color: Colors.primary,
  },
  modalEmpty: {
    paddingVertical: 30,
    alignItems: "center",
  },
  modalEmptyText: {
    fontSize: 15,
    color: "#9CA3AF",
  },
});
