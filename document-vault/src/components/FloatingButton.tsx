import { StyleSheet, Text, TouchableOpacity } from "react-native";

type FloatingButtonProps = {
  onPress: () => void;
};

export default function FloatingButton({
  onPress,
}: FloatingButtonProps) {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      <Text style={styles.plus}>+</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
  },

  plus: {
    color: "#fff",
    fontSize: 34,
    fontWeight: "bold",
    marginTop: -2,
  },
});