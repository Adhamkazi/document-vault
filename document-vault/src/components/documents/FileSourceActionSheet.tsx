import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import ActionSheet from "@/src/components/ActionSheet";
import { useNavigation } from "expo-router";

export type FileSourceActionSheetRef = {
  open: () => void;
};

type Props = {
  onCamera: () => void;
  onDocument: () => void;
};

const FileSourceActionSheet = forwardRef<
  FileSourceActionSheetRef,
  Props
>(({ onCamera, onDocument }, ref) => {
  const sheetRef = useRef<BottomSheetModal>(null);

  const navigation = useNavigation();
  
    useEffect(() => {
        const unsubscribe = navigation.addListener("beforeRemove", () => {
          sheetRef.current?.dismiss();
      });
  
    return unsubscribe;
  }, [navigation]);

  useImperativeHandle(ref, () => ({
    open() {
      sheetRef.current?.present();
    },
    
  }));

  return (
    <ActionSheet
      ref={sheetRef}
      title="Select Document Source"
      actions={[
        {
          title: "Take Photo",
          icon: "camera-outline",
          onPress: onCamera,
        },
        {
          title: "Choose PDF / File",
          icon: "document-outline",
          onPress: onDocument,
        },
        {
          title: "Cancel",
          onPress: () => sheetRef.current?.dismiss(),
        },
      ]}
    />
  );
});

export default FileSourceActionSheet;