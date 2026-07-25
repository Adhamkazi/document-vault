import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import BottomSheet from "@gorhom/bottom-sheet";
import { router } from "expo-router";
import * as Sharing from "expo-sharing";
import { Alert } from "react-native";
import ActionSheet from "@/src/components/ActionSheet";
import type { DocumentRecord } from "@/src/types/document";

export type DocumentActionSheetRef = {
  open: (document: DocumentRecord) => void;
};

type Props = {
  onDelete: (document: DocumentRecord) => void;
  onView?: (document: DocumentRecord) => void;
  showOption? : boolean;
};

const DocumentActionSheet = forwardRef<
  DocumentActionSheetRef,
  Props
>(({ onDelete, showOption }, ref) => {

  const sheetRef = useRef<BottomSheet>(null);

  const [selectedDocument, setSelectedDocument] =
    useState<DocumentRecord | null>(null);
    

  useImperativeHandle(ref, () => ({
    open(document) {
      setSelectedDocument(document);
      sheetRef.current?.expand();
    },
  }));

  if (!selectedDocument) {
    return (
      <ActionSheet
        ref={sheetRef}
        title=""
        actions={[]}
      />
    );
  }
const handleShare = async () => {
  if (!selectedDocument) return;

  try {
    const available = await Sharing.isAvailableAsync();

    if (!available) {
      Alert.alert(
        "Sharing unavailable",
        "Sharing is not supported on this device."
      );
      return;
    }

    await Sharing.shareAsync(selectedDocument.fileUri);

    sheetRef.current?.close();
  } catch (error) {
    console.error(error);

    Alert.alert(
      "Error",
      "Unable to share document."
    );
  }
};
  return (
    <ActionSheet
      ref={sheetRef}
      title={selectedDocument.title}
      actions={[
        ...(showOption
          ? [
              {
                title: "View",
                onPress: () => {
                  sheetRef.current?.close();

                  router.push({
                    pathname: "/viewer",
                    params: {
                      id: selectedDocument.id,
                    },
                  });
                },
              },
            ]
          : []),
        {
          title: "Edit",
          onPress: () => {
            sheetRef.current?.close();

            router.push({
              pathname: "/modal",
              params: {
                documentId: selectedDocument.id,
              },
            });
          },
        },
        {
          title: "Delete",
          destructive: true,
          onPress: () => {
            sheetRef.current?.close();
            onDelete(selectedDocument);
          },
        },
        {
            title: "Share",
            destructive: true,
            icon: "share-social-outline",
            onPress: handleShare,
        },
        {
          title: "Cancel",
          onPress: () => sheetRef.current?.close(),
        },
      ]}
    />
  );
});

export default DocumentActionSheet;