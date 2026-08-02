import React, { useCallback, useRef, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import FamilyMemberCard from "@/src/components/Family/FamilyMemberCard";
import { Colors } from "@/src/constants/colors";
import { getProfileById, getProfilesByVaultOwnerEmail, getOwnerProfile } from "@/src/database/profileRepository";
import { getCurrentProfileId  } from "@/src/utils/authStorage";
import type { Profile } from "@/src/types/profile";
import { Ionicons } from "@expo/vector-icons";
import { Alert } from "react-native";
import FamilyActionSheet, { FamilyActionSheetRef } from "../components/Family/FamilyActionSheet";
import { showSuccess,showError } from "@/src/utils/toast";
import { removeFamilyMember } from "../services/addFamilyService";
import { setupAndShareFamilyProfile } from "../services/profileService";
import { useAuth } from "../context/AuthContext";
import { syncAndRecoverFromDrive } from "../services/driveSyncService";

export default function FamilyMembersScreen() {
  const { switchProfile, user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [currentProfileId, setCurrentProfileIdState] = useState("");

const sheetRef = useRef<FamilyActionSheetRef>(null);

  const loadProfiles = useCallback(async () => {
    try {
    const activeProfileId = await getCurrentProfileId();

        if (!activeProfileId) {
          setProfiles([]);
          return;
        }

        setCurrentProfileIdState(activeProfileId);

        const activeProfile =
          getProfileById(activeProfileId);

        if (!activeProfile) {
          setProfiles([]);
          return;
        }

        const ownerEmail = activeProfile.vaultOwnerEmail ||  activeProfile.email;
        if (!ownerEmail) {
            setProfiles([]);
            return;
          }
        const data = getProfilesByVaultOwnerEmail(ownerEmail);
        setProfiles(data);
    } catch (error) {
      console.error("Failed to load profiles", error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfiles();
    }, [loadProfiles])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadProfiles();
    setRefreshing(false);
  };

  const handleProfilePress = (profile: Profile) => {
    if (profile.id === currentProfileId) {
     return;
    }
    sheetRef.current?.open(
      profile,
      profile.id === currentProfileId
    );
  };

  

const handleSwitchProfile = async (profile: Profile) => {
  try{
   await switchProfile(profile.id);
   // 2. Refresh local screen state if needed
    if (typeof loadProfiles === "function") {
      await loadProfiles();
    }
    showSuccess(
      "Profile Switched",
      `Now viewing ${profile.name}'s documents.`
    );
    // 3. Optional: Trigger a background sync specifically for the switched profile
    if (user?.id) {
      syncAndRecoverFromDrive(user.id, profile.id).catch((err) =>
        console.log("Background profile sync error:", err)
      );
    }
  }catch(error){
    console.error("Error switching profile:", error);
  }
};

  const handleEditProfile = (
    profile: Profile
  ) => {
    router.push({
      pathname: "/family",
      params: {
        profileId: profile.id,
      },
    });
};

const handleDeleteProfile = (
  profile: Profile
) => {

    Alert.alert(
    "Delete Profile",
    `Delete ${profile.name}? This action cannot be undone.`,
    [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const result =
            await removeFamilyMember(profile.id);

          if (!result.success) {
            showError(result.message!);
            return;
          }

          await loadProfiles();
          showSuccess(
            "Profile deleted successfully."
          );
        },
      },
    ]
  );
};

// Example function to call from an ActionSheet option
const handleGrantAccessOnDemand = async (profile: Profile) => {
  if (!profile.email) {
    Alert.alert("Email Required", "Please edit this profile and add a valid Gmail address first.");
    return;
  }

  const success = await setupAndShareFamilyProfile({
    profileId: profile.id,
    profileName: profile.name,
    gmailAddress: profile.email,
    role: "writer",
  });
  if (success) {
    // Refresh so the profile's persisted sharedFolderId updates the
    // action-sheet label to "Permission Granted" on next open.
    await loadProfiles();
    showSuccess(`Granted Drive permissions to ${profile.email}`);
  } else {
    showError("Could not grant Drive access. Please check network/auth.");
  }
}


  if (profiles.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <FamilyMemberCard
          empty
          onAdd={() => router.push("/family")}
        />
      </SafeAreaView>
    );
  }

const owner = profiles.find((p) => p.isOwner === 1);

const familyMembers = profiles.filter(
  (p) => p.isOwner === 0
);

// Admin-only actions are gated by who is LOGGED IN (the vault owner's account),
// not by which profile is currently active — otherwise a family member could
// switch to the owner's profile and gain Edit/Delete/Grant access.
const isViewerOwner = user ? !!getOwnerProfile(user.id) : false;



return (
  <SafeAreaView style={styles.container}>
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
        activeOpacity={0.7}
      >
        <Ionicons name="chevron-back" size={24} color={Colors.text} />
      </TouchableOpacity>

      <View style={styles.headerText}>
        <Text style={styles.title}>
          Family Members
        </Text>

        <Text style={styles.subtitle}>
          Manage all family profiles
        </Text>
      </View>

    {isViewerOwner && (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push("/family")}
        >
          <Ionicons name="add" size={22} color="#FFF" />
        </TouchableOpacity>
      )}
    </View>

    <FlatList
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      }
      ListHeaderComponent={
        <>
          {owner && (
            <>
              <Text style={styles.sectionTitle}>
                Your Profile
              </Text>

              <FamilyMemberCard
                profile={owner}
                isCurrent={owner.id === currentProfileId}
                onPress={() => handleProfilePress(owner)}
              />
            </>
          )}

          <Text style={styles.sectionTitle}>
            Family Members
          </Text>
        </>
      }
      ListEmptyComponent={
        isViewerOwner ? (
          <FamilyMemberCard empty onAdd={() => router.push("/family")} />
        ) : null
      }
      data={familyMembers}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      renderItem={({ item }) => (
        <FamilyMemberCard
          profile={item}
          isCurrent={
            item.id === currentProfileId
           }
          onPress={() => handleProfilePress(item)}
        />
      )}
    />
    <FamilyActionSheet
      ref={sheetRef}
      isViewerOwner={isViewerOwner}
      onSwitch={handleSwitchProfile}
      onEdit={handleEditProfile}
      onDelete={handleDeleteProfile}
      onPermission={handleGrantAccessOnDemand}
    />
  </SafeAreaView>
);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

title: {
  fontSize: 24,
  fontWeight: "700",
  color: Colors.text,
},

subtitle: {
  marginTop: 2,
  fontSize: 13,
  color: Colors.subtitle,
},

addButton: {
  width: 44,
  height: 44,
  borderRadius: 14,
  backgroundColor: Colors.primary,
  justifyContent: "center",
  alignItems: "center",
  shadowColor: Colors.primary,
  shadowOpacity: 0.25,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,
},


listContent: {
  paddingHorizontal: 20,
  paddingBottom: 40,
},
header: {
  paddingHorizontal: 20,
  paddingTop: 14,
  paddingBottom: 16,

  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
},

backButton: {
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: Colors.card,
  borderWidth: 1,
  borderColor: Colors.border,
  justifyContent: "center",
  alignItems: "center",
  marginRight: 14,
},

headerText: {
  flex: 1,
},


sectionTitle: {
  fontSize: 13,
  fontWeight: "700",
  color: Colors.subtitle,
  textTransform: "uppercase",
  letterSpacing: 0.6,

  marginTop: 24,
  marginBottom: 10,
},
});