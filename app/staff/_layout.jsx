import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function StaffLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#0B3D2E",
          borderTopWidth: 0,
          height: 62,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: "#A8D96C",
        tabBarInactiveTintColor: "#6B9E6B",
        tabBarLabelStyle: { fontSize: 10, fontFamily: "Poppins_700Bold" },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="appointments"
        options={{
          title: "Bookings",
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="reminders"
        options={{
          title: "Reminders",
          tabBarIcon: ({ color, size }) => <Ionicons name="notifications-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
        }}
      />
      {/* Hidden screens - accessible via navigation only */}
      <Tabs.Screen name="services"   options={{ href: null }} />
      <Tabs.Screen name="myservices"  options={{ href: null }} />
      <Tabs.Screen name="deboard"    options={{ href: null }} />
      <Tabs.Screen name="attendance" options={{ href: null }} />
      <Tabs.Screen name="petmaster"  options={{ href: null }} />
      <Tabs.Screen name="addpet"     options={{ href: null }} />
      <Tabs.Screen name="inventory"  options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="billing" options={{ href: null }} />
      <Tabs.Screen name="billhistory" options={{ href: null }} />
      <Tabs.Screen name="totalvisits" options={{ href: null }} />
      <Tabs.Screen name="blacklisted" options={{ href: null }} />
    </Tabs>
  );
}
