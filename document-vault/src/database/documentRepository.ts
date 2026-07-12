import { db } from "./database";
import type { Document } from "@/src/types/document";


export function initializeDocumentsTable() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY NOT NULL,
      folderId TEXT NOT NULL,
      name TEXT NOT NULL,
      fileUri TEXT NOT NULL,
      type TEXT NOT NULL
    );
  `);
}

export function createDocument(document: Document) {
  db.runSync(
    `INSERT INTO documents
     (id, folderId, name, fileUri, type)
     VALUES (?, ?, ?, ?, ?)`,
    [
      document.id,
      document.folderId,
      document.name,
      document.fileUri,
      document.type,
    ]
  );
}

export function getDocumentsByFolder(folderId: string): Document[] {
  return db.getAllSync<Document>(
    "SELECT * FROM documents WHERE folderId = ?",
    [folderId]
  );
}