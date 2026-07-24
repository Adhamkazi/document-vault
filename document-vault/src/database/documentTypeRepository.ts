import { db } from "./database";
import type { DocumentType } from "@/src/types/documentType";
import uuid from "react-native-uuid";

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
      id: uuid.v4() as string,
      name: item.name,
      hasExpiry: item.hasExpiry,
      createdAt: Date.now(),
    });
  }
}
}


export function createDocumentType(
  documentType: DocumentType
) {
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
      documentType.id,
      documentType.name,
      documentType.hasExpiry,
      documentType.createdAt,
    ]
  );
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