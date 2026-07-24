export type Document = {
  id: string;
  folderId: string | null;
  familyId: string | null;
  name: string;
  fileUri: string;
  type: "image" | "pdf";
  createdAt: number;
};

export type ActionSheetDocument = {
  id: string;
  name: string;
  fileUri: string;
  type: "image" | "pdf";
};

export type RecentDocument = {
  id: string;
  name: string;
  type: "image" | "pdf";
  folderName: string;
  fileUri: string;
  createdAt: number;
};

export type DocumentRecord = {
  id: string;
  profileId: string;
  profileName?: string;
  documentTypeId: string;
  documentTypeName?: string;
  title: string;
  displayName?: string | null;
  documentNumber?: string | null;
  issueDate?: string | null;
  expiryDate?: string | null;
  fileName: string;
  fileUri: string;
  mimeType: string;
  fileSize?: number | null;
  googleDriveFileId?: string | null;
  notificationIds?: string | null;
  notes?: string | null;
  createdAt: number;
  updatedAt?: number | null;
};

