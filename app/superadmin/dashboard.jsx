import { useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Platform, StatusBar,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { getAuth } from "../../utils/authStorage";
import { BASE_URL } from "../../constants/api";
import { registerCacheReset } from "../../utils/sessionCache";

const STATUS_BAR_HEIGHT = Platform.OS === "android" ? (StatusBar.currentHeight || 24) : 44;

const ROLE_CARDS = [
  { key: "superadmin", label: "Super Admins", icon: "shield-checkmark", tint: "#0B3D2E" },
  { key: "admin",      label: "Admins",       icon: "shield-half",      tint: "#3E7B27" },
  { key: "staff",      label: "Staff",        icon: "briefcase",        tint: "#7EC8E3" },
  { key: "customer",   label: "Customers",    icon: "people",           tint: "#E8A0BF" },
];

const TOTAL_ROWS = [
  { key: "pets",          label: "Pets",              icon: "paw-outline" },
  { key: "owners",        label: "Pet Owners",        icon: "person-outline" },
  { key: "visits",        label: "Visits",            icon: "clipboard-outline" },
  { key: "appointments",  label: "Appointments",      icon: "calendar-outline" },
  { key: "prescriptions", label: "Prescriptions",     icon: "medkit-outline" },
  { key: "services",      label: "Services",          icon: "construct-outline" },
  { key: "inventory",     label: "Inventory Items",   icon: "cube-outline" },
  { key: "bills",         label: "Bills",             icon: "receipt-outline" },
  { key: "boardings",     label: "Boardings",         icon: "home-outline" },
  { key: "activeBoardingSubscriptions", label: "Active Boarding Subs", icon: "repeat-outline" },
  { key: "unreadAlerts",  label: "Unread Alerts",     icon: "notifications-outline" },
];

let _cached = null;

registerCacheReset(() => { _cached = null; });

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [data, setData] = useState(_cached);
  const [loading, setLoading] = useState(!_cached);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { token } = await getAuth();
      const res = await fetch(`${BASE_URL}/api/v1/superadmin/overview`, {
        headers: { Authorization: token || "" },
      });
      const json = await res.json();
      if (json.success) { setData(json); _cached = json; }
    } catch (e) { if (__DEV__) console.log(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

  if (loading) {
    return (
      <View style={s.loadingBox}>
        <ActivityIndicator size="large" color="#A8D96C" />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={[s.header, { paddingTop: STATUS_BAR_HEIGHT + 12 }]}>
        <View style={{ flex: 1 }}>
          <Text style={s.headerKicker}>SUPER ADMIN</Text>
          <Text style={s.headerTitle}>Everything, at a glance</Text>
        </View>
        <View style={s.crown}>
          <Ionicons name="shield-checkmark" size={20} color="#0B3D2E" />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#A8D96C" />
        }
      >
        {/* People */}
        <Text style={s.sectionTitle}>People</Text>
        <View style={s.roleGrid}>
          {ROLE_CARDS.map((r) => (
            <TouchableOpacity
              key={r.key}
              style={s.roleCard}
              activeOpacity={0.85}
              onPress={() => router.push(`/superadmin/users?role=${r.key}`)}
            >
              <Ionicons name={r.icon} size={20} color={r.tint} />
              <Text style={s.roleValue}>{data?.users?.[r.key] ?? 0}</Text>
              <Text style={s.roleLabel}>{r.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {data?.inactiveUsers > 0 && (
          <TouchableOpacity
            style={s.inactiveBanner}
            activeOpacity={0.85}
            onPress={() => router.push("/superadmin/users?includeInactive=1")}
          >
            <Ionicons name="pause-circle-outline" size={16} color="#3E7B27" />
            <Text style={s.inactiveTxt}>{data.inactiveUsers} deactivated account(s)</Text>
            <Ionicons name="chevron-forward" size={14} color="#3E7B27" />
          </TouchableOpacity>
        )}

        {/* Money */}
        <Text style={s.sectionTitle}>Money</Text>
        <View style={s.moneyRow}>
          <View style={s.moneyCard}>
            <Text style={s.moneyValue}>{money(data?.money?.billedTotal)}</Text>
            <Text style={s.moneyLabel}>Billed total</Text>
          </View>
          <View style={s.moneyCard}>
            <Text style={s.moneyValue}>{money(data?.money?.walletBalanceHeld)}</Text>
            <Text style={s.moneyLabel}>Wallet balance held</Text>
          </View>
        </View>

        {/* Everything else */}
        <Text style={s.sectionTitle}>Records</Text>
        <View style={s.list}>
          {TOTAL_ROWS.map((row, i) => (
            <View key={row.key} style={[s.listRow, i === TOTAL_ROWS.length - 1 && { borderBottomWidth: 0 }]}>
              <Ionicons name={row.icon} size={17} color="#A8D96C" style={{ width: 26 }} />
              <Text style={s.listLabel}>{row.label}</Text>
              <Text style={s.listValue}>{data?.totals?.[row.key] ?? 0}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={s.consoleBtn} activeOpacity={0.85} onPress={() => router.push("/superadmin/console")}>
          <Ionicons name="grid-outline" size={18} color="#0B3D2E" />
          <Text style={s.consoleBtnTxt}>Open full console</Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F7F0" },
  loadingBox: { flex: 1, backgroundColor: "#F0F7F0", justifyContent: "center", alignItems: "center" },

  header: {
    backgroundColor: "#0B3D2E", paddingHorizontal: 20, paddingBottom: 18,
    flexDirection: "row", alignItems: "center", gap: 12,
  },
  headerKicker: { fontSize: 11, fontFamily: "Poppins_700Bold", color: "#A8D96C", letterSpacing: 1.5 },
  headerTitle: { fontSize: 20, fontFamily: "Poppins_700Bold", color: "#fff", marginTop: 2 },
  crown: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: "#A8D96C",
    justifyContent: "center", alignItems: "center",
  },

  scroll: { padding: 16 },
  sectionTitle: {
    fontSize: 12, fontFamily: "Poppins_700Bold", color: "#8A9A8A",
    letterSpacing: 1, marginBottom: 10, marginTop: 6,
  },

  roleGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 12 },
  roleCard: {
    width: "47.5%", backgroundColor: "#fff", borderRadius: 16, padding: 14, gap: 4,
    borderWidth: 1, borderColor: "#D4EDD4", elevation: 2,
  },
  roleValue: { fontSize: 24, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  roleLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#8A9A8A" },

  inactiveBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#FFF9E6", borderRadius: 12, padding: 12, marginBottom: 6,
    borderWidth: 1, borderColor: "#FFE082",
  },
  inactiveTxt: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: "#3E7B27" },

  moneyRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  moneyCard: {
    flex: 1, backgroundColor: "#0B3D2E", borderRadius: 16, padding: 14, gap: 4,
  },
  moneyValue: { fontSize: 18, fontFamily: "Poppins_700Bold", color: "#A8D96C" },
  moneyLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#8A9A8A" },

  list: {
    backgroundColor: "#fff", borderRadius: 16, paddingHorizontal: 14,
    borderWidth: 1, borderColor: "#D4EDD4", marginBottom: 16,
  },
  listRow: {
    flexDirection: "row", alignItems: "center", paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: "#E8F5E8",
  },
  listLabel: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: "#1A1A1A" },
  listValue: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },

  consoleBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#A8D96C", borderRadius: 14, paddingVertical: 14, elevation: 2,
  },
  consoleBtnTxt: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
});
