import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const tabs = [
  { label: "Home",     icon: "home-outline",     iconActive: "home",     route: "/home" },
  { label: "Services", icon: "grid-outline",      iconActive: "grid",     route: "/services" },
  { label: "Bookings", icon: "calendar-outline",  iconActive: "calendar", route: "/bookings" },
  { label: "Profile",  icon: "person-outline",    iconActive: "person",   route: "/profile" },
];

export default function Footer() {
  const router   = useRouter();
  const pathname = usePathname();

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = pathname === tab.route;
        return (
          <TouchableOpacity
            key={tab.label}
            style={styles.tab}
            onPress={() => router.navigate(tab.route)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isActive ? tab.iconActive : tab.icon}
              size={24}
              color={isActive ? "#A8D96C" : "rgba(255,255,255,0.45)"}
            />
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {tab.label}
            </Text>
            {isActive && <View style={styles.dot} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#0B3D2E",
    paddingTop: 10,
    paddingBottom: 18,
    borderTopWidth: 1,
    borderTopColor: "rgba(168,217,108,0.2)",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  label: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.45)",
  },
  labelActive: {
    color: "#A8D96C",
    fontFamily: "Poppins_700Bold",
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#A8D96C",
    marginTop: 2,
  },
});
