import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";

interface Props {
  visible: boolean;
  onSelect: (lang: string) => void;
}

export default function LanguageSelectionModal({ visible, onSelect }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Choose Your Language</Text>

          <Text style={styles.subtitle}>Select your preferred language</Text>

          <TouchableOpacity
            style={styles.button}
            onPress={() => onSelect("ta")}
          >
            <Text style={styles.lang}>தமிழ்</Text>
            <Text style={styles.sub}>Tamil</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={() => onSelect("en")}
          >
            <Text style={styles.lang}>English</Text>
            <Text style={styles.sub}>English</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },

  card: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 25,
    padding: 25,
  },

  title: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
  },

  subtitle: {
    textAlign: "center",
    color: "#666",
    marginVertical: 15,
  },

  button: {
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 16,
    padding: 12,
    marginTop: 15,
  },

  lang: {
    fontSize: 20,
    fontWeight: "700",
  },

  sub: {
    color: "#666",
    marginTop: 5,
  },
});
