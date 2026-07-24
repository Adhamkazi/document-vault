import React from "react";
import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { PdfView } from "@kishannareshpal/expo-pdf";

type Props = {
  fileUri: string;
  mimeType: string;
};

export default function DocumentPreview({
  fileUri,
  mimeType,
}: Props) {
  const isImage = mimeType.startsWith("image");

  return (
    <View style={styles.container}>
      {isImage ? (
        <Image
          source={fileUri}
          style={styles.image}
          contentFit="contain"
        />
      ) : (
        <PdfView
          uri={fileUri}
          style={styles.pdf}
          fitMode="width"
          onError={(error) => console.log(error)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 450,
    backgroundColor: "#FFF",
    borderRadius: 16,
    overflow: "hidden",
    elevation: 2,
  },

  image: {
    flex: 1,
    width: "100%",
  },

  pdf: {
    flex: 1,
    width: "100%",
  },
});