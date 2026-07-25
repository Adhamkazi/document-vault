import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
} from "react";
import BottomSheet from "@gorhom/bottom-sheet";
import ActionSheet from "@/src/components/ActionSheet";

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
  const sheetRef = useRef<BottomSheet>(null);

  useImperativeHandle(ref, () => ({
    open() {
      sheetRef.current?.expand();
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
          onPress: () => {
            sheetRef.current?.close();
            onCamera();
          },
        },
        {
          title: "Choose PDF / File",
          icon: "document-outline",
          onPress: () => {
            sheetRef.current?.close();
            onDocument();
          },
        },
        {
          title: "Cancel",
          onPress: () => sheetRef.current?.close(),
        },
      ]}
    />
  );
});

export default FileSourceActionSheet;