import { StyleSheet, Text, TouchableOpacity } from "react-native";

type Props = {
  name: string;
  onPress?: () => void;
  
};

export default function DocumentCard({
  name,
  onPress,
}: Props) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
    >
      <Text style={styles.text}>📄 {name}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 10,
    marginBottom: 12,
    elevation: 2,
  },

  text: {
    fontSize: 18,
  },
});