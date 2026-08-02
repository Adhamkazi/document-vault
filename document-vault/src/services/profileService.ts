import { getProfileById, getProfilesByUserId } from '../database/profileRepository';
import { Profile } from '../types/profile';
import { db } from '@/src/database/database';
import { getCurrentProfileId, getCurrentUserId } from '../utils/authStorage';
import { getOrCreateFolder, grantFolderPermission, getValidAccessToken } from './driveSyncService';

export interface FamilyMemberProfilePayload {
  profileId: string;
  profileName: string;
  gmailAddress: string;
  role?: 'writer' | 'reader';
}

/**
 * Prepares the profile folder on the Admin's Drive and grants access to the family member.
 */
export async function setupAndShareFamilyProfile({
  profileId,
  profileName,
  gmailAddress,
  role = 'writer',
}: FamilyMemberProfilePayload): Promise<boolean> {
  try {
    const accessToken = await getValidAccessToken();
    if (!accessToken) {
      console.warn("Admin access token required to set up shared folder.");
      return false;
    }

    // 1. Get or create root 'EzDocs' vault folder on Admin's Drive
    const rootVaultId = await getOrCreateFolder("EzDocs", "root", accessToken);


    // 2. Get or create specific Profile folder (e.g., 'EzDocs / Sarah')
    const profileFolderId = await getOrCreateFolder(profileName, rootVaultId, accessToken);


    if (!profileFolderId) {
      console.error("Failed to create profile folder for sharing.");
      return false;
    }

    // 3. Grant READER on the vault ROOT so the member can view everyone's documents
    const rootReadGranted = await grantFolderPermission({
      folderId: rootVaultId,
      emailAddress: gmailAddress,
      role: 'reader',
      sendNotificationEmail: false,
    });

    // 4. Grant WRITER on the member's OWN folder so they can only upload there
    const ownWriteGranted = await grantFolderPermission({
      folderId: profileFolderId,
      emailAddress: gmailAddress,
      role: 'writer',
      sendNotificationEmail: true, // Drive invite points them to their folder
    });

    const sharedSuccessfully = rootReadGranted && ownWriteGranted;

    // 5. Save the member's OWN folder as sharedFolderId (their upload target)
    if (ownWriteGranted) {
      try {
        db.runSync(
          `UPDATE profiles SET sharedFolderId = ? WHERE id = ?`,
          [profileFolderId, profileId]
        );
      } catch (dbError) {
        console.error("Failed to update profile sharedFolderId in database:", dbError);
      }
    }

    return sharedSuccessfully;
  } catch (error) {
    console.error("Failed to set up family member shared folder:", error);
    return false;
  }
}


export async function getActiveProfile(): Promise<Profile | null> {
  const profileId = await getCurrentProfileId();
  if (!profileId) return null;
  return getProfileById(profileId);
}

export async function getAllProfilesForUser(): Promise<Profile[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  return getProfilesByUserId(userId);
}