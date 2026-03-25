import { View, StyleSheet } from "react-native";
import { Slot, usePathname } from "expo-router";
import Footer from "../../components/Footer";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

export default function TabsLayout() {
  const pathname = usePathname();
  const hideFooter = pathname.startsWith("/screens") || pathname.includes("/Pet/");

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar style="light" backgroundColor="#0B3D2E" />
      <View style={styles.content}>
        <Slot />
      </View>
      {!hideFooter && <Footer />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B3D2E",
  },
  content: {
    flex: 1,
    backgroundColor: "#F5EDE0",
  },
});
