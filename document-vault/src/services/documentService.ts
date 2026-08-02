import uuid from "react-native-uuid";
import { File } from "expo-file-system";

import {
  createDocument,
  updateDocument,
  getDocumentById,
  updateDocumentNotificationIds,
} from "@/src/database/documentRepository";

import { saveFileToAppStorage } from "@/src/utils/fileStorage";

import {
  scheduleDocumentExpiryNotification,
  cancelDocumentNotification,
} from "./notificationService";

import {
  deleteDocumentFileAndCleanFolder,
  deleteFileFromDrive,
  uploadDocumentForActiveProfile,
} from "@/src/services/driveSyncService";

export type SaveDocumentPayload = {
  profileId: string;
  profileName: string;

  selectedTypeId: string;

  title: string;

  documentNumber: string;
  issueDate: string;
  expiryDate: string;
  notes: string;

  selectedFile: {
    uri: string;
    name: string;
    mimeType: string;
    size?: number;
  };
};

export async function createDocumentWithNotifications(
  payload: SaveDocumentPayload
) {
  // 1. Save file locally into app storage
  const storedFileUri = await saveFileToAppStorage(
    payload.selectedFile.uri,
    payload.selectedFile.name
  );

  // 2. Attempt Google Drive Vault Sync via central function
  let googleDriveFileId: string | null = null;

  try {
    const driveResult = await uploadDocumentForActiveProfile({
      uri: storedFileUri,
      name: payload.selectedFile.name,
      mimeType: payload.selectedFile.mimeType,
      categoryName: payload.title || "Uncategorized",
    });

    if (driveResult?.id) {
      googleDriveFileId = driveResult.id;
    }
  } catch (error) {
    console.warn("Google Drive sync failed during document creation:", error);
    // Silent fallback: document is saved locally regardless of network/auth state
  }

  // 3. Generate document id
  const documentId = uuid.v4() as string;

  // 4. Create document record in local database
  createDocument({
    id: documentId,
    profileId: payload.profileId,
    documentTypeId: payload.selectedTypeId,
    title: payload.title,
    displayName: payload.title,
    documentNumber: payload.documentNumber.trim() || null,
    issueDate: payload.issueDate.trim() || null,
    expiryDate: payload.expiryDate.trim() || null,
    fileName: payload.selectedFile.name,
    fileUri: storedFileUri,
    mimeType: payload.selectedFile.mimeType,
    googleDriveFileId: googleDriveFileId,
    fileSize: payload.selectedFile.size ?? null,
    notes: payload.notes.trim() || null,
    createdAt: Date.now(),
  });
  

  // 5. Schedule expiry reminders
  const notificationIds = await scheduleDocumentExpiryNotification({
    title: payload.title,
    displayName: payload.title,
    profileName: payload.profileName,
    expiryDate: payload.expiryDate.trim() || null,
  });

  // 6. Save notification ids
  updateDocumentNotificationIds(
    documentId,
    JSON.stringify(notificationIds)
  );

  return documentId;
}

export async function updateDocumentWithNotifications(
  documentId: string,
  payload: SaveDocumentPayload
) {
  const existingDocument = getDocumentById(documentId);

  if (!existingDocument) {
    throw new Error("Document not found.");
  }

  const oldFileUri = existingDocument.fileUri;

  // 1. Detect if the local file content changed
  const isFileChanged = payload.selectedFile.uri !== existingDocument.fileUri;

  let storedFileUri = existingDocument.fileUri;

  if (isFileChanged) {
    storedFileUri = await saveFileToAppStorage(
      payload.selectedFile.uri,
      payload.selectedFile.name
    );
  }

  // Sync replacement file to Google Drive if applicable
  let googleDriveFileId = existingDocument.googleDriveFileId ?? null;

// 2. Google Drive Synchronization Logic
  if (isFileChanged) {
    try {
      // Step A: Explicitly remove or detach the old Drive file first
      if (existingDocument.googleDriveFileId) {
       await deleteDocumentFileAndCleanFolder(existingDocument.googleDriveFileId);
      }

      // Step B: Upload file into the updated Category Folder
      const driveResult = await uploadDocumentForActiveProfile({
        uri: storedFileUri,
        name: payload.selectedFile.name,
        mimeType: payload.selectedFile.mimeType,
        categoryName: payload.title || "Uncategorized",
      });

      if (driveResult?.id) {
        googleDriveFileId = driveResult.id;
      }
    } catch (error) {
      console.warn("Google Drive sync failed during document update:", error);
      // Failsafe: keep existing drive file ID if online sync fails
    }
  }

  // Cancel previous notifications
  await cancelDocumentNotification(existingDocument.notificationIds);

  // Update document record in database
  updateDocument({
    ...existingDocument,
    documentTypeId: payload.selectedTypeId,
    title: payload.title,
    displayName: payload.title,
    documentNumber: payload.documentNumber.trim() || null,
    issueDate: payload.issueDate.trim() || null,
    expiryDate: payload.expiryDate.trim() || null,
    fileName: payload.selectedFile.name,
    fileUri: storedFileUri,
    mimeType: payload.selectedFile.mimeType,
    fileSize: payload.selectedFile.size ?? null,
    googleDriveFileId: googleDriveFileId,
    notes: payload.notes.trim() || null,
    updatedAt: Date.now(),
  });

  // Schedule new notifications
  const notificationIds = await scheduleDocumentExpiryNotification({
    title: payload.title,
    displayName: payload.title,
    profileName: payload.profileName,
    expiryDate: payload.expiryDate.trim() || null,
  });

  updateDocumentNotificationIds(
    documentId,
    JSON.stringify(notificationIds)
  );

  // Delete old local file after successful update
  if (isFileChanged && oldFileUri !== storedFileUri) {
    try {
      const oldFile = new File(oldFileUri);

      if (oldFile.exists) {
        await oldFile.delete();
      }
    } catch (e) {
      console.warn("Couldn't delete old local file:", e);
    }
  }
}
