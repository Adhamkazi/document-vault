import React, { useEffect, useRef, useState } from "react";
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
import {  getDocumentById } from "@/src/database/documentRepository";
import { getCurrentProfileId } from "@/src/utils/authStorage";
import { pickDocument } from "@/src/utils/filePicker";
import type { DocumentType } from "@/src/types/documentType";
import { getProfileById } from "../database/profileRepository";
import { useLocalSearchParams } from "expo-router";
import { createDocumentWithNotifications, updateDocumentWithNotifications } from "@/src/services/documentService";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { captureDocument } from "@/src/utils/camera";
import FileSourceActionSheet, {
  FileSourceActionSheetRef,
} from "@/src/components/documents/FileSourceActionSheet";


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
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateField, setDateField] = useState< "issueDate" | "expiryDate" | null>(null);
  const [documentNumber, setDocumentNumber] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedFile, setSelectedFile] = useState<{  uri: string;  name: string;  mimeType: string; size?: number} | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({ documentType: "",  documentNumber: "", issueDate: "", expiryDate: "", file: ""});

  const { documentId } = useLocalSearchParams();

  const fileSourceRef =
  useRef<FileSourceActionSheetRef>(null);

  const openDatePicker = ( field: "issueDate" | "expiryDate") => 
  {
  setDateField(field);
  setShowDatePicker(true);
  };

const handleCapture = async () => {
  const image = await captureDocument();

  if (!image) return;

  setSelectedFile({
    uri: image.uri,
    name: image.fileName ?? "captured-document.jpg",
    mimeType: image.mimeType ?? "image/jpeg",
    size: image.fileSize,
  });
};

  const handleDateChange = (
  event: DateTimePickerEvent,
  selectedDate?: Date
) => {
  setShowDatePicker(false);

  if (!selectedDate) return;

  const formatted = selectedDate
    .toISOString()
    .split("T")[0];

  if (dateField === "issueDate") {
    setIssueDate(formatted);
  }

  if (dateField === "expiryDate") {
    setExpiryDate(formatted);
  }
};

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

const validateForm = () => {
   const newErrors = {
    documentType: "",
    documentNumber: "",
    issueDate: "",
    expiryDate: "",
    file: "",
  };

  if (!selectedTypeId) {
  newErrors.documentType = "Please select a document type.";
  }

  if (!selectedFile) {
   newErrors.file = "Please upload a document.";
  }

  if (!documentNumber.trim()) {
    newErrors.documentNumber = "Document number is required.";
  }

  if (
    selectedType?.hasExpiry &&
    !expiryDate.trim()
  ) {
    newErrors.expiryDate = "Expiry date is required.";
  }

  // If expiry exists, issue date should also exist
  if (
    selectedType?.hasExpiry &&
    expiryDate &&
    !issueDate
  ) {
   newErrors.issueDate  = "Issue date is required.";
  }

  if (
    issueDate &&
    expiryDate &&
    new Date(issueDate) > new Date(expiryDate)
  ) {
   newErrors.issueDate ="Issue date cannot be after expiry date.";
  }

  setErrors(newErrors);

  return !Object.values(newErrors).some(Boolean);
};

 const handleSave = async () => {
 if (!validateForm()) return;
 const file = selectedFile!;

  try {
    setSaving(true);

    const profileId =
    (await getCurrentProfileId()) ?? "default-profile";

    const profile = getProfileById(profileId);

    const title = selectedType
      ? selectedType.name
      : "Document";

      const payload = {
          profileId,
          profileName: profile?.name ?? "",
          selectedTypeId,
          title,
          documentNumber,
          issueDate,
          expiryDate,
          notes,
          selectedFile : file,
        };

    if (isEdit ) {
     await updateDocumentWithNotifications(documentId as string, payload);

    } else {
      await createDocumentWithNotifications(payload);
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
          {!!errors.documentType && (
              <Text style={styles.errorText}>
                  {errors.documentType}
              </Text>
          )}

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
          {!!errors.documentNumber && (
              <Text style={styles.errorText}>
                  {errors.documentNumber}
              </Text>
          )}

          {/* 3. Dates Row */}
          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Issue Date</Text>
              <TouchableOpacity
                  style={styles.datePickerButton}
                  onPress={() => openDatePicker("issueDate")}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.dateText,
                      !issueDate && styles.datePlaceholder,
                    ]}
                  >
                    {issueDate || "Select Date"}
                  </Text>

                  <Ionicons
                    name="calendar-outline"
                    size={20}
                    color={Colors.subtitle}
                  />
                </TouchableOpacity>
              { !!errors.issueDate && (
                <Text style={styles.errorText}>
                    {errors.issueDate}
                </Text>
              )}
              
            </View>
            {selectedType?.hasExpiry === 1 && (
              <View style={styles.col}>
                <Text style={styles.label}>
                  Expiry Date *
                </Text>
               <TouchableOpacity
                  style={styles.datePickerButton}
                  onPress={() => openDatePicker("expiryDate")}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.dateText,
                      !expiryDate && styles.datePlaceholder,
                    ]}
                  >
                    {expiryDate || "Select Date"}
                  </Text>
                  <Ionicons
                    name="calendar-outline"
                    size={20}
                    color={Colors.subtitle}
                  />
                </TouchableOpacity>
            {!!errors.expiryDate && (
              <Text style={styles.errorText}>
                  {errors.expiryDate}
              </Text>
            )}
              </View>
   
           )} 
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
            onPress={() => fileSourceRef.current?.open()}
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
          {!!errors.file && (
              <Text style={styles.errorText}>
                  {errors.file}
              </Text>
          )}

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

      {showDatePicker && (
          <DateTimePicker
            value={
              dateField === "issueDate" && issueDate
                ? new Date(issueDate)
                : dateField === "expiryDate" && expiryDate
                ? new Date(expiryDate)
                : new Date()
            }
            mode="date"
            display="default"
            onChange={handleDateChange}
          />
        )}

      <FileSourceActionSheet
        ref={fileSourceRef}
        onCamera={handleCapture}
        onDocument={handlePickFile}
      />
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
    datePickerButton: {
    height: 52,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    backgroundColor: "#FFF",
    paddingHorizontal: 14,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  dateText: {
    fontSize: 15,
    color: Colors.text,
  },

  datePlaceholder: {
    color: "#9CA3AF",
  },
  errorText: {
  color: "#DC2626",
  fontSize: 12,
  marginTop: 4,
  marginLeft: 4,
},
});
