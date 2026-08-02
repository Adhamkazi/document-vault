import { db } from "./database";
import type { DocumentType } from "@/src/types/documentType";
import uuid from "react-native-uuid";

// Helper to guarantee a valid UUID string
export function generateUuid(): string {
  const generated = uuid.v4();
  if (typeof generated === "string" && generated.length > 0) {
    return generated;
  }
  // Fallback if react-native-uuid fails/returns non-string in native environment
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function initializeDocumentTypesTable() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS document_types (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL UNIQUE,
      hasExpiry INTEGER NOT NULL DEFAULT 0,
      createdAt INTEGER NOT NULL
    );
  `);

  const documentTypes = [
  {
    name: "Aadhar Card",
    hasExpiry: 0,
  },
  {
    name: "PAN Card",
    hasExpiry: 0,
  },
  {
    name: "Passport",
    hasExpiry: 1,
  },
  {
    name: "Driving License",
    hasExpiry: 1,
  },
  {
    name: "Voter ID",
    hasExpiry: 0,
  },
  {
    name: "Birth Certificate",
    hasExpiry: 0,
  },
  {
    name: "SSC Certificate",
    hasExpiry: 0,
  },
  {
    name: "HSC Certificate",
    hasExpiry: 0,
  },
  {
    name: "Graduation Certificate",
    hasExpiry: 0,
  },
  {
    name: "Offer Letter",
    hasExpiry: 0,
  },
  {
    name: "Payslip",
    hasExpiry: 0,
  },
  {
    name: "Relieving Letter",
    hasExpiry: 0,
  },
  {
    name: "Medical Insurance",
    hasExpiry: 1,
  },
  {
    name: "Vehicle RC",
    hasExpiry: 1,
  },
  {
    name: "Vehicle Insurance",
    hasExpiry: 1,
  },
  {
    name: "Property Papers",
    hasExpiry: 0,
  },
  {
    name: "Other",
    hasExpiry: 0,
  },
];

for (const item of documentTypes) {
  if (!documentTypeExists(item.name)) {
    createDocumentType({
      id: generateUuid(),
      name: item.name,
      hasExpiry: item.hasExpiry,
      createdAt: Date.now(),
    });
  }
}
}

export function getOrCreateValidDocumentTypeId(typeName?: string): string {
  const safeName = typeName?.trim() || "Other";
  const id = createDocumentType({
    id: generateUuid(),
    name: safeName,
    hasExpiry: 0,
    createdAt: Date.now(),
  });
  return id || "other_fallback_id"; 
}

export function createDocumentType(
  documentType: DocumentType
) {
  // 1. Sanitize and validate inputs to prevent NOT NULL SQL crashes
  const typeName = documentType.name?.trim();
  
  if (!typeName) {
    console.warn("createDocumentType skipped: Missing or empty document type name.");
    return null;
  }

  const existing = db.getFirstSync<any>(`SELECT id FROM document_types WHERE name = ?`, [documentType.name]);
  if (existing) {
    return existing.id;
  }

  // Fallback check to prevent NOT NULL constraint error on SQLite
  const idToInsert = documentType.id || generateUuid();
  
  db.runSync(
    `
    INSERT INTO document_types (
      id,
      name,
      hasExpiry,
      createdAt
    )
    VALUES (?, ?, ?, ?)
    `,
    [
      idToInsert,
      documentType.name,
      documentType.hasExpiry,
      documentType.createdAt,
    ]
  );
  return idToInsert;
}

export function getDocumentTypes(): DocumentType[] {
  return db.getAllSync<DocumentType>(`
    SELECT *
    FROM document_types
    ORDER BY name ASC
  `);
}

export function getDocumentTypeById(
  id: string
): DocumentType | null {
  return (
    db.getFirstSync<DocumentType>(
      `
      SELECT *
      FROM document_types
      WHERE id = ?
      `,
      [id]
    ) ?? null
  );
}

export function documentTypeExists(
  name: string
): boolean {
  const result = db.getFirstSync(
    `
    SELECT id
    FROM document_types
    WHERE LOWER(name)=LOWER(?)
    LIMIT 1
    `,
    [name]
  );

  return !!result;
}