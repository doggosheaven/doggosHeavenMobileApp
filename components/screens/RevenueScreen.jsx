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
import { ErrorState, EmptyState } from "../ScreenState";

const STATUS_BAR_HEIGHT = Platform.OS === "android" ? (StatusBar.currentHeight || 24) : 44;

const FILTERS = [
  { key: "all", label: "All" },
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
];

const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

/**
 * Booking revenue. Shared by /admin/revenue and /admin/bookingrevenueadmin,
 * which were the same screen twice under two names.
 *
 * The totals come from the server now. Both copies used to download every
 * appointment in the database and add them up on the phone.
 */
export default function RevenueScreen({ title = "Revenue", showBack = false }) {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      const { token } = await getAuth();
      const res = await fetch(
        `${BASE_URL}/api/v1/customerappointment/revenue?range=${filter}&limit=15`,
        { headers: { Authorization: token || "" } }
      );
      const json = await res.json();
      if (json.success) { setData(json); setError(false); }
      else setError(true);
    } catch (e) {
      if (__DEV__) console.log(e);
      setError(true);
    }
    finally { setLoading(false); setRefreshing(false); }
  }, [filter]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const collected = data?.totals?.collected ?? 0;
  const pending = data?.totals?.pending ?? 0;
  const appts = data?.totals?.appointments ?? 0;
  const services = data?.byService ?? [];
  const recent = data?.recent ?? [];
  const paidRecent = recent.filter((a) => a.paymentStatus === "paid");

  const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

  return (
    <View style={s.container}>
      <View style={[s.header, { paddingTop: STATUS_BAR_HEIGHT + 12 }]}>
        {showBack && (
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.8}>
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>
        )}
        <Text style={[s.headerTitle, !showBack && { textAlign: "center" }]}>{title}</Text>
        {showBack && <View style={{ width: 34 }} />}
      </View>

      <View style={s.filterBar}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[s.filterChip, filter === f.key && s.filterChipActive]}
            onPress={() => { setFilter(f.key); setLoading(true); }}
            activeOpacity={0.8}
          >
            <Text style={[s.filterTxt, filter === f.key && s.filterTxtActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0B3D2E" style={{ flex: 1 }} />
      ) : error ? (
        <ErrorState
          message="Could not load the revenue figures. Check your connection."
          onRetry={() => { setLoading(true); setError(false); load(); }}
        />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scroll}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#0B3D2E" />
          }
        >
          <View style={s.heroCard}>
            <View style={s.heroIconBox}>
              <Ionicons name="trending-up" size={30} color="#A8D96C" />
            </View>
            <Text style={s.heroLabel}>Total Revenue Collected</Text>
            <Text style={s.heroAmount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
              {money(collected)}
            </Text>
            <Text style={s.heroSub}>
              {FILTERS.find((f) => f.key === filter)?.label} • {appts} booking{appts === 1 ? "" : "s"}
            </Text>
          </View>

          {/* Two per row rather than four — an amount in the thousands has no
              room across a quarter of the screen. */}
          <View style={s.statsGrid}>
            {[
              { icon: "checkmark-circle", label: "Collected", value: money(collected), color: "#3E7B27" },
              { icon: "time",             label: "Pending",   value: money(pending),   color: "#B8860B" },
              { icon: "people",           label: "Bookings",  value: String(appts),    color: "#0B3D2E" },
              { icon: "pricetags",        label: "Services",  value: String(services.length), color: "#3E7B27" },
            ].map((st) => (
              <View key={st.label} style={s.statCard}>
                <Ionicons name={st.icon} size={17} color={st.color} />
                <View style={s.statText}>
                  <Text
                    style={[s.statVal, { color: st.color }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.6}
                  >
                    {st.value}
                  </Text>
                  <Text style={s.statLabel} numberOfLines={1}>{st.label}</Text>
                </View>
              </View>
            ))}
          </View>

          {services.length > 0 && (
            <>
              <Text style={s.secTitle}>Revenue by Service</Text>
              {services.map((svc) => {
                const pct = collected > 0 ? (svc.amount / collected) * 100 : 0;
                return (
                  <View key={svc.name} style={s.serviceCard}>
                    <View style={s.serviceTop}>
                      <Text style={s.serviceName} numberOfLines={1}>{svc.name}</Text>
                      <Text style={s.serviceAmt}>{money(svc.amount)}</Text>
                    </View>
                    <View style={s.progressBg}>
                      <View style={[s.progressFill, { width: `${Math.min(pct, 100)}%` }]} />
                    </View>
                    <Text style={s.serviceMeta}>
                      {svc.count} booking{svc.count === 1 ? "" : "s"} • {pct.toFixed(1)}%
                    </Text>
                  </View>
                );
              })}
            </>
          )}

          {paidRecent.length > 0 && (
            <>
              <Text style={s.secTitle}>Recent Paid Transactions</Text>
              {paidRecent.map((a) => (
                <View key={a._id} style={s.txCard}>
                  <View style={s.txIconBox}>
                    <Ionicons name="checkmark-circle" size={20} color="#3E7B27" />
                  </View>
                  <View style={s.txInfo}>
                    <Text style={s.txService} numberOfLines={1}>{a.serviceName}</Text>
                    <Text style={s.txPet} numberOfLines={1}>
                      🐾 {a.petName} • {a.customerId?.fullName || a.customerId?.name || "Customer"}
                    </Text>
                    <Text style={s.txDate}>{fmtDate(a.appointmentDate)} • {a.appointmentTime}</Text>
                  </View>
                  <Text style={s.txAmt}>{money(a.totalAmount)}</Text>
                </View>
              ))}
            </>
          )}

          {collected === 0 && services.length === 0 && (
            <EmptyState
              icon="cash-outline"
              title="No revenue yet"
              subtitle="Paid bookings for this period will show up here."
              actionLabel={filter === "all" ? undefined : "Show all time"}
              actionIcon="infinite-outline"
              onAction={filter === "all" ? undefined : () => { setFilter("all"); setLoading(true); }}
            />
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
    backgroundColor: "#0B3D2E", paddingHorizontal: 16, paddingBottom: 16,
    flexDirection: "row", alignItems: "center", gap: 10,
  },
  backBtn: { width: 34, height: 34, justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 20, fontFamily: "Poppins_700Bold", color: "#fff" },

  filterBar: {
    flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#D4EDD4",
  },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
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
  heroAmount: { fontSize: 36, fontFamily: "Poppins_700Bold", color: "#fff", marginBottom: 4 },
  heroSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#6B9E6B" },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  statCard: {
    width: "48%", minWidth: 0, flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#fff", borderRadius: 12, padding: 12,
    elevation: 2, borderWidth: 1, borderColor: "#D4EDD4",
  },
  statText: { flex: 1, minWidth: 0 },
  statVal: { fontSize: 15, fontFamily: "Poppins_700Bold" },
  statLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#666", marginTop: 1 },

  secTitle: {
    fontSize: 14, fontFamily: "Poppins_700Bold", color: "#0B3D2E",
    marginBottom: 10, marginTop: 6,
  },

  serviceCard: {
    backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: "#D4EDD4", elevation: 1,
  },
  serviceTop: { flexDirection: "row", justifyContent: "space-between", gap: 10, marginBottom: 8 },
  serviceName: { flex: 1, fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  serviceAmt: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#3E7B27" },
  progressBg: { height: 6, borderRadius: 3, backgroundColor: "#E8F5E8", overflow: "hidden" },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: "#A8D96C" },
  serviceMeta: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#8A9A8A", marginTop: 6 },

  txCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#fff", borderRadius: 14, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: "#D4EDD4",
  },
  txIconBox: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: "#E8F5E8",
    justifyContent: "center", alignItems: "center",
  },
  txInfo: { flex: 1, minWidth: 0 },
  txService: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  txPet: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#3E7B27", marginTop: 1 },
  txDate: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#8A9A8A", marginTop: 1 },
  txAmt: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#3E7B27" },
});
