// onboardingService.ts
import uuid from 'react-native-uuid';
import { db } from '@/src/database/database';
import { generateUuid } from '../database/documentTypeRepository';

export interface OnboardingParams {
  userId: string;
  email: string;
  userName: string;
  choice: 'CREATE_VAULT' | 'JOIN_VAULT';
  targetVaultOwnerEmail?: string; // Provided if joining an existing vault
  sharedFolderId?: string;       // Passed if joining via shared folder link/ID
}

export async function completeUserOnboarding(params: OnboardingParams) {
  const normalizedEmail = params.email.trim().toLowerCase();
  const profileId = (typeof uuid.v4 === 'function' ? uuid.v4() : generateUuid()) as string;
  const now = Date.now();

  if (params.choice === 'CREATE_VAULT') {
    // 1. Setup as MASTER_ADMIN of their own vault
    db.runSync(
      `INSERT INTO profiles (id, userId, name, email, role, vaultOwnerEmail, isOwner, createdAt)
       VALUES (?, ?, ?, ?, 'MASTER_ADMIN', ?, 1, ?)`,
      [profileId, params.userId, params.userName, normalizedEmail, normalizedEmail, now]
    );

    return {
      profileId,
      role: 'MASTER_ADMIN' as const,
      vaultOwnerEmail: normalizedEmail,
      isOwner: true,
    };
  } else {
    // 2. Setup as FAMILY_MEMBER of target vault
    if (!params.targetVaultOwnerEmail) {
      throw new Error("Target vault owner email is required to join a vault.");
    }

    const targetVaultEmail = params.targetVaultOwnerEmail.trim().toLowerCase();

    db.runSync(
      `INSERT INTO profiles (id, userId, name, email, role, vaultOwnerEmail, sharedFolderId, isOwner, createdAt)
       VALUES (?, ?, ?, ?, 'FAMILY_MEMBER', ?, ?, 0, ?)`,
      [
        profileId,
        params.userId,
        params.userName,
        normalizedEmail,
        targetVaultEmail,
        params.sharedFolderId || null,
        now,
      ]
    );

    return {
      profileId,
      role: 'FAMILY_MEMBER' as const,
      vaultOwnerEmail: targetVaultEmail,
      isOwner: false,
    };
  }
}