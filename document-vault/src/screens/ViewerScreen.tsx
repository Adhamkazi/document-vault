import { useLocalSearchParams } from "expo-router";
import { View, Text, StyleSheet  } from "react-native";
import { getDocumentById } from "@/src/database/documentRepository";
import DocumentInfoCard from "@/src/components/documents/DocumentInfoCard";
import DocumentPreview from "@/src/components/documents/DocumentPreview";
import { SafeAreaView } from "react-native-safe-area-context";


export default function ViewerScreen() {
  const { id} = useLocalSearchParams();
   const document = getDocumentById(id as string);

     if (!document) {
    return (
      <View style={styles.center}>
        <Text>Document not found.</Text>
      </View>
    );
  }
  

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>

    <View style={styles.container}>
      <Text style={styles.title}>
        {document.title}
      </Text>
      <DocumentInfoCard
        document={document}
      />
      <DocumentPreview
          fileUri={document.fileUri}
          mimeType={document.mimeType}
        />
    </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF",
    padding: 10,
  },

  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 20,
  },

  image: {
    flex: 1,
    width: "100%",
  },

  pdf: {
    flex: 1,
    width: "100%",
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});