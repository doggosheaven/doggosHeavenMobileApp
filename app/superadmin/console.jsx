import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Platform, StatusBar } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const STATUS_BAR_HEIGHT = Platform.OS === "android" ? (StatusBar.currentHeight || 24) : 44;

/**
 * A superadmin passes every admin and staff guard, so this is a directory into
 * the screens that already exist rather than a second copy of them.
 */
const GROUPS = [
  {
    title: "People & access",
    items: [
      { label: "All Users",        icon: "people-outline",            route: "/superadmin/users" },
      { label: "Add Person",       icon: "person-add-outline",        route: "/superadmin/adduser" },
      { label: "Staff & Revenue",  icon: "briefcase-outline",         route: "/admin/staff" },
      { label: "Unblock Requests", icon: "lock-open-outline",         route: "/admin/unblock-requests" },
      { label: "Blacklisted Pets", icon: "ban-outline",               route: "/admin/blacklisted" },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "All Bookings",     icon: "calendar-outline",          route: "/admin/appointments" },
      { label: "Pet Master",       icon: "paw-outline",               route: "/admin/petmaster" },
      { label: "Total Visits",     icon: "clipboard-outline",         route: "/admin/totalvisits" },
      { label: "Attendance",       icon: "checkbox-outline",          route: "/admin/attendance" },
      { label: "Deboard",          icon: "exit-outline",              route: "/admin/deboard" },
      { label: "Reminders",        icon: "notifications-outline",     route: "/admin/reminders" },
      { label: "Prescriptions",    icon: "medkit-outline",            route: "/admin/prescription" },
      { label: "Add Pet & Owner",  icon: "add-circle-outline",        route: "/admin/addpet" },
    ],
  },
  {
    title: "Catalogue & stock",
    items: [
      { label: "Services",         icon: "construct-outline",         route: "/admin/services" },
      { label: "Inventory",        icon: "cube-outline",              route: "/admin/inventory" },
    ],
  },
  {
    title: "Money",
    items: [
      { label: "Revenue",          icon: "bar-chart-outline",         route: "/admin/revenue" },
      { label: "Booking Revenue",  icon: "cash-outline",              route: "/admin/bookingrevenueadmin" },
      { label: "Walk-in Billing",  icon: "receipt-outline",           route: "/admin/billing" },
      { label: "Bill History",     icon: "document-text-outline",     route: "/admin/billhistory" },
      { label: "Boarding Subs",    icon: "repeat-outline",            route: "/admin/boardingsubscriptions" },
    ],
  },
  {
    title: "Alerts",
    items: [
      { label: "Notifications",    icon: "alert-circle-outline",      route: "/admin/notifications" },
    ],
  },
];

export default function SuperAdminConsole() {
  const router = useRouter();

  return (
    <View style={s.container}>
      <View style={[s.header, { paddingTop: STATUS_BAR_HEIGHT + 12 }]}>
        <View style={{ flex: 1 }}>
          <Text style={s.headerKicker}>CONSOLE</Text>
          <Text style={s.headerTitle}>Everything you can manage</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {GROUPS.map((group) => (
          <View key={group.title}>
            <Text style={s.sectionTitle}>{group.title.toUpperCase()}</Text>
            <View style={s.grid}>
              {group.items.map((item) => (
                <TouchableOpacity
                  key={item.route + item.label}
                  style={s.tile}
                  activeOpacity={0.85}
                  onPress={() => router.push(item.route)}
                >
                  <View style={s.tileIcon}>
                    <Ionicons name={item.icon} size={19} color="#F5C451" />
                  </View>
                  <Text style={s.tileTxt} numberOfLines={2}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F4EC" },
  header: { backgroundColor: "#1A1206", paddingHorizontal: 20, paddingBottom: 18 },
  headerKicker: { fontSize: 11, fontFamily: "Poppins_700Bold", color: "#F5C451", letterSpacing: 1.5 },
  headerTitle: { fontSize: 20, fontFamily: "Poppins_700Bold", color: "#fff", marginTop: 2 },

  scroll: { padding: 16 },
  sectionTitle: {
    fontSize: 11, fontFamily: "Poppins_700Bold", color: "#8A7A4A",
    letterSpacing: 1.2, marginBottom: 10, marginTop: 8,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 8 },
  tile: {
    width: "31%", backgroundColor: "#fff", borderRadius: 14, paddingVertical: 14,
    paddingHorizontal: 8, alignItems: "center", gap: 8,
    borderWidth: 1, borderColor: "#EDE4CE", elevation: 1,
  },
  tileIcon: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: "#1A1206",
    justifyContent: "center", alignItems: "center",
  },
  tileTxt: { fontSize: 11, fontFamily: "Poppins_700Bold", color: "#1A1206", textAlign: "center" },
});
