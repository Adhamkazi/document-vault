import { db } from "./database";
import type { DocumentRecord } from "@/src/types/document";

export function initializeDocumentsTable() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY NOT NULL,
      profileId TEXT NOT NULL,
      notificationIds TEXT,
      documentTypeId TEXT NOT NULL,
      title TEXT NOT NULL,
      displayName TEXT,
      documentNumber TEXT,
      issueDate TEXT,
      expiryDate TEXT,
      fileName TEXT NOT NULL,
      fileUri TEXT NOT NULL,
      mimeType TEXT NOT NULL,
      fileSize INTEGER,
      googleDriveFileId TEXT,
      notes TEXT,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER,
      FOREIGN KEY(profileId) REFERENCES profiles(id),
      FOREIGN KEY(documentTypeId) REFERENCES document_types(id)
    );
  `);
}

export function createDocument(doc: DocumentRecord): void {
  db.runSync(
    `
    INSERT INTO documents (
      id, profileId, documentTypeId, title, displayName, documentNumber,
      issueDate, expiryDate, fileName, fileUri, mimeType, fileSize,
      googleDriveFileId, notes, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      doc.id,
      doc.profileId,
      doc.documentTypeId,
      doc.title,
      doc.displayName ?? null,
      doc.documentNumber ?? null,
      doc.issueDate ?? null,
      doc.expiryDate ?? null,
      doc.fileName,
      doc.fileUri,
      doc.mimeType,
      doc.fileSize ?? null,
      doc.googleDriveFileId ?? null,
      doc.notes ?? null,
      doc.createdAt,
      doc.updatedAt ?? null,
    ]
  );
}

export function getDocumentsByProfile(profileId: string): DocumentRecord[] {
  return db.getAllSync<DocumentRecord>(
    `
    SELECT d.*, dt.name as documentTypeName
    FROM documents d
    LEFT JOIN document_types dt ON d.documentTypeId = dt.id
    WHERE d.profileId = ?
    ORDER BY d.createdAt DESC
    `,
    [profileId]
  );
}

export function getAllDocuments(): DocumentRecord[] {
  return db.getAllSync<DocumentRecord>(
    `
    SELECT d.*, dt.name as documentTypeName
    FROM documents d
    LEFT JOIN document_types dt ON d.documentTypeId = dt.id
    ORDER BY d.createdAt DESC
    `
  );
}

export function getDocumentById(id: string): DocumentRecord | null {
  return (
    db.getFirstSync<DocumentRecord>(
      `
      SELECT d.*, dt.name as documentTypeName
      FROM documents d
      LEFT JOIN document_types dt ON d.documentTypeId = dt.id
      WHERE d.id = ?
      `,
      [id]
    ) ?? null
  );
}

export function deleteDocument(id: string): void {
  db.runSync(`DELETE FROM documents WHERE id = ?`, [id]);
}

export function deleteDocumentsByProfileId(
  profileId: string
) {
  db.runSync(
    `DELETE FROM documents WHERE profileId = ?`,
    [profileId]
  );
}

export function updateDocument(document: DocumentRecord) {
  db.runSync (

    `UPDATE documents
    SET
      documentTypeId = ?,
      title = ?,
      displayName = ?,
      documentNumber = ?,
      issueDate = ?,
      expiryDate = ?,
      fileName = ?,
      fileUri = ?,
      mimeType = ?,
      fileSize = ?,
      notes = ?,
      updatedAt = ?
      WHERE id = ?
     `,
    [
      document.documentTypeId,
      document.title,
      document.displayName ?? null,
      document.documentNumber ?? null,
      document.issueDate ?? null,
      document.expiryDate ?? null,
      document.fileName,
      document.fileUri,
      document.mimeType,
      document.fileSize ?? null,
      document.notes ?? null,
      document.updatedAt ?? null,
      document.id,
    ]
  );
}

export function updateDocumentNotificationIds(
  documentId: string,
  notificationIds : string | null
) {
  db.runSync(
    `
    UPDATE documents
    SET notificationIds  = ?
    WHERE id = ?
    `,
    [notificationIds, documentId]
  );
}

export function getTotalDocuments(
  profileId: string
): number {
  const result = db.getFirstSync<{
    total: number;
  }>(
    `
    SELECT COUNT(*) as total
    FROM documents
    WHERE profileId = ?
    `,
    [profileId]
  );

  return result?.total ?? 0;
}

export function getExpiringDocuments(
  profileId: string,
  days: number = 30
): DocumentRecord[] {
  const today = new Date();

  const endDate = new Date();
  endDate.setDate(today.getDate() + days);

  const todayString = today
    .toISOString()
    .split("T")[0];

  const endDateString = endDate
    .toISOString()
    .split("T")[0];

  return db.getAllSync<DocumentRecord>(
    `
    SELECT
      d.*,
      dt.name as documentTypeName,
      p.name as profileName
    FROM documents d
    LEFT JOIN document_types dt
      ON d.documentTypeId = dt.id
    LEFT JOIN profiles p
      ON d.profileId = p.id  
    WHERE
      d.profileId = ?
      AND d.expiryDate IS NOT NULL
      AND d.expiryDate <= ?
    ORDER BY d.expiryDate ASC
    `,
    [
      profileId,
      endDateString,
    ]
  );
}