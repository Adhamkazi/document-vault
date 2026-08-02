import React, { createContext, useContext, useState, useEffect } from "react";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import uuid from "react-native-uuid";

// Database Repositories
import { db } from '@/src/database/database';
import { getUserByEmail, createUser } from "../database/userRepository";
import { createProfile, getProfilesByUserId, getOwnerProfile, getProfileById } from "../database/profileRepository";
import { createAppSettings } from "../database/appSettingsRepository";
import { createNotificationSettings } from "../database/notificationRepository";

// Storage & Services
import { getUserSession, saveUserSession, clearUserSession, setCurrentProfileId } from "@/src/utils/authStorage";
import { configureGoogleAuth, syncAndRecoverFromDrive } from "../services/driveSyncService";
import { handleGooglePostSignIn, PostSignInResult } from "../services/loginUser";
import { completeUserOnboarding } from "../services/onboardingService";

type UserType = {
  id: string;
  email: string;
};

type AuthContextType = {
  user: UserType | null;
  activeProfile: any | null;
  profiles: any[];
  isLoading: boolean;
  signInWithGoogle: () => Promise<PostSignInResult | null>;
  signInWithCredentials: (userId: string, profileId: string) => Promise<void>;
  switchProfile: (profileId: string) => void;

  completeOnboarding: (
    userName: string,
    choice: 'CREATE_VAULT' | 'JOIN_VAULT',
    targetVaultOwnerEmail?: string,
    sharedFolderId?: string
  ) => Promise<{
    profileId: string;
    role: 'MASTER_ADMIN' | 'FAMILY_MEMBER';
    vaultOwnerEmail: string;
    isOwner: boolean;
  }>;
  reloadProfiles: (userId?: string) => void;
  signOut: () => Promise<void>;
  linkGoogleAccount: () => Promise<boolean>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserType | null>(null);
  const [activeProfile, setActiveProfile] = useState<any | null>(null);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 1. Initialize Google Auth and restore active session on app launch
  useEffect(() => {
    configureGoogleAuth("495764806002-24ld7l7dkh9huco3f4riobu722pbb486.apps.googleusercontent.com");

    async function restoreSession() {
      try {
        const session = await getUserSession();
        if (session?.userId) {
          const userProfiles = getProfilesByUserId(session.userId);
          if (userProfiles.length > 0) {
            const owner = userProfiles.find((p) => p.isOwner === 1);
            const active = userProfiles.find((p) => p.id === session.profileId) || owner || userProfiles[0];
            
            setUser({ id: session.userId, email: active.email || owner?.email || "" });
            setProfiles(userProfiles);
            setActiveProfile(active);
          }
        }
      } catch (error) {
        console.error("Failed to restore auth session:", error);
      } finally {
        setIsLoading(false);
      }
    }

    restoreSession();
  }, []);

  // Helper to sync profiles for a specific user ID
  const reloadProfiles = (userId?: string) => {
    const targetUserId = userId || user?.id;
    if (!targetUserId) return;

    const list = getProfilesByUserId(targetUserId);
    setProfiles(list);
    
    // Fall back to first profile if activeProfile is missing or invalidated
    if (list.length > 0 && (!activeProfile || !list.some(p => p.id === activeProfile.id))) {
      setActiveProfile(list[0]);
    }
  };

  // 2. Email / Password Login Handler
  const signInWithCredentials = async (userId: string, profileId: string) => {
    await saveUserSession(userId, profileId);
    
    const userProfiles = getProfilesByUserId(userId);
    const selectedProfile = userProfiles.find((p) => p.id === profileId) || userProfiles[0];

    setUser({ id: userId, email: selectedProfile?.email || "" });
    setProfiles(userProfiles);
    setActiveProfile(selectedProfile);
  };

  // 3. Google Sign-In Handler
  const signInWithGoogle = async (): Promise<PostSignInResult | null> => {
    try {
      setIsLoading(true);
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const email = userInfo.data?.user.email;
      const googleName = userInfo.data?.user.name;
    
      if (!googleName) throw new Error("No UserName returned from Google Sign-In.");
      if (!email) throw new Error("No email returned from Google Sign-In.");

      const normalizedEmail = email.trim().toLowerCase();
      let localUser = getUserByEmail(normalizedEmail);
      let userId = localUser?.id;

      if (!localUser) {
        userId = uuid.v4() as string;
        const now = Date.now();

        createUser({
          id: userId,
          email: normalizedEmail,
          passwordHash: "",
          authProvider: "GOOGLE",
          googleDriveFolderId: null,
          createdAt: now,
        });

        createAppSettings({
          id: uuid.v4() as string,
          userId, 
          createdAt: now, 
          biometricEnabled: 0, 
          defaultProfileId: "",
          updatedAt: null
        });

        createNotificationSettings({
          id: uuid.v4() as string,
          userId,
          notify90: 1,
          notify60: 1,
          notify30: 1,
          notify7: 1,
          notify1: 1,
          emailNotification: 1,
          pushNotification: 1,
        });
      }

      // Recover drive state (both Master Vault & Shared Vaults).
      // Identity is resolved inside syncAndRecoverFromDrive (family-first),
      // so we do not pre-resolve a family profile here.
      await syncAndRecoverFromDrive(userId!, undefined, googleName, normalizedEmail);
      const profilesData = db.getAllSync(`
        SELECT
          id,
          name,
          email,
          role,
          vaultOwnerEmail,
          sharedFolderId
        FROM profiles
      `);
      const postSignInResult = await handleGooglePostSignIn(normalizedEmail, userId!);
      let currentProfiles = getProfilesByUserId(userId!);

      // Fallback: If no profiles are associated with this userId, check for existing profiles by email and re-assign them
      if (currentProfiles.length === 0 && userId) {
        const crossUserProfiles = db.getAllSync<any>(
          `SELECT * FROM profiles WHERE LOWER(TRIM(email)) = ?`,
          [normalizedEmail]
        );
        if (crossUserProfiles.length > 0) {
          db.runSync(
            `UPDATE profiles SET userId = ? WHERE LOWER(TRIM(email)) = ?`,
            [userId, normalizedEmail]
          );
          currentProfiles = getProfilesByUserId(userId!);
        }
      }

      if (currentProfiles.length > 0) {
        // Priority for active profile: 
        // 1. PostSignIn active vault profile
        // 2. Owner profile (if Master Admin)
        // 3. First family member profile recovered
        const ownerProfile = currentProfiles.find((p) => p.isOwner === 1);
        const activeProfileId = postSignInResult.activeVault?.profileId || ownerProfile?.id || currentProfiles[0].id;


        const selectedProfile = currentProfiles.find((p) => p.id === activeProfileId) || currentProfiles[0];

        await saveUserSession(userId!, selectedProfile.id);
        
        await setCurrentProfileId(selectedProfile.id);

        setUser({ id: userId!, email: normalizedEmail });
        setProfiles(currentProfiles);
        setActiveProfile(selectedProfile);

        return {
          ...postSignInResult,
          needsOnboarding: false,
        };
      } else {
        // Truly new user (no EzDocs folder or shared profiles exist on Drive)
        setUser({ id: userId!, email: normalizedEmail });
        setProfiles([]);
        setActiveProfile(null);

        return {
          ...postSignInResult,
          needsOnboarding: true,
        };
      }
    } catch (error:any) {
      console.error("Google Sign-In Error:", error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // 5. Switch Active Profile
  const switchProfile = async (profileId: string) => {
    // A family member may switch to another member's/owner's profile, which
    // belongs to a different userId, so the target won't be in the local
    // `profiles` array. Fall back to a DB lookup by id.
    const target =
      profiles.find((p) => p.id === profileId) ||
      getProfileById(profileId);
    if (target && user) {
      setActiveProfile(target);
      await saveUserSession(user.id, target.id);
      await setCurrentProfileId(target.id);
    }
  };

  // 6. Universal Sign-Out
  const signOut = async () => {
    try {
      await GoogleSignin.signOut();
    } catch (e) {
      // Ignore if not signed in via Google
    }
    await clearUserSession();
    setUser(null);
    setActiveProfile(null);
    setProfiles([]);
  };

  // 7. Link Google Account / Re-sync Drive
  const linkGoogleAccount = async (): Promise<boolean> => {
    if (!user) return false;

    try {
      setIsLoading(true);

      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const googleEmail = userInfo.data?.user.email;
      const googleName = userInfo.data?.user.name;

      if (!googleEmail) throw new Error("Failed to get email from Google.");

      // Sync drive with full parameter context
      await syncAndRecoverFromDrive(user.id, activeProfile?.id, googleName || '', googleEmail);

      reloadProfiles(user.id);
      return true;
    } catch (error) {
      console.error("Failed to link Google Drive:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // 8. Onboarding Completion
  const completeOnboarding: AuthContextType['completeOnboarding'] = async (
    userName,
    choice,
    targetVaultOwnerEmail,
    sharedFolderId
  ) => {
    if (!user) {
      throw new Error("Cannot complete onboarding: No active user session found.");
    }

    const result = await completeUserOnboarding({
      userId: user.id,
      email: user.email,
      userName,
      choice,
      targetVaultOwnerEmail,
      sharedFolderId,
    });

    await saveUserSession(user.id, result.profileId);
    await setCurrentProfileId(result.profileId);
    await reloadProfiles(user.id);

    return result;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        activeProfile,
        profiles,
        isLoading,
        signInWithGoogle,
        signInWithCredentials,
        switchProfile,
        completeOnboarding,
        reloadProfiles,
        linkGoogleAccount,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};