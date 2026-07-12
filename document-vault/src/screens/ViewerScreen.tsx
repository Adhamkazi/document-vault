import { useLocalSearchParams } from "expo-router";
import { View, Text, StyleSheet , Image } from "react-native";

export default function ViewerScreen() {
  const { name, uri, type } = useLocalSearchParams();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{name}</Text>

      {
        type === "image" ? (
        <Image
          source={{ uri: uri as string }}
          style={styles.image}
          resizeMode="contain"
        />
        ) : (
        <Text style={styles.pdfText}>
        📄 PDF Viewer Coming Soon...
        </Text>
        )
      }

    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 15,
  },

  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
  },

  image: {
    flex: 1,
    width: "100%",
  },

  pdfText: {
    fontSize: 20,
    textAlign: "center",
    marginTop: 50,
  },
});