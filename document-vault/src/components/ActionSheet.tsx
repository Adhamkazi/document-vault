import React, { forwardRef } from "react";
import { View, Text,  StyleSheet, Pressable } from "react-native";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { Colors } from "@/src/constants/colors";
import { BottomSheetBackdrop} from "@gorhom/bottom-sheet";
import { ScrollView } from "react-native-gesture-handler";


export type ActionItem = {
  title: string;
   icon?:string,
  onPress: () => void;
  destructive?: boolean;
  
};

type ActionSheetProps = {
  title: string;
  actions: ActionItem[];
};

const ActionSheet = forwardRef<BottomSheet, ActionSheetProps>(
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
      <BottomSheet
        ref={ref}
        index={-1}
        enableDynamicSizing
        backdropComponent={renderBackdrop}
        enablePanDownToClose
        backgroundStyle={{
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
        }}
      >
        <BottomSheetView style={styles.container}>
          <Text style={styles.title}>{title}</Text>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          >
          {actions.map((action, index) => (
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
                  ref.current.close();
                }
                setTimeout(() => {
                  action.onPress();
                }, 250);
                }}
              >
              <Text
                style={[
                  styles.itemText,
                  action.destructive && styles.destructive,
                ]}
              >
                {action.title}
              </Text>
            </Pressable>
          ))}
          </ScrollView>
        </BottomSheetView>
      </BottomSheet>
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
  },

  itemText: {
    fontSize: 17,
    color: Colors.text,
  },

  destructive: {
    color: Colors.error,
  },
});