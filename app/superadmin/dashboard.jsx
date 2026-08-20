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
  { key: "superadmin", label: "Super Admins", icon: "shield-checkmark", tint: "#F5C451" },
  { key: "admin",      label: "Admins",       icon: "shield-half",      tint: "#A8D96C" },
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
        <ActivityIndicator size="large" color="#F5C451" />
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
          <Ionicons name="shield-checkmark" size={20} color="#1A1206" />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#F5C451" />
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
            <Ionicons name="pause-circle-outline" size={16} color="#B8860B" />
            <Text style={s.inactiveTxt}>{data.inactiveUsers} deactivated account(s)</Text>
            <Ionicons name="chevron-forward" size={14} color="#B8860B" />
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
          <Ionicons name="grid-outline" size={18} color="#1A1206" />
          <Text style={s.consoleBtnTxt}>Open full console</Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F4EC" },
  loadingBox: { flex: 1, backgroundColor: "#F7F4EC", justifyContent: "center", alignItems: "center" },

  header: {
    backgroundColor: "#1A1206", paddingHorizontal: 20, paddingBottom: 18,
    flexDirection: "row", alignItems: "center", gap: 12,
  },
  headerKicker: { fontSize: 11, fontFamily: "Poppins_700Bold", color: "#F5C451", letterSpacing: 1.5 },
  headerTitle: { fontSize: 20, fontFamily: "Poppins_700Bold", color: "#fff", marginTop: 2 },
  crown: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: "#F5C451",
    justifyContent: "center", alignItems: "center",
  },

  scroll: { padding: 16 },
  sectionTitle: {
    fontSize: 12, fontFamily: "Poppins_700Bold", color: "#8A7A4A",
    letterSpacing: 1, marginBottom: 10, marginTop: 6,
  },

  roleGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 12 },
  roleCard: {
    width: "47.5%", backgroundColor: "#fff", borderRadius: 16, padding: 14, gap: 4,
    borderWidth: 1, borderColor: "#EDE4CE", elevation: 2,
  },
  roleValue: { fontSize: 24, fontFamily: "Poppins_700Bold", color: "#1A1206" },
  roleLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#8A7A4A" },

  inactiveBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#FFF9E6", borderRadius: 12, padding: 12, marginBottom: 6,
    borderWidth: 1, borderColor: "#FFE082",
  },
  inactiveTxt: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: "#B8860B" },

  moneyRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  moneyCard: {
    flex: 1, backgroundColor: "#1A1206", borderRadius: 16, padding: 14, gap: 4,
  },
  moneyValue: { fontSize: 18, fontFamily: "Poppins_700Bold", color: "#F5C451" },
  moneyLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#B9AC85" },

  list: {
    backgroundColor: "#fff", borderRadius: 16, paddingHorizontal: 14,
    borderWidth: 1, borderColor: "#EDE4CE", marginBottom: 16,
  },
  listRow: {
    flexDirection: "row", alignItems: "center", paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: "#F2ECDD",
  },
  listLabel: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: "#3A3327" },
  listValue: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#1A1206" },

  consoleBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#F5C451", borderRadius: 14, paddingVertical: 14, elevation: 2,
  },
  consoleBtnTxt: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#1A1206" },
});
