import { StyleSheet, Text, View } from "react-native";

export default function FamilyScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>👨‍👩‍👧 Family</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 30,
    fontWeight: "bold",
  },
});