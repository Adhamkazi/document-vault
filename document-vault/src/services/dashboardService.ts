import { getCurrentProfileId } from "@/src/utils/authStorage";
import {
  getProfileById,
  getProfilesByVaultOwnerEmail
} from "@/src/database/profileRepository";
import {
  getTotalDocuments,
  getExpiringDocuments,
} from "@/src/database/documentRepository";
import type { DocumentRecord } from "@/src/types/document";

export type DashboardData = {
  totalDocuments: number;
  currentProfileName: string;
  totalProfiles: number;
  expiringSoon: number;
  expiringDocuments: DocumentRecord[];
};

export async function getDashboardData(): Promise<DashboardData> {
  const profileId = await getCurrentProfileId();

  if (!profileId) {
    return {
      totalDocuments: 0,
      currentProfileName: "",
      totalProfiles: 0,
      expiringSoon: 0,
      expiringDocuments: [],
    };
  }

  const profile = getProfileById(profileId);

  if (!profile) {
    return {
      totalDocuments: 0,
      currentProfileName: "",
      totalProfiles: 0,
      expiringSoon: 0,
      expiringDocuments: [],
    };
  }

  const totalDocuments = getTotalDocuments(profileId);

 const expiringDocuments =
  getExpiringDocuments(profileId);

const expiringSoon =
  expiringDocuments.length;


  

  const totalProfiles =
    getProfilesByVaultOwnerEmail(profile?.vaultOwnerEmail!).length;

  return {
    totalDocuments,
    currentProfileName: profile.name,
    totalProfiles,
    expiringSoon,
    expiringDocuments,
    
  };
}