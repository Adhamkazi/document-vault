import { File, Paths } from 'expo-file-system';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import uuid from 'react-native-uuid';
import { db } from '@/src/database/database';
import { createDocument } from '../database/documentRepository';
import {  generateUuid, getOrCreateValidDocumentTypeId } from '../database/documentTypeRepository';
import { updateUserDriveRootFolder } from '../database/userRepository';
import { getCurrentProfileId } from "@/src/utils/authStorage";
import { getProfileById, getProfilesByUserId } from "@/src/database/profileRepository";
import { Profile } from '../types/profile';

const DRIVE_API = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
const DRIVE_FILES_API = 'https://www.googleapis.com/drive/v3/files';

export interface GrantPermissionParams {
  folderId: string;
  emailAddress: string;
  role?: 'writer' | 'reader';
  sendNotificationEmail?: boolean;
}

export function configureGoogleAuth(webClientId: string) {
  GoogleSignin.configure({
    scopes: ['https://www.googleapis.com/auth/drive', 'email', 'profile'],
    webClientId: webClientId,
    offlineAccess: true,
    accountName: '', // Tells Android not to default to a cached account
    
  });
}

export async function getValidAccessToken(): Promise<string> {
  const tokens = await GoogleSignin.getTokens();
  return tokens.accessToken;
}

export async function getOrCreateFolder(
  folderName: string,
  parentId: string,
  accessToken: string
): Promise<string> {
  const query = encodeURIComponent(
    `name = '${folderName}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  );

  const searchRes = await fetch(`${DRIVE_API}?q=${query}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const searchData = await searchRes.json();

  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  const createRes = await fetch(DRIVE_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    }),
  });

  const created = await createRes.json();
  return created.id;
}

export async function resolveTargetDriveFolder(
  rootVaultId: string,
  profileName: string,
  documentTypeName: string,
  accessToken: string
): Promise<string> {
  const profileFolderId = await getOrCreateFolder(profileName, rootVaultId, accessToken);
  const docTypeFolderId = await getOrCreateFolder(documentTypeName, profileFolderId, accessToken);
  return docTypeFolderId;
}

async function recoverFromSharedFolder(
  userId: string,
  profileId: string,
  sharedFolderId: string,
  accessToken: string
) {
  const docTypeQuery = encodeURIComponent(
    `'${sharedFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  );
  const docTypeRes = await fetch(`${DRIVE_API}?q=${docTypeQuery}&supportsAllDrives=true&includeItemsFromAllDrives=true`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const docTypeFolders = (await docTypeRes.json()).files || [];

  let recoveredCount = 0;

  for (const dtFolder of docTypeFolders) {
    const docTypeId = getOrCreateValidDocumentTypeId(dtFolder?.name);

    const filesQuery = encodeURIComponent(
      `'${dtFolder.id}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed = false`
    );
    const filesRes = await fetch(`${DRIVE_API}?q=${filesQuery}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const driveFiles = (await filesRes.json()).files || [];

    

    for (const file of driveFiles) {
      const existingByDriveId = db.getFirstSync<any>(
        `SELECT id FROM documents WHERE googleDriveFileId = ?`,
        [file.id]
      );

      if (!existingByDriveId) {
        createDocument({
          id: (typeof uuid.v4 === "function" ? uuid.v4() : generateUuid()) as string,
          profileId,
          documentTypeId: docTypeId,
          title: dtFolder?.name || file.name,
          fileName: file.name,
          fileUri: '',
          mimeType: file.mimeType || 'application/pdf',
          googleDriveFileId: file.id,
          createdAt: Date.now(),
        });
        recoveredCount++;
      }
    }
  }

  return { recoveredCount, rootVaultId: sharedFolderId };
}

/**
 * Helper for Family Members: Discovers the admin's EzDocs root from the family member's shared subfolder,
 * then syncs all family profiles and documents under the current family member's local userId.
 * @param vaultOwnerEmail - The admin/owner's email address to store as vaultOwnerEmail on each synced profile.
 */
async function syncAllFamilyProfilesFromRoot(
  userId: string,
  ezDocsRootId: string,
  userSharedFolderId: string,
  currentUserEmail: string,
  accessToken: string,
  vaultOwnerEmail: string
) {
  let totalRecovered = 0;

  // 1. Query all sub-folders under EzDocs root (these represent all family member profiles)
  const profileQuery = encodeURIComponent(
    `'${ezDocsRootId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  );
  const profileRes = await fetch(`${DRIVE_API}?q=${profileQuery}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const subFolders = (await profileRes.json()).files || [];

  for (const folder of subFolders) {
    const cleanFolderName = folder.name.trim();
    const isUserOwnFolder = (folder.id === userSharedFolderId);
    // Look for existing local profile under this userId or matching email/name
    let profile = db.getFirstSync<any>(
  `SELECT id FROM profiles WHERE sharedFolderId = ?`,
  [folder.id]
);
   

    const targetProfileId = profile?.id || ((typeof uuid.v4 === "function" ? uuid.v4() : generateUuid()) as string);

    // Save/upsert profile under current user's userId with the real admin vault owner email
    db.runSync(
      `INSERT INTO profiles (
        id, userId, name, email, role, vaultOwnerEmail, sharedFolderId, isOwner, createdAt
       ) VALUES (?, ?, ?, ?, 'FAMILY_MEMBER', ?, ?, 0, ?)
       ON CONFLICT(userId, name) DO UPDATE SET
        sharedFolderId = excluded.sharedFolderId,
        vaultOwnerEmail = excluded.vaultOwnerEmail,
        role = 'FAMILY_MEMBER',
        email = COALESCE(excluded.email, profiles.email)`,
      [
        targetProfileId,
        userId,
        cleanFolderName,
        isUserOwnFolder ? currentUserEmail : null,
        vaultOwnerEmail,
        folder.id,
        Date.now(),
      ]
    );

    // Recover documents from each profile's shared subfolder
    const recResult = await recoverFromSharedFolder(userId, targetProfileId, folder.id, accessToken);
    totalRecovered += recResult?.recoveredCount || 0;
  }

  return { recoveredCount: totalRecovered, rootVaultId: ezDocsRootId };
}

/**
 * Reinstallation Recovery: Scans existing Drive folders and rebuilds SQLite database
 */
export async function syncAndRecoverFromDrive(
  userId: string, 
  activeProfileId?: string, 
  userDisplayName?: string, 
  normalizedEmail?: string
) {

  const accessToken = await getValidAccessToken();
  if (!accessToken) return { recoveredCount: 0, rootVaultId: null };

  const primaryName = userDisplayName?.trim() || 'Master Vault Owner';

  // ---------------------------------------------------------------------------
  // 1. FAST-PATH / FAMILY MEMBER RESOLUTION
  // ---------------------------------------------------------------------------
  let activeProfile: any = null;

  if (activeProfileId) {
    activeProfile = db.getFirstSync<any>(`SELECT * FROM profiles WHERE id = ?`, [activeProfileId]);
  }
   const currentUserEmail = (normalizedEmail || '').trim().toLowerCase();
   if (!activeProfile) {
  activeProfile = db.getFirstSync(
    `
    SELECT *
    FROM profiles
    WHERE LOWER(TRIM(email)) = ?
    LIMIT 1
    `,
    [currentUserEmail]
  );

}
   const isVaultOwner = activeProfile?.vaultOwnerEmail?.toLowerCase() === currentUserEmail;


  // Check if profile is explicitly marked as family member OR if email matches non-owner profile
  if (activeProfile && activeProfile.role === 'FAMILY_MEMBER') {

    let sharedFolderId = activeProfile.sharedFolderId;

    if (!sharedFolderId) {
      sharedFolderId = await findSharedProfileFolder(activeProfile.name);
      if (sharedFolderId) {
        db.runSync(`UPDATE profiles SET sharedFolderId = ? WHERE id = ?`, [sharedFolderId, activeProfile.id]);
      }
    }

    if (sharedFolderId) {
      // Find parent EzDocs root from the shared subfolder
      try {
        const parentRes = await fetch(
          `${DRIVE_API}/${sharedFolderId}?fields=parents,sharingUser`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (parentRes.ok) {
          const parentData = await parentRes.json();
          const ezDocsRootId = parentData.parents?.[0];
          // Use the sharing user's email as the vault owner email
          const adminEmail = parentData.sharingUser?.emailAddress?.toLowerCase() || '';

          if (ezDocsRootId) {
            // Validate the parent folder is actually the EzDocs root before syncing
            const rootMetaRes = await fetch(
              `${DRIVE_API}/${ezDocsRootId}?fields=name`,
              { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            const rootMeta = rootMetaRes.ok ? await rootMetaRes.json() : null;

            if (rootMeta?.name === 'EzDocs') {
              
               return await recoverFromSharedFolder(
              userId,
              activeProfile.id,
              sharedFolderId,
              accessToken
            );
            }
          }
        }
      } catch (e) {
        console.warn("Failed to navigate to parent EzDocs root, falling back to direct folder recovery", e);
      }
      return await recoverFromSharedFolder(
        userId,
        activeProfile.id,
        sharedFolderId,
        accessToken
      );
    }
  }

  // Check if current user has folders shared with them on Drive (Family Member logging in fresh)
  const sharedQuery = encodeURIComponent(
    "sharedWithMe = true and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
  );
  const sharedRes = await fetch(`${DRIVE_FILES_API}?q=${sharedQuery}&fields=files(id,name,parents,sharingUser)&supportsAllDrives=true&includeItemsFromAllDrives=true`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  
  const rawSharedData = await sharedRes.json();

  if (sharedRes.ok) {
    const sharedFolders = rawSharedData.files || [];;


    for (const sharedFolder of sharedFolders) {
      // ── Direct match: this shared folder already belongs to a local
      // FAMILY_MEMBER profile (via sharedFolderId). This is the reliable way
      // to recognize a member whose email is null or whose profile was created
      // under the admin's userId.
      const matchingProfile = db.getFirstSync<any>(
        `SELECT * FROM profiles
         WHERE sharedFolderId = ? AND role = 'FAMILY_MEMBER'
         LIMIT 1`,
        [sharedFolder.id]
      );
      if (matchingProfile) {

        // Reassign this profile to the signed-in user and backfill email so
        // future lookups (by userId or email) also succeed.
        db.runSync(
          `UPDATE profiles SET userId = ?, email = COALESCE(email, ?) WHERE id = ?`,
          [userId, currentUserEmail, matchingProfile.id]
        );
        return await recoverFromSharedFolder(
          userId,
          matchingProfile.id,
          sharedFolder.id,
          accessToken
        );
      }

      const parentId = sharedFolder.parents?.[0];
      const adminEmail = sharedFolder.sharingUser?.emailAddress?.toLowerCase() || '';
        if (!sharedFolder.parents?.length) {
          continue;
        }


      if (!parentId) continue;

      // Validate the parent is truly an EzDocs root — skip unrelated shared folders
      try {
        const rootMetaRes = await fetch(
          `${DRIVE_API}/${parentId}?fields=name`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (!rootMetaRes.ok) continue;
        const rootMeta = await rootMetaRes.json();
        if (rootMeta?.name !== 'EzDocs') continue;

        return await syncAllFamilyProfilesFromRoot(
          userId,
          parentId,
          sharedFolder.id,
          currentUserEmail,
          accessToken,
          adminEmail
        );
      } catch (e) {
        console.warn('Failed to validate EzDocs root for shared folder:', sharedFolder.id, e);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GUARD: A family member must NEVER proceed into the admin flow.
  // If we have any local evidence this user belongs to another vault as a
  // FAMILY_MEMBER (by active profile role or by matching email), recover their
  // own folder (if any) and stop here — do NOT create a vault or an owner.
  // ─────────────────────────────────────────────────────────────────────────
  const localFamilyProfile =
    (activeProfile && activeProfile.role === 'FAMILY_MEMBER')
      ? activeProfile
      : db.getFirstSync<any>(
          `SELECT * FROM profiles
           WHERE LOWER(TRIM(email)) = ?
             AND role = 'FAMILY_MEMBER'
           LIMIT 1`,
          [currentUserEmail]
        );

  if (localFamilyProfile) {
    let familyFolderId = localFamilyProfile.sharedFolderId;
    if (!familyFolderId && localFamilyProfile.name) {
      familyFolderId = await findSharedProfileFolder(localFamilyProfile.name);
      if (familyFolderId) {
        db.runSync(
          `UPDATE profiles SET sharedFolderId = ? WHERE id = ?`,
          [familyFolderId, localFamilyProfile.id]
        );
      }
    }
    if (familyFolderId) {
      return await recoverFromSharedFolder(
        userId,
        localFamilyProfile.id,
        familyFolderId,
        accessToken
      );
    }
    // Still a family member even without a folder yet — never create a vault.
    return { recoveredCount: 0, rootVaultId: null };
  }

      if (
  activeProfile &&
  !isVaultOwner &&
  activeProfile.isOwner === 1
) {

  return await recoverFromSharedFolder(
    userId,
    activeProfile.id,
    activeProfile.sharedFolderId,
    accessToken
  );
}

  // ---------------------------------------------------------------------------
  // 2. Locate or create the 'EzDocs' root folder on Google Drive (Admin Flow)
  // ---------------------------------------------------------------------------
  const query = encodeURIComponent(
    "name = 'EzDocs' and 'root' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
  );
  const rootRes = await fetch(`${DRIVE_API}?q=${query}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const rootData = await rootRes.json();

  let rootVaultId: string;
  if (!rootData.files || rootData.files.length === 0) {
    rootVaultId = await getOrCreateFolder('EzDocs', 'root', accessToken);
  } else {
    rootVaultId = rootData.files[0].id;
  }
  updateUserDriveRootFolder(userId, rootVaultId);

  // ---------------------------------------------------------------------------
  // 3. Guaranteed Primary OWNER Profile Creation/Sync
  // ---------------------------------------------------------------------------
  let ownerProfile = db.getFirstSync<any>(
    `SELECT * FROM profiles WHERE userId = ? AND isOwner = 1`,
    [userId]
  );

  if (!ownerProfile) {
    ownerProfile = db.getFirstSync<any>(
      `SELECT * FROM profiles WHERE userId = ? AND LOWER(TRIM(name)) = ?`,
      [userId, primaryName.toLowerCase()]
    );
  }

  const existingOwner = db.getFirstSync<Profile>(
    `SELECT * FROM profiles
    WHERE userId = ?
    AND isOwner = 1`,
    [userId]
  );

 if (existingOwner) {
  db.runSync(
    `UPDATE profiles
    SET email = ?,
        vaultOwnerEmail = ?,
        sharedFolderId = ?
        WHERE id = ?`,
    [
      currentUserEmail,
      currentUserEmail,
      rootVaultId,
      existingOwner.id,
    ]
  );
} else {
  // Defensive: never create a vault owner for someone who already exists as a
  // FAMILY_MEMBER of another vault (belt-and-suspenders on top of the guard above).
  const alreadyFamilyMember = db.getFirstSync<any>(
    `SELECT id FROM profiles
     WHERE LOWER(TRIM(email)) = ? AND role = 'FAMILY_MEMBER'
     LIMIT 1`,
    [currentUserEmail]
  );
  if (alreadyFamilyMember) {
    console.warn(
      "REFUSING owner creation — user is a FAMILY_MEMBER:",
      currentUserEmail
    );
    return { recoveredCount: 0, rootVaultId };
  }
  db.runSync(
    `INSERT INTO profiles (
      id,userId,name,email,role,
      vaultOwnerEmail,sharedFolderId,
      isOwner,createdAt
    ) VALUES (?,?,?,?,?,?,?,?,?)`,
    [
      uuid.v4(),
      userId,
      primaryName,
      currentUserEmail,
      "MASTER_ADMIN",
      currentUserEmail,
      rootVaultId,
      1,
      Date.now(),
    ]
  );
}

  // ownerProfile = db.getFirstSync<any>(`SELECT * FROM profiles WHERE id = ?`, [ownerProfileId]);
  ownerProfile = db.getFirstSync<any>(
  `SELECT * FROM profiles
   WHERE userId = ?
   AND isOwner = 1`,
  [userId]
);

  let totalRecovered = 0;

  // ---------------------------------------------------------------------------
  // 4. Fetch Subfolders inside 'EzDocs' (Family Profiles vs Document Types)
  // ---------------------------------------------------------------------------
  const profileQuery = encodeURIComponent(
  `'${rootVaultId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
);
const profileRes = await fetch(`${DRIVE_API}?q=${profileQuery}&supportsAllDrives=true&includeItemsFromAllDrives=true`, {
  headers: { Authorization: `Bearer ${accessToken}` },
});
const subFolders = (await profileRes.json()).files || [];

for (const folder of subFolders) {
  const cleanFolderName = folder.name.trim();
  const isOwnerFolder = cleanFolderName.toLowerCase() === primaryName.toLowerCase();

  let targetProfileId: string;

  if (isOwnerFolder) {
    // Attach directly to the MASTER_ADMIN owner profile created in Section 3
    targetProfileId = ownerProfile.id;
    db.runSync(
      `UPDATE profiles SET sharedFolderId = ? WHERE id = ?`,
      [folder.id, ownerProfile.id]
    );
  } else {
    let profile = db.getFirstSync<any>(
  `SELECT *
   FROM profiles
   WHERE sharedFolderId = ?
   LIMIT 1`,
  [folder.id]
);


    targetProfileId = profile?.id || ((typeof uuid.v4 === "function" ? uuid.v4() : generateUuid()) as string);

    // db.runSync(
    //   `INSERT INTO profiles (
    //     id, userId, name, email, role, vaultOwnerEmail, sharedFolderId, isOwner, createdAt
    //    ) VALUES (?, ?, ?, ?, 'FAMILY_MEMBER', ?, ?, 0, ?)
    //    ON CONFLICT(userId, name) DO UPDATE SET
    //     sharedFolderId = excluded.sharedFolderId,
    //     vaultOwnerEmail = excluded.vaultOwnerEmail`,
    //   [
    //     targetProfileId,
    //     userId,
    //     cleanFolderName,
    //     null,
    //     currentUserEmail,
    //     folder.id,
    //     Date.now(),
    //   ]
    // );
  if (profile) {

  targetProfileId = profile.id;
  db.runSync(
    `UPDATE profiles
     SET sharedFolderId = ?,
         vaultOwnerEmail = ?
     WHERE id = ?`,
    [
      folder.id,
      currentUserEmail,
      profile.id,
    ]
  );
} else {
  targetProfileId =
    (typeof uuid.v4 === "function"
      ? uuid.v4()
      : generateUuid()) as string;

  db.runSync(
    `INSERT INTO profiles (
      id,
      userId,
      name,
      email,
      role,
      vaultOwnerEmail,
      sharedFolderId,
      isOwner,
      createdAt
    ) VALUES (?, ?, ?, ?, 'FAMILY_MEMBER', ?, ?, 0, ?)`,
    [
      targetProfileId,
      userId,
      cleanFolderName,
      null,
      currentUserEmail,
      folder.id,
      Date.now(),
    ]
  );

}
  }
  

  // ✅ REUSE recoverFromSharedFolder: Scans Category Folders -> Files (3-level traversal)
  const recResult = await recoverFromSharedFolder(userId, targetProfileId, folder.id, accessToken);
  totalRecovered += recResult?.recoveredCount || 0;

    // -------------------------------------------------------------------------
    // 5. RECOVER ADMIN/OWNER DATA: Process Document Type Subfolders under EzDocs
    // -------------------------------------------------------------------------
    const docTypeId = getOrCreateValidDocumentTypeId(cleanFolderName);

    const filesQuery = encodeURIComponent(
      `'${folder.id}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed = false`
    );
    const filesRes = await fetch(`${DRIVE_API}?q=${filesQuery}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const driveFiles = (await filesRes.json()).files || [];

    for (const file of driveFiles) {
      const existingByDriveId = db.getFirstSync<any>(
        `SELECT id FROM documents WHERE googleDriveFileId = ?`,
        [file.id]
      );

      if (!existingByDriveId) {
        const documentTitle = cleanFolderName || file.name;

        const existingByProfileAndType = db.getFirstSync<any>(
          `SELECT id FROM documents WHERE profileId = ? AND documentTypeId = ?`,
          [ownerProfile.id, docTypeId]
        );

        if (existingByProfileAndType) {
          db.runSync(
            `UPDATE documents 
             SET googleDriveFileId = ?, fileName = ?, title = ?, mimeType = ?, createdAt = ? 
             WHERE id = ?`,
            [
              file.id,
              file.name,
              documentTitle,
              file.mimeType || 'application/pdf',
              Date.now(),
              existingByProfileAndType.id,
            ]
          );
        } else {
          createDocument({
            id: (typeof uuid.v4 === "function" ? uuid.v4() : generateUuid()) as string,
            profileId: ownerProfile.id,
            documentTypeId: docTypeId,
            title: documentTitle,
            fileName: file.name,
            fileUri: '',
            mimeType: file.mimeType || 'application/pdf',
            googleDriveFileId: file.id,
            createdAt: Date.now(),
          });
          totalRecovered++;
        }
      }
    }
  }

  return { recoveredCount: totalRecovered, rootVaultId };
}

export async function deleteFileFromDrive(driveFileId: string): Promise<boolean> {
  const accessToken = await getValidAccessToken();

  if (!accessToken) {
    console.warn("No valid access token available for Drive deletion.");
    return false;
  }

  const response = await fetch(`${DRIVE_FILES_API}/${driveFileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    const errorData = await response.json().catch(() => ({}));
    console.warn(`Drive file deletion failed (${response.status}):`, errorData);
    return false;
  }

  return true; // Returns true if deleted or if it was already missing (404)
}


export async function updateFileInDriveVault(params: {
  driveFileId: string;
  localUri: string;
  fileName: string;
  mimeType: string;
}) {
  const accessToken = await getValidAccessToken();

  const file = new File(params.localUri);
  const base64Data = await file.base64();

  const boundary = 'vault_boundary_xyz';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadata = {
    name: params.fileName,
    mimeType: params.mimeType,
  };

  const multipartBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${params.mimeType}\r\n` +
    'Content-Transfer-Encoding: base64\r\n\r\n' +
    base64Data +
    closeDelimiter;

  const res = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files/${params.driveFileId}?uploadType=multipart`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    }
  );

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(`Drive Update Failed: ${errorData.error?.message || 'Unknown Error'}`);
  }

  return await res.json();
}


export async function downloadFileFromDrive(fileId: string, fileName: string): Promise<string> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) throw new Error("No access token available");

  const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  // Create a File instance pointing to document directory
  const destinationFile = new File(Paths.document, fileName);

  // 1. If file already exists locally, delete it or return its path directly
  if (destinationFile.exists) {
    try {
      destinationFile.delete(); // Removes old copy to allow fresh download
    } catch (e) {
      console.warn("Could not delete existing file, attempting download anyway", e);
    }
  }

  // Download directly to the file
  await File.downloadFileAsync(downloadUrl, destinationFile, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return destinationFile.uri;
}


export async function uploadDocumentForActiveProfile(file: {
  uri: string;
  name: string;
  mimeType: string;
  categoryName: string;
}) {

  const accessToken = await getValidAccessToken();
  const activeProfileId = await getCurrentProfileId();  
  if (!activeProfileId) throw new Error("No active profile selected.");

  const profile = getProfileById(activeProfileId);
  const profileName = profile?.name || "Primary User";

  let targetParentFolderId: string;

 // Handles active destination depending on whether profile is Family Member or Master Admin
  if (profile?.role === 'FAMILY_MEMBER' && profile?.sharedFolderId) {
    targetParentFolderId = await getOrCreateFolder(file.categoryName, profile.sharedFolderId, accessToken);
  } else {
    const rootVaultId = await getOrCreateFolder("EzDocs", "root", accessToken);
    const profileFolderId = await getOrCreateFolder(profileName, rootVaultId, accessToken);
    targetParentFolderId = await getOrCreateFolder(file.categoryName, profileFolderId, accessToken);
  }

  // 2. Perform multipart upload directly to categoryFolderId
  const expoFile = new File(file.uri);
  const base64Data = await expoFile.base64();

  const boundary = 'vault_boundary_xyz';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadata = {
    name: file.name,
    mimeType: file.mimeType,
    parents: [targetParentFolderId], // 👈 Directly targets resolved folder
  };

  const multipartBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${file.mimeType}\r\n` +
    'Content-Transfer-Encoding: base64\r\n\r\n' +
    base64Data +
    closeDelimiter;

  const res = await fetch(DRIVE_UPLOAD_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartBody,
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(`Drive Upload Failed: ${errorData.error?.message || 'Unknown Error'}`);
  }
  const uploadedFile = await res.json();
  return uploadedFile;
}


// driveSyncService.ts

export async function deleteFolderIfEmpty(folderId: string): Promise<void> {
  try {
    const accessToken = await getValidAccessToken();
    if (!accessToken) {
      console.warn("No valid access token available for folder cleanup.");
      return;
    }
    // 1. Check if any active files remain in this folder
    const query = encodeURIComponent(
      `'${folderId}' in parents and trashed = false`
    );

    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id)`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const data = await res.json();

    // 2. If no files exist inside, delete the folder
    if (data.files && data.files.length === 0) {
      await fetch(`https://www.googleapis.com/drive/v3/files/${folderId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    }
  } catch (error) {
    console.warn("Failed to clean up empty folder from Drive:", error);
  }
}


export async function deleteDocumentFileAndCleanFolder(
  googleDriveFileId: string
): Promise<boolean> {
  try {
    const accessToken = await getValidAccessToken();
    if (!accessToken) return false;

    // Step A: Fetch parent folder ID before deleting the file
    let parentFolderId: string | null = null;
    try {
      const infoRes = await fetch(
        `${DRIVE_FILES_API}/${googleDriveFileId}?fields=parents`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      if (infoRes.ok) {
        const infoData = await infoRes.json();
        parentFolderId = infoData.parents?.[0] || null;
      }
    } catch (e) {
      console.warn("Could not retrieve parent folder ID prior to deletion:", e);
    }

    // Step B: Delete the actual file
    const isDeleted = await deleteFileFromDrive(googleDriveFileId);

    // Step C: If deletion succeeded and a parent exists, clean up the folder if now empty
    if (isDeleted && parentFolderId) {
      await deleteFolderIfEmpty(parentFolderId);
    }

    return isDeleted;
  } catch (error) {
    console.warn("Failed to complete file deletion and folder cleanup sequence:", error);
    return false;
  }
}



/**
 * Grants 'writer' or 'reader' permission for a specific folder to a family member's Gmail.
 */
export async function grantFolderPermission({
  folderId,
  emailAddress,
  role = 'writer',
  sendNotificationEmail = false,
}: GrantPermissionParams): Promise<boolean> {
  try {
    const accessToken = await getValidAccessToken();
    if (!accessToken) {
      console.warn("No valid access token available to grant Drive permissions.");
      return false;
    }

    const url = `${DRIVE_FILES_API}/${folderId}/permissions?sendNotificationEmail=${sendNotificationEmail}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: role,
        type: 'user',
        emailAddress: emailAddress.trim().toLowerCase(),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`Failed to grant permission (${response.status}):`, errorData);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error granting Drive folder permission:", error);
    return false;
  }
}

/**
 * Searches for profile folders shared with the current logged-in family member.
 */
export async function findSharedProfileFolder(profileName: string): Promise<string | null> {
  try {
    const accessToken = await getValidAccessToken();
    if (!accessToken) return null;

    // Query for shared folders matching the profile name
    const query = encodeURIComponent(
      `sharedWithMe = true and mimeType = 'application/vnd.google-apps.folder' and name = '${profileName}' and trashed = false`
    );

    const res = await fetch(`${DRIVE_FILES_API}?q=${query}&fields=files(id, name)`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id; // Return the shared folder ID
    }

    return null;
  } catch (error) {
    console.warn("Failed to find shared profile folder:", error);
    return null;
  }
}


/**
 * Resolves the target Profile Folder ID whether the user owns it or it was shared with them.
 */
export async function resolveProfileFolderId(
  profileName: string,
  accessToken: string
): Promise<string | null> {
  // 1. First, check if the folder exists in their own Drive
  const rootVaultId = await getOrCreateFolder("EzDocs", "root", accessToken);
  const ownedFolderId = await getOrCreateFolder(profileName, rootVaultId, accessToken);

  if (ownedFolderId) {
    return ownedFolderId;
  }

  // 2. If not found in owned folders, look for a folder shared with them by the Admin
  const sharedFolderId = await findSharedProfileFolder(profileName);
  return sharedFolderId;
}


/**
 * Checks if a user is currently signed into Google Drive and retrieves their info.
 */
export async function getMasterDriveAccount(): Promise<{ email: string } | null> {
  try {
    const currentUser = GoogleSignin.getCurrentUser();

    if (currentUser?.user?.email) {
      return { email: currentUser.user.email };
    }

    // Fallback: If null, try restorePreviousSignIn in case session is cached
    const restoredUser = await GoogleSignin.signInSilently();
    if (restoredUser?.data?.user?.email) {
      return { email: restoredUser.data.user.email };
    }

    return null;
  } catch (error) {
    console.warn("Failed to retrieve Master Drive account status:", error);
    return null;
  }
}


/**
 * Prompts Google Sign-In to connect/authenticate the Master Drive account.
 */
 
export async function connectMasterDrive(): Promise<{
  success: boolean;
  email?: string;
  message?: string;}> {
  try {
    await GoogleSignin.hasPlayServices();

     //if you want to show the email selection popup everytime when login with google.
     //this code clear cache and show the popup, if you want to direct 
     //login without asking email selection then comment this try catch block
    try {
      const tokens = await GoogleSignin.getTokens();
      if (tokens?.accessToken) {
        await GoogleSignin.clearCachedAccessToken(tokens.accessToken);
      }
    } catch (_) {
      // Safe to ignore if no session existed
    }
    
    const response = await GoogleSignin.signIn();

    if (response?.data?.user?.email) {
      return {
        success: true,
        email: response.data.user.email,
      };
    }

    return {
      success: false,
      message: "Sign-in was cancelled or incomplete.",
    };
  } catch (error: any) {
    console.error("Master Drive Connection Error:", error);
    return {
      success: false,
      message: error.message || "Failed to connect Google Drive.",
    };
  }
}

// export async function connectMasterDrive(): Promise<{
//   success: boolean;
//   email?: string;
//   message?: string;
// }> {
//   try {
//     await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

//     // 1. Clear cached native tokens
//     try {
//       const tokens = await GoogleSignin.getTokens();
//       if (tokens?.accessToken) {
//         await GoogleSignin.clearCachedAccessToken(tokens.accessToken);
//       }
//     } catch (_) {
//       // Safe to ignore if no session existed
//     }

//     // 2. Perform deep sign-out and revoke access
//     try {
//       await GoogleSignin.revokeAccess();
//       await GoogleSignin.signOut();
//     } catch (_) {
//       // Safe to ignore
//     }

//     // 4. Trigger sign-in (Android presents bottom sheet account selection)
//     const response = await GoogleSignin.signIn();
//     const userEmail = (response as any)?.data?.user?.email || (response as any)?.user?.email;

//     if (userEmail) {
//       return {
//         success: true,
//         email:userEmail.toLowerCase(),
//       };
//     }

//     return {
//       success: false,
//       message: "Sign-in was cancelled or incomplete.",
//     };
//   } catch (error: any) {
//     console.error("Master Drive Connection Error:", error);
//     return {
//       success: false,
//       message: error.message || "Failed to connect Google Drive.",
//     };
//   }
// }


/**
 * Signs out of the Master Drive Google Account.
 */
export async function disconnectMasterDrive(): Promise<boolean> {
  try {
    await GoogleSignin.revokeAccess();
    await GoogleSignin.signOut();
    return true;
  } catch (error) {
    console.error("Error disconnecting Master Drive:", error);
    try {
      await GoogleSignin.signOut();
      return true;
    } catch (_) {
      return false;
    }
  }
}