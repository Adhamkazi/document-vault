import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import BottomSheet from "@gorhom/bottom-sheet";

import ActionSheet, {
  ActionItem,
} from "@/src/components/ActionSheet";

import type { Profile } from "@/src/types/profile";

export type FamilyActionSheetRef = {
  open: (profile: Profile, isCurrent: boolean) => void;
};

type Props = {
  onSwitch: (profile: Profile) => void;
  onEdit: (profile: Profile) => void;
  onDelete: (profile: Profile) => void;
};

const FamilyActionSheet = forwardRef<
  FamilyActionSheetRef,
  Props
>(({ onSwitch, onEdit, onDelete }, ref) => {
  const sheetRef = useRef<BottomSheet>(null);

  const [selectedProfile, setSelectedProfile] =
    useState<Profile | null>(null);

  const [isCurrentProfile, setIsCurrentProfile] =
    useState(false);

  useImperativeHandle(ref, () => ({
    open(profile, isCurrent) {
      setSelectedProfile(profile);
      setIsCurrentProfile(isCurrent);

      requestAnimationFrame(() => {
        sheetRef.current?.expand();
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

    actions.push({
      title: "Edit Profile",
      icon: "create-outline",
      onPress: () => onEdit(selectedProfile),
    });

    if (!selectedProfile.isOwner) {
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