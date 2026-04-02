import { useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { getAuth } from "../../utils/authStorage";
import { BASE_URL } from "../../constants/api";

const FILTERS = ["All", "This Week", "This Month"];

const startOf = (type) => {
  const d = new Date();
  if (type === "This Week") { d.setDate(d.getDate() - d.getDay()); d.setHours(0,0,0,0); }
  if (type === "This Month") { d.setDate(1); d.setHours(0,0,0,0); }
  return d;
};

export default function AdminBookingRevenue() {
  const router = useRouter();
  const [appointments, setAppointments] = useState([]);
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { token } = await getAuth();
      const res = await fetch(`${BASE_URL}/api/v1/customerappointment/getallappoint`, {
        headers: { Authorization: token || "" },
      });
      const json = await res.json();
      if (json.success) setAppointments(json.data || []);
    } catch (e) { console.log(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = appointments.filter((a) => {
    if (filter === "All") return true;
    return new Date(a.appointmentDate) >= startOf(filter);
  });

  const paid       = filtered.filter(a => a.paymentStatus === "paid");
  const unpaid     = filtered.filter(a => a.paymentStatus !== "paid" && a.status !== "cancelled");
  const cancelled  = filtered.filter(a => a.status === "cancelled");
  const totalRev   = paid.reduce((s, a) => s + (a.totalAmount || 0), 0);
  const pendingRev = unpaid.reduce((s, a) => s + (a.totalAmount || 0), 0);

  // Group by service
  const byService = paid.reduce((acc, a) => {
    const k = a.serviceName || "Other";
    if (!acc[k]) acc[k] = { count: 0, amount: 0 };
    acc[k].count++;
    acc[k].amount += a.totalAmount || 0;
    return acc;
  }, {});
  const serviceList = Object.entries(byService).sort((a, b) => b[1].amount - a[1].amount);

  const recentPaid = [...paid]
    .sort((a, b) => new Date(b.appointmentDate) - new Date(a.appointmentDate))
    .slice(0, 15);

  const fmtDate = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Booking Revenue</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Filter */}
      <View style={s.filterBar}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[s.filterChip, filter === f && s.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[s.filterTxt, filter === f && s.filterTxtActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0B3D2E" style={{ flex: 1 }} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#0B3D2E" />}
        >
          {/* Hero Card */}
          <View style={s.heroCard}>
            <View style={s.heroIconBox}>
              <Ionicons name="trending-up" size={30} color="#A8D96C" />
            </View>
            <Text style={s.heroLabel}>Total Revenue Collected</Text>
            <Text style={s.heroAmount}>₹{totalRev.toLocaleString("en-IN")}</Text>
            <Text style={s.heroSub}>{paid.length} paid • {filter}</Text>
          </View>

          {/* Stats Row */}
          <View style={s.statsRow}>
            {[
              { icon: "checkmark-circle", label: "Collected",  value: `₹${totalRev.toLocaleString("en-IN")}`,   color: "#3E7B27" },
              { icon: "time",             label: "Pending",    value: `₹${pendingRev.toLocaleString("en-IN")}`,  color: "#F59E0B" },
              { icon: "close-circle",     label: "Cancelled",  value: cancelled.length.toString(),               color: "#C62828" },
              { icon: "people",           label: "Total Appts",value: filtered.length.toString(),                color: "#0B3D2E" },
            ].map((st) => (
              <View key={st.label} style={s.statCard}>
                <Ionicons name={st.icon} size={18} color={st.color} />
                <Text style={[s.statVal, { color: st.color }]}>{st.value}</Text>
                <Text style={s.statLabel}>{st.label}</Text>
              </View>
            ))}
          </View>

          {/* Revenue by Service */}
          {serviceList.length > 0 && (
            <>
              <Text style={s.secTitle}>Revenue by Service</Text>
              {serviceList.map(([name, data]) => {
                const pct = totalRev > 0 ? (data.amount / totalRev) * 100 : 0;
                return (
                  <View key={name} style={s.serviceCard}>
                    <View style={s.serviceTop}>
                      <Text style={s.serviceName}>{name}</Text>
                      <Text style={s.serviceAmt}>₹{data.amount.toLocaleString("en-IN")}</Text>
                    </View>
                    <View style={s.progressBg}>
                      <View style={[s.progressFill, { width: `${Math.min(pct, 100)}%` }]} />
                    </View>
                    <Text style={s.serviceMeta}>{data.count} booking{data.count > 1 ? "s" : ""} • {pct.toFixed(1)}%</Text>
                  </View>
                );
              })}
            </>
          )}

          {/* Recent Transactions */}
          {recentPaid.length > 0 && (
            <>
              <Text style={s.secTitle}>Recent Paid Transactions</Text>
              {recentPaid.map((a) => (
                <View key={a._id} style={s.txCard}>
                  <View style={s.txIconBox}>
                    <Ionicons name="checkmark-circle" size={20} color="#3E7B27" />
                  </View>
                  <View style={s.txInfo}>
                    <Text style={s.txService}>{a.serviceName}</Text>
                    <Text style={s.txPet}>🐾 {a.petName} • {a.customerId?.fullName || "Customer"}</Text>
                    <Text style={s.txDate}>{fmtDate(a.appointmentDate)} • {a.appointmentTime}</Text>
                  </View>
                  <Text style={s.txAmt}>₹{a.totalAmount}</Text>
                </View>
              ))}
            </>
          )}

          {paid.length === 0 && (
            <View style={s.emptyBox}>
              <Ionicons name="cash-outline" size={52} color="#A8D96C" />
              <Text style={s.emptyTitle}>No Revenue Yet</Text>
              <Text style={s.emptySub}>Paid bookings will appear here</Text>
            </View>
          )}

          <View style={{ height: 30 }} />
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F7F0" },
  header: {
    backgroundColor: "#0B3D2E", paddingHorizontal: 20,
    paddingTop: 52, paddingBottom: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  backBtn: { width: 36, height: 36, justifyContent: "center" },
  headerTitle: { fontSize: 20, fontFamily: "Poppins_700Bold", color: "#fff" },

  filterBar: {
    flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#D4EDD4",
  },
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20,
    backgroundColor: "#F0F7F0", borderWidth: 1, borderColor: "#D4EDD4",
  },
  filterChipActive: { backgroundColor: "#0B3D2E", borderColor: "#0B3D2E" },
  filterTxt: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#3E7B27" },
  filterTxtActive: { fontFamily: "Poppins_700Bold", color: "#A8D96C" },

  scroll: { padding: 16, paddingBottom: 40 },

  heroCard: {
    backgroundColor: "#0B3D2E", borderRadius: 20, padding: 24,
    alignItems: "center", marginBottom: 16, elevation: 4,
  },
  heroIconBox: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: "rgba(168,217,108,0.2)",
    justifyContent: "center", alignItems: "center", marginBottom: 12,
  },
  heroLabel: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#A8D96C", marginBottom: 6 },
  heroAmount: { fontSize: 38, fontFamily: "Poppins_700Bold", color: "#fff", marginBottom: 4 },
  heroSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#6B9E6B" },

  statsRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  statCard: {
    flex: 1, backgroundColor: "#fff", borderRadius: 12, padding: 10,
    alignItems: "center", gap: 4, elevation: 2, borderWidth: 1, borderColor: "#D4EDD4",
  },
  statVal: { fontSize: 13, fontFamily: "Poppins_700Bold" },
  statLabel: { fontSize: 9, fontFamily: "Inter_400Regular", color: "#666", textAlign: "center" },

  secTitle: { fontSize: 16, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 12 },

  serviceCard: {
    backgroundColor: "#fff", borderRadius: 14, padding: 14,
    marginBottom: 10, elevation: 2, borderWidth: 1, borderColor: "#D4EDD4",
  },
  serviceTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  serviceName: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#0B3D2E", flex: 1 },
  serviceAmt: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#3E7B27" },
  progressBg: { height: 6, backgroundColor: "#E8F5E8", borderRadius: 3, marginBottom: 6 },
  progressFill: { height: 6, backgroundColor: "#A8D96C", borderRadius: 3 },
  serviceMeta: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#999" },

  txCard: {
    backgroundColor: "#fff", borderRadius: 14, padding: 12,
    flexDirection: "row", alignItems: "center", gap: 12,
    marginBottom: 8, elevation: 2, borderWidth: 1, borderColor: "#D4EDD4",
  },
  txIconBox: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "#E8F5E8", justifyContent: "center", alignItems: "center",
  },
  txInfo: { flex: 1 },
  txService: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 2 },
  txPet: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#666", marginBottom: 2 },
  txDate: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#999" },
  txAmt: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },

  emptyBox: { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 16, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  emptySub: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#999" },
});
