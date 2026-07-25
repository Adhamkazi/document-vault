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
import { getProfilesByUserId } from "@/src/database/profileRepository";
import { getCurrentUserId,getCurrentProfileId  } from "@/src/utils/authStorage";
import type { Profile } from "@/src/types/profile";
import { Ionicons } from "@expo/vector-icons";
import { Alert } from "react-native";
import { setCurrentProfileId } from "@/src/utils/authStorage";
import BottomSheet from "@gorhom/bottom-sheet";
import FamilyActionSheet, { FamilyActionSheetRef } from "../components/Family/FamilyActionSheet";
import { showSuccess,showError } from "@/src/utils/toast";
import { removeFamilyMember } from "../services/addFamilyService";

export default function FamilyMembersScreen() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [currentProfileId, setCurrentProfileIdState] = useState("");

const sheetRef = useRef<FamilyActionSheetRef>(null);

  const loadProfiles = useCallback(async () => {
    try {
      const userId = await getCurrentUserId ();
      if (!userId) {
        setProfiles([]);
        return;
      }
      const activeProfile = await getCurrentProfileId();
      setCurrentProfileIdState(activeProfile ?? "");
      const data = getProfilesByUserId(userId);
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
    sheetRef.current?.open(
      profile,
      profile.id === currentProfileId
    );
  };

const handleSwitchProfile = async (profile: Profile) => {
  await setCurrentProfileId(profile.id);
  await loadProfiles();
  showSuccess(
    "Profile Switched",
    `Now viewing ${profile.name}'s documents.`
  );
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

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => router.push("/family")}
      >
        <Ionicons
          name="add"
          size={22}
          color="#FFF"
        />
      </TouchableOpacity>
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
        <FamilyMemberCard
          empty
          onAdd={() => router.push("/family")}
        />
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
      onSwitch={handleSwitchProfile}
      onEdit={handleEditProfile}
      onDelete={handleDeleteProfile}
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
  fontSize: 28,
  fontWeight: "700",
  color: Colors.text,
},

subtitle: {
  marginTop: 6,
  fontSize: 15,
  color: Colors.subtitle,
},

addButton: {
  width: 46,
  height: 46,
  borderRadius: 23,
  backgroundColor: Colors.primary,
  justifyContent: "center",
  alignItems: "center",
},


listContent: {
  paddingHorizontal: 20,
  paddingBottom: 40,
},
header: {
  paddingHorizontal: 20,
  paddingTop: 12,
  paddingBottom: 18,

  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
},

backButton: {
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: "#F3F4F6",
  justifyContent: "center",
  alignItems: "center",
  marginRight: 10,
},

headerText: {
  flex: 1,
},


sectionTitle: {
  fontSize: 18,
  fontWeight: "700",
  color: Colors.text,

  marginTop: 18,
  marginBottom: 12,
},
});