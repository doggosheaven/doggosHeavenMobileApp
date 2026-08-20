import { Stack, useRouter, usePathname } from "expo-router";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import RoleGate from "../../components/RoleGate";

const TABS = [
  { name: "dashboard", label: "Overview", icon: "speedometer-outline" },
  { name: "users",     label: "Users",    icon: "people-outline" },
  { name: "console",   label: "Console",  icon: "grid-outline" },
  { name: "profile",   label: "Profile",  icon: "person-outline" },
];

function SuperAdminTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const isActive = (name) => pathname === `/superadmin/${name}`;
  if (!TABS.some((t) => isActive(t.name))) return null;

  return (
    <View style={[s.tabBar, { paddingBottom: Math.max(insets.bottom, 8), height: 52 + Math.max(insets.bottom, 8) }]}>
      {TABS.map((tab) => {
        const active = isActive(tab.name);
        return (
          <TouchableOpacity
            key={tab.name}
            style={s.tabItem}
            onPress={() => router.push(`/superadmin/${tab.name}`)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={active ? tab.icon.replace("-outline", "") : tab.icon}
              size={22}
              color={active ? "#A8D96C" : "#6B9E6B"}
            />
            <Text style={[s.tabLabel, active && s.tabLabelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function SuperAdminLayout() {
  return (
    <RoleGate allow={["superadmin"]}>
      <View style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false, gestureEnabled: true, gestureDirection: "horizontal" }} />
        <SuperAdminTabBar />
      </View>
    </RoleGate>
  );
}

const s = StyleSheet.create({
  tabBar: { flexDirection: "row", backgroundColor: "#0B3D2E", borderTopWidth: 0 },
  tabItem: { flex: 1, alignItems: "center", justifyContent: "center", gap: 3 },
  tabLabel: { fontSize: 11, fontFamily: "Poppins_700Bold", color: "#6B9E6B" },
  tabLabelActive: { color: "#A8D96C" },
});
