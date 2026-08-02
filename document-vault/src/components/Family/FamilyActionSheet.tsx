import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { BottomSheetModal } from "@gorhom/bottom-sheet";

import ActionSheet, {
  ActionItem,
} from "@/src/components/ActionSheet";

import type { Profile } from "@/src/types/profile";
import { useNavigation } from "expo-router";
import { Colors } from "@/src/constants/colors";

export type FamilyActionSheetRef = {
  open: (profile: Profile, isCurrent: boolean) => void;
};

type Props = {
  isViewerOwner: boolean;
  onSwitch: (profile: Profile) => void;
  onEdit: (profile: Profile) => void;
  onDelete: (profile: Profile) => void;
  onPermission : (profile: Profile) => void;
};

const FamilyActionSheet = forwardRef<
  FamilyActionSheetRef,
  Props
>(({ isViewerOwner,onSwitch, onEdit, onDelete , onPermission}, ref) => {
  const sheetRef = useRef<BottomSheetModal>(null);

  const [selectedProfile, setSelectedProfile] =
    useState<Profile | null>(null);

  const navigation = useNavigation();
      
  useEffect(() => {
     const unsubscribe = navigation.addListener("beforeRemove", () => {
      sheetRef.current?.dismiss();
    }); 
    return unsubscribe;
  }, [navigation]);

  const [isCurrentProfile, setIsCurrentProfile] =
    useState(false);

  useImperativeHandle(ref, () => ({
    open(profile, isCurrent) {
      setSelectedProfile(profile);
      setIsCurrentProfile(isCurrent);

      requestAnimationFrame(() => {
        sheetRef.current?.present();;
      });
    },
  }));

  const actions: ActionItem[] = [];

  if (selectedProfile) {
    if (!isCurrentProfile) {
      actions.push({
        title: "Switch Profile",
        icon: "swap-horizontal-outline",
        onPress: () => onSwitch(selectedProfile),
      });
    }

        // 2. Restrict options: Only allow Edit, Grant Permission, and Delete if NOT the Owner
    if (isViewerOwner && !selectedProfile.isOwner) {
      actions.push({
        title: "Edit Profile",
        icon: "create-outline",
        onPress: () => onEdit(selectedProfile),
      });

      if (selectedProfile.email) {
        const hasDrivePermission = !!selectedProfile.sharedFolderId;

        actions.push({
          title: hasDrivePermission
            ? "Permission Granted"
            : "Grant Drive Permission",
          icon: hasDrivePermission
            ? "checkmark-circle"
            : "cloud-upload-outline",
          tint: hasDrivePermission ? Colors.success : undefined,
          onPress: () => onPermission(selectedProfile),
        });
      }

      actions.push({
        title: "Delete Profile",
        icon: "trash-outline",
        destructive: true,
        onPress: () => onDelete(selectedProfile),
      });
    }
  }


  return (
    <ActionSheet
      ref={sheetRef}
      title={selectedProfile?.name ?? ""}
      actions={actions}
    />
  );
});

export default FamilyActionSheet;