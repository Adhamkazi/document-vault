export type AppSettings = {
  id: string;

  userId: string;

  defaultProfileId: string | null;

  biometricEnabled: number;

  lastSyncedAt?: number | null;

  createdAt: number;

  updatedAt: number | null;
};