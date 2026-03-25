import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const tabs = [
  { label: "Home", icon: "home", route: "/(tabs)/home" },
  { label: "Booking", icon: "calendar", route: "/(tabs)/bookings" },
  { label: "Profile", icon: "account", route: "/(tabs)/profile" },
  { label: "Test API", icon: "wifi", route: "/(tabs)/connectiontest" },
];

export default function Footer() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = pathname === tab.route || (tab.route === "/(tabs)/home" && pathname === "/");
        return (
          <TouchableOpacity
            key={tab.route}
            style={styles.tab}
            onPress={() => router.push(tab.route)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name={tab.icon}
              size={24}
              color={isActive ? "#7BC743" : "#999999"}
            />
            <Text style={[styles.label, isActive && styles.activeLabel]}>
              {tab.label}
            </Text>
            {isActive && <View style={styles.activeDot} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingVertical: 10,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: "#E8E8E8",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 8,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  label: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#999999",
  },
  activeLabel: {
    color: "#7BC743",
    fontFamily: "Poppins_700Bold",
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#7BC743",
    marginTop: 2,
  },
});