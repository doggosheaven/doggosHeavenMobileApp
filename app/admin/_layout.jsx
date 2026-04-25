import { Stack, useRouter, usePathname } from "expo-router";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TABS = [
  { name: "dashboard",        label: "Home",    icon: "grid-outline" },
  { name: "revenue",          label: "Revenue", icon: "cash-outline" },
  { name: "unblock-requests", label: "Unblock", icon: "shield-checkmark-outline" },
  { name: "profile",          label: "Profile", icon: "person-outline" },
];

const TAB_SCREENS = ["dashboard", "revenue", "unblock-requests", "profile"];

function AdminTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const isActive = (name) => pathname === `/admin/${name}` || pathname.endsWith(`/${name}`);
  const isTabScreen = TABS.some(t => isActive(t.name));

  if (!isTabScreen) return null;

  return (
    <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 8), height: 52 + Math.max(insets.bottom, 8) }]}>
      {TABS.map((tab) => {
        const active = isActive(tab.name);
        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tabItem}
            onPress={() => router.push(`/admin/${tab.name}`)}
            activeOpacity={0.7}
          >
            <Ionicons name={active ? tab.icon.replace("-outline", "") : tab.icon} size={22} color={active ? "#A8D96C" : "#6B9E6B"} />
            <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function AdminLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false, gestureEnabled: true, gestureDirection: "horizontal" }}>
        <Stack.Screen name="prescription" />
        <Stack.Screen name="deboard" />
        <Stack.Screen name="blacklisted" />
      </Stack>
      <AdminTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#0B3D2E",
    borderTopWidth: 0,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  tabLabel: {
    fontSize: 11,
    fontFamily: "Poppins_700Bold",
    color: "#6B9E6B",
  },
  tabLabelActive: {
    color: "#A8D96C",
  },
});
