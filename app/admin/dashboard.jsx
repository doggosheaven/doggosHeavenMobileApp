import { useState, useCallback, useEffect, useRef } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { getAuth, clearAuth } from "../../utils/authStorage";
import { BASE_URL } from "../../constants/api";

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ total: 0, pending: 0, confirmed: 0, completed: 0, cancelled: 0 });
  const [recentAppointments, setRecentAppointments] = useState([]);
  const [recentVisits, setRecentVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadData = useCallback(async () => {
    try {
      const { user: u, token } = await getAuth();
      setUser(u);
      const today = new Date().toISOString().split("T")[0];
      const [apptRes, alertRes, visitRes] = await Promise.all([
        fetch(`${BASE_URL}/api/v1/customerappointment/getallappoint`, { headers: { Authorization: token || "" } }),
        fetch(`${BASE_URL}/api/v1/alerts/getall`, { headers: { Authorization: token || "" } }),
        fetch(`${BASE_URL}/api/v1/visit/getvisitlist?date=${today}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: token || "" },
        }),
      ]);
      const data = await apptRes.json();
      const alertData = await alertRes.json();
      const visitData = await visitRes.json();
      if (data.success) {
        const appts = data.data || [];
        setStats({
          total: appts.length,
          pending: appts.filter(a => a.status === "pending").length,
          confirmed: appts.filter(a => a.status === "confirmed").length,
          completed: appts.filter(a => a.status === "completed").length,
          cancelled: appts.filter(a => a.status === "cancelled").length,
        });
        setRecentAppointments(appts.slice(0, 5));
      }
      if (alertData.success) setUnreadCount(alertData.unreadCount || 0);
      if (visitData.success) setRecentVisits((visitData.List || []).slice(0, 5));
    } catch (e) { console.log(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  // Poll unread count every 30 seconds for near real-time bell badge
  const tokenRef = useRef("");
  useEffect(() => {
    const poll = async () => {
      try {
        const { token } = await getAuth();
        tokenRef.current = token || "";
        const res = await fetch(`${BASE_URL}/api/v1/alerts/getall`, {
          headers: { Authorization: tokenRef.current },
        });
        const json = await res.json();
        if (json.success) setUnreadCount(json.unreadCount || 0);
      } catch {}
    };
    const interval = setInterval(poll, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: async () => { await clearAuth(); router.replace("/auth/login"); } },
    ]);
  };

  const STATUS_COLOR = { pending: "#F59E0B", confirmed: "#3E7B27", completed: "#0B3D2E", cancelled: "#C62828" };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back 👋</Text>
          <Text style={styles.adminName}>{user?.fullName || "Admin"}</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.bellBtn} onPress={() => router.push("/admin/notifications")} activeOpacity={0.8}>
            <Ionicons name="notifications-outline" size={22} color="#fff" />
            {unreadCount > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeTxt}>{unreadCount > 99 ? "99+" : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <View style={styles.roleBadge}>
            <Ionicons name="shield-checkmark" size={14} color="#A8D96C" />
            <Text style={styles.roleText}>{user?.role === "admin" ? "Admin" : "Staff"}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor="#A8D96C" />}
      >
        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {[
            { label: "Total",     value: stats.total,     icon: "calendar",         color: "#0B3D2E", onPress: () => router.push("/admin/appointments") },
            { label: "Pending",   value: stats.pending,   icon: "time",             color: "#F59E0B", onPress: () => router.push("/admin/appointments") },
            { label: "Confirmed", value: stats.confirmed, icon: "checkmark-circle", color: "#3E7B27", onPress: () => router.push("/admin/appointments") },
            { label: "Completed", value: stats.completed, icon: "ribbon",           color: "#1A5C3A", onPress: () => router.push("/admin/appointments") },
          ].map((s) => (
            <TouchableOpacity key={s.label} style={styles.statCard} onPress={s.onPress} activeOpacity={0.8}>
              <View style={[styles.statIconBox, { backgroundColor: s.color + "20" }]}>
                <Ionicons name={s.icon} size={22} color={s.color} />
              </View>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {[
            { label: "All Bookings",     icon: "calendar-outline",      onPress: () => router.push("/admin/appointments") },
            { label: "Pet Master",        icon: "paw-outline",            onPress: () => router.push("/admin/petmaster") },
            { label: "Inventory",         icon: "cube-outline",           onPress: () => router.push("/admin/inventory") },
            { label: "Reminders",         icon: "notifications-outline",  onPress: () => router.push("/admin/reminders") },
            { label: "Staff",             icon: "people-outline",         onPress: () => router.push("/admin/staff") },
            { label: "Services",          icon: "construct-outline",      onPress: () => router.push("/admin/services") },
            { label: "Booking Rev.",      icon: "cash-outline",           onPress: () => router.push("/admin/bookingrevenueadmin") },
            { label: "Walk-in Bill",      icon: "receipt-outline",        onPress: () => router.push("/admin/billing") },
            { label: "Visits",            icon: "footsteps-outline",      onPress: () => router.push("/admin/totalvisits") },
            { label: "Unblock Requests",  icon: "lock-open-outline",      onPress: () => router.push("/admin/unblock-requests") },
            { label: "Boarding Subs",     icon: "home-outline",           onPress: () => router.push("/admin/boardingsubscriptions") },
          ].map((a) => (
            <TouchableOpacity key={a.label} style={styles.actionCard} onPress={a.onPress} activeOpacity={0.8}>
              <View style={styles.actionIconBox}>
                <Ionicons name={a.icon} size={24} color="#0B3D2E" />
              </View>
              <Text style={styles.actionLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Visits */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Visits</Text>
          <TouchableOpacity onPress={() => router.push("/admin/totalvisits")}>
            <Text style={styles.viewAll}>View All →</Text>
          </TouchableOpacity>
        </View>
        {recentVisits.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No visits today</Text>
          </View>
        ) : (
          recentVisits.map((v) => (
            <TouchableOpacity
              key={v._id}
              style={styles.apptCard}
              onPress={() => router.push("/admin/totalvisits")}
              activeOpacity={0.8}
            >
              <View style={styles.apptLeft}>
                <Text style={styles.apptService}>{v?.pet?.name || "—"}</Text>
                <Text style={styles.apptPet}>🎯 {v?.visitType?.purpose || "—"} • 👤 {v?.pet?.owner?.name || "N/A"}</Text>
                <Text style={styles.apptDate}>📞 {v?.pet?.owner?.phone || "N/A"} • ₹{v?.details?.price || 0}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#ccc" />
            </TouchableOpacity>
          ))
        )}

        {/* Recent Appointments */}
        <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Recent Bookings</Text>
        {loading ? (
          <ActivityIndicator color="#0B3D2E" style={{ marginTop: 20 }} />
        ) : recentAppointments.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No bookings yet</Text>
          </View>
        ) : (
          recentAppointments.map((appt) => (
            <View key={appt._id} style={styles.apptCard}>
              <View style={styles.apptLeft}>
                <Text style={styles.apptService}>{appt.serviceName}</Text>
                <Text style={styles.apptPet}>🐾 {appt.petName} • {appt.customerId?.name || appt.customerId?.fullName || "Customer"}</Text>
                <Text style={styles.apptDate}>
                  {new Date(appt.appointmentDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} • {appt.appointmentTime}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[appt.status] + "20" }]}>
                <Text style={[styles.statusText, { color: STATUS_COLOR[appt.status] }]}>
                  {appt.status}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F7F0" },
  header: {
    backgroundColor: "#0B3D2E", paddingHorizontal: 20,
    paddingTop: 52, paddingBottom: 20,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  greeting: { fontSize: 12, color: "#A8D96C", fontFamily: "Inter_400Regular" },
  adminName: { fontSize: 20, color: "#fff", fontFamily: "Poppins_700Bold" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  bellBtn: { position: "relative", padding: 6, backgroundColor: "rgba(168,217,108,0.15)", borderRadius: 10 },
  bellBadge: {
    position: "absolute", top: -4, right: -4,
    backgroundColor: "#C62828", borderRadius: 10,
    minWidth: 18, height: 18, justifyContent: "center", alignItems: "center",
    paddingHorizontal: 3, borderWidth: 1.5, borderColor: "#0B3D2E",
  },
  bellBadgeTxt: { fontSize: 9, fontFamily: "Poppins_700Bold", color: "#fff" },
  roleBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(168,217,108,0.15)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  roleText: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#A8D96C" },

  scroll: { padding: 16, paddingBottom: 40 },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  statCard: {
    width: "47%", backgroundColor: "#fff", borderRadius: 16, padding: 16,
    alignItems: "center", elevation: 2, borderWidth: 1, borderColor: "#D4EDD4",
  },
  statIconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center", marginBottom: 8 },
  statValue: { fontSize: 26, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  statLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#666", marginTop: 2 },

  sectionTitle: { fontSize: 16, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 12 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  viewAll: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#3E7B27" },

  actionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  actionCard: {
    width: "47%", backgroundColor: "#fff", borderRadius: 16, padding: 16,
    alignItems: "center", elevation: 2, borderWidth: 1, borderColor: "#D4EDD4",
  },
  actionIconBox: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: "#E8F5E8", justifyContent: "center", alignItems: "center", marginBottom: 8,
  },
  actionLabel: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },

  apptCard: {
    backgroundColor: "#fff", borderRadius: 14, padding: 14,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginBottom: 10, elevation: 2, borderWidth: 1, borderColor: "#D4EDD4",
  },
  apptLeft: { flex: 1 },
  apptService: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 2 },
  apptPet: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#666", marginBottom: 2 },
  apptDate: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#999" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusText: { fontSize: 11, fontFamily: "Poppins_700Bold", textTransform: "capitalize" },

  emptyBox: { alignItems: "center", paddingVertical: 30 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#999" },
});
