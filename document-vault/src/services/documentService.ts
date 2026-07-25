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
  // Save file into app storage
  const storedFileUri = await saveFileToAppStorage(
    payload.selectedFile.uri,
    payload.selectedFile.name
  );

  // Generate document id
  const documentId = uuid.v4() as string;

  // Create document in database
  createDocument({
    id: documentId,

    profileId: payload.profileId,

    documentTypeId: payload.selectedTypeId,

    title: payload.title,

    displayName: payload.title,

    documentNumber:
      payload.documentNumber.trim() || null,

    issueDate:
      payload.issueDate.trim() || null,

    expiryDate:
      payload.expiryDate.trim() || null,

    fileName: payload.selectedFile.name,

    fileUri: storedFileUri,

    mimeType: payload.selectedFile.mimeType,

    fileSize:
      payload.selectedFile.size ?? null,

    notes:
      payload.notes.trim() || null,

    createdAt: Date.now(),
  });

  // Schedule expiry reminders
  const notificationIds =
    await scheduleDocumentExpiryNotification({
      title: payload.title,
      displayName: payload.title,
      profileName: payload.profileName,
      expiryDate:
        payload.expiryDate.trim() || null,
    });

  // Save notification ids
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

  // Detect file replacement
  const isFileReplaced =
    payload.selectedFile.uri !== existingDocument.fileUri;

  let storedFileUri = existingDocument.fileUri;

  if (isFileReplaced) {
    storedFileUri = await saveFileToAppStorage(
      payload.selectedFile.uri,
      payload.selectedFile.name
    );
  }

    console.log("Existing document:", existingDocument);
    console.log(
    "Stored notificationIds:",
    existingDocument.notificationIds
    );

  // Cancel previous notifications
  await cancelDocumentNotification(
    existingDocument.notificationIds
  );

  // Update document
  updateDocument({
    ...existingDocument,

    documentTypeId: payload.selectedTypeId,

    title: payload.title,

    displayName: payload.title,

    documentNumber:
      payload.documentNumber.trim() || null,

    issueDate:
      payload.issueDate.trim() || null,

    expiryDate:
      payload.expiryDate.trim() || null,

    fileName: payload.selectedFile.name,

    fileUri: storedFileUri,

    mimeType: payload.selectedFile.mimeType,

    fileSize:
      payload.selectedFile.size ?? null,

    notes:
      payload.notes.trim() || null,

    updatedAt: Date.now(),
  });

  // Schedule new notifications
  const notificationIds =
    await scheduleDocumentExpiryNotification({
      title: payload.title,
      displayName: payload.title,
      profileName: payload.profileName,
      expiryDate:
        payload.expiryDate.trim() || null,
    });

  updateDocumentNotificationIds(
    documentId,
    JSON.stringify(notificationIds)
  );

  // Delete old file after successful update
  if (
    isFileReplaced &&
    oldFileUri !== storedFileUri
  ) {
    try {
      const oldFile = new File(oldFileUri);

      if (oldFile.exists) {
        await oldFile.delete();

        console.log(
          "🗑 Old file deleted:",
          oldFileUri
        );
      }
    } catch (e) {
      console.warn(
        "Couldn't delete old file",
        e
      );
    }
  }
}