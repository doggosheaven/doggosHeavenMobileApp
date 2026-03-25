import { View, StyleSheet } from "react-native";
import { Slot } from "expo-router";
import Footer from "../../components/Footer";

export default function TabsLayout() {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Slot />
      </View>
      <Footer />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5EDE0",
  },
  content: {
    flex: 1,
  },
});
