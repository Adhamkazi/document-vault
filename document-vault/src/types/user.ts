export type User = {
  id: string;

  email: string;

  passwordHash: string;

  googleDriveFolderId: string | null;

  createdAt: number;
};