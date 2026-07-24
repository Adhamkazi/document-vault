import React, { forwardRef } from "react";
import BottomSheet from "@gorhom/bottom-sheet";

import ActionSheet, {
  ActionItem,
} from "@/src/components/ActionSheet";
import type { Profile } from "@/src/types/profile";

type Props = {
  profile: Profile | null;
  isCurrent: boolean;

  onSwitch: (profile: Profile) => void;
  onEdit: (profile: Profile) => void;
  onDelete: (profile: Profile) => void;
};

const FamilyActionSheet = forwardRef<BottomSheet, Props>(
  (
    {
      profile,
      isCurrent,
      onSwitch,
      onEdit,
      onDelete,
    },
    ref
  ) => {
    if (!profile) return null;

    const actions: ActionItem[] = [];

    if (!isCurrent) {
      actions.push({
        title: "Switch Profile",
        icon: "swap-horizontal-outline",
        onPress: () => onSwitch(profile),
      });
    }

    actions.push({
      title: "Edit Profile",
      icon: "create-outline",
      onPress: () => onEdit(profile),
    });

    if (!profile.isOwner) {
      actions.push({
        title: "Delete Profile",
        icon: "trash-outline",
        destructive: true,
        onPress: () => onDelete(profile),
      });
    }

    return (
      <ActionSheet
        ref={ref}
        title={profile.name}
        actions={actions}
      />
    );
  }
);

export default FamilyActionSheet;