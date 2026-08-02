export type User = {
  id: string;

  email: string;

  passwordHash: string;

  authProvider?: string;

  googleDriveFolderId: string | null;

  createdAt: number;
};