import React, { forwardRef } from "react";
import { View, Text,  StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/src/constants/colors";
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetView,

} from "@gorhom/bottom-sheet";

export type ActionItem = {
  title: string;
   icon?:string,
  onPress: () => void;
  destructive?: boolean;
  tint?: string;
};

type ActionSheetProps = {
  title: string;
  actions: ActionItem[];
};

const ActionSheet = forwardRef<BottomSheetModal, ActionSheetProps>(
  ({ title, actions  }, ref) => {
    
    const renderBackdrop = (props: any) => (

    <BottomSheetBackdrop
      {...props}
      appearsOnIndex={0}
      disappearsOnIndex={-1}
      pressBehavior="close"
    />
  );
    return (
      <BottomSheetModal
        ref={ref}
        enableDynamicSizing={true}
        animateOnMount={false}
        backdropComponent={renderBackdrop}
        enablePanDownToClose={true}
        maxDynamicContentSize={500}
        backgroundStyle={{
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
        }}
      >
        <BottomSheetView style={styles.container}>
          <Text style={styles.title}>{title}</Text>

          {actions.map((action, index) => {
            const tint = action.tint || (action.destructive ? Colors.error : undefined);
            const textColor = tint || Colors.text;
            const iconColor = tint || (action.destructive ? Colors.error : Colors.subtitle);

            return (
              <Pressable
                key={index}
                style={styles.item}
                android_ripple={{ color: "#ECECEC" }}
                onPress={() => {
                  if (
                    ref &&
                    typeof ref !== "function" &&
                    ref.current
                  ) {
                    ref.current.dismiss();
                  }
                  setTimeout(() => {
                    action.onPress();
                  }, 250);
                }}
              >
                {action.icon ? (
                  <Ionicons
                    name={action.icon as any}
                    size={20}
                    color={iconColor}
                    style={styles.icon}
                  />
                ) : null}
                <Text style={[styles.itemText, { color: textColor }]}>
                  {action.title}
                </Text>
              </Pressable>
            );
          })}
        </BottomSheetView>
      </BottomSheetModal>
    );
  }
);

export default ActionSheet;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },

  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 20,
    color: Colors.text,
  },

  item: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#ECECEC",
    flexDirection: "row",
    alignItems: "center",
  },

  icon: {
    marginRight: 12,
  },

  itemText: {
    fontSize: 17,
    color: Colors.text,
  },

  destructive: {
    color: Colors.error,
  },
});