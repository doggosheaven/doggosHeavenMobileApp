import { useState, useCallback, useEffect, useRef } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, FlatList, Platform, StatusBar,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { getAuth } from "../../utils/authStorage";
import { BASE_URL } from "../../constants/api";

const STATUS_BAR_HEIGHT = Platform.OS === "android" ? (StatusBar.currentHeight || 24) : 44;

const STATUS_COLOR = { pending: "#F59E0B", confirmed: "#3E7B27", completed: "#0B3D2E", cancelled: "#C62828" };
const STATUS_BG    = { pending: "#FFF9E6", confirmed: "#E8F5E8", completed: "#E8F5E8", cancelled: "#FFEBEE" };

const QUICK_ACTIONS = [
  { label: "All Bookings",  icon: "calendar-outline",     route: "/admin/appointments" },
  { label: "Pet Master",    icon: "paw-outline",           route: "/admin/petmaster" },
  { label: "Inventory",     icon: "cube-outline",          route: "/admin/inventory" },
  { label: "Staff",         icon: "people-outline",        route: "/admin/staff" },
  { label: "Services",      icon: "construct-outline",     route: "/admin/services" },
  { label: "Reminders",     icon: "notifications-outline", route: "/admin/reminders" },
  { label: "Revenue",       icon: "bar-chart-outline",     route: "/admin/bookingrevenueadmin" },
  { label: "Walk-in Bill",  icon: "receipt-outline",       route: "/admin/billing" },
  { label: "Bill History",  icon: "document-text-outline", route: "/admin/billhistory" },
  { label: "Boarding Subs", icon: "home-outline",          route: "/admin/boardingsubscriptions" },
  { label: "Prescription",  icon: "medkit-outline",        route: "/admin/prescription" },
  { label: "Deboard",       icon: "exit-outline",          route: "/admin/deboard" },
  { label: "Blacklisted",   icon: "ban-outline",           route: "/admin/blacklisted" },
  { label: "Unblock Req.",  icon: "lock-open-outline",     route: "/admin/unblock-requests" },
];

let _loaded = false;
let _cachedStats = { total: 0, pending: 0, confirmed: 0, completed: 0, totalVisits: 0 };
let _cachedAppts = [];
let _cachedVisits = [];
let _cachedUser = null;
let _cachedToken = "";
let _cachedUnread = 0;

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser]                     = useState(_cachedUser);
  const [stats, setStats]                   = useState(_cachedStats);
  const [recentAppointments, setRecentAppts] = useState(_cachedAppts);
  const [recentVisits, setRecentVisits]     = useState(_cachedVisits);
  const [loading, setLoading]               = useState(!_loaded);
  const [refreshing, setRefreshing]         = useState(false);
  const [unreadCount, setUnreadCount]       = useState(_cachedUnread);
  const [token, setToken]                   = useState(_cachedToken);
  const [calModal, setCalModal]             = useState(false);
  const [selectedDate, setSelectedDate]     = useState(new Date());
  const [calMonth, setCalMonth]             = useState(new Date());
  const isFetching = useRef(false);

  const load = useCallback(async (force = false) => {
    if (isFetching.current) return;
    if (_loaded && !force) return;
    isFetching.current = true;
    try {
      const { user: u, token: t } = await getAuth();
      setUser(u); setToken(t || "");
      const [apptRes, alertRes, visitRes] = await Promise.all([
        fetch(`${BASE_URL}/api/v1/customerappointment/getallappoint`, { headers: { Authorization: t || "" } }),
        fetch(`${BASE_URL}/api/v1/alerts/getall`, { headers: { Authorization: t || "" } }),
        fetch(`${BASE_URL}/api/v1/visit/getvisitlist`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: t || "" },
        }),
      ]);
      const apptData  = await apptRes.json();
      const alertData = await alertRes.json();
      const visitData = await visitRes.json();

      if (apptData.success) {
        const appts = apptData.data || [];
        const newStats = {
          ..._cachedStats,
          total:     appts.length,
          pending:   appts.filter(a => a.status === "pending").length,
          confirmed: appts.filter(a => a.status === "confirmed").length,
          completed: appts.filter(a => a.status === "completed").length,
        };
        setStats(newStats); _cachedStats = newStats;
        setRecentAppts(appts.slice(0, 3)); _cachedAppts = appts.slice(0, 3);
      }
      if (alertData.success) {
        const u = alertData.unreadCount || 0;
        setUnreadCount(u); _cachedUnread = u;
      }
      if (visitData.success) {
        const visits = visitData.List || [];
        setRecentVisits(visits.slice(0, 3)); _cachedVisits = visits.slice(0, 3);
        const newStats2 = { ..._cachedStats, totalVisits: visits.length };
        setStats(newStats2); _cachedStats = newStats2;
      }
      _cachedUser = u; _cachedToken = t || "";
      _loaded = true;
    } catch (e) { if (__DEV__) console.log(e); }
    finally { setLoading(false); setRefreshing(false); isFetching.current = false; }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const tokenRef = useRef("");
  useEffect(() => {
    const poll = async () => {
      try {
        const { token: t } = await getAuth();
        tokenRef.current = t || "";
        const res = await fetch(`${BASE_URL}/api/v1/alerts/getall`, { headers: { Authorization: tokenRef.current } });
        const json = await res.json();
        if (json.success) setUnreadCount(json.unreadCount || 0);
      } catch {}
    };
    const interval = setInterval(poll, 30000);
    return () => clearInterval(interval);
  }, []);

  const isSameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();
  const isToday = isSameDay(selectedDate, new Date());

  const fmtDateTime = (d) =>
    d ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  // Calendar helpers
  const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const getFirstDay    = (y, m) => new Date(y, m, 1).getDay();
  const calYear = calMonth.getFullYear();
  const calMonthIdx = calMonth.getMonth();
  const calDays = [
    ...Array(getFirstDay(calYear, calMonthIdx)).fill(null),
    ...Array.from({ length: getDaysInMonth(calYear, calMonthIdx) }, (_, i) => i + 1),
  ];
  const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const DAY_NAMES   = ["Su","Mo","Tu","We","Th","Fr","Sa"];

  const STAT_CARDS = [
    { label: "Total Bookings", subLabel: "All time", value: stats.total,      icon: "calendar", color: "#0B3D2E", route: { pathname: "/admin/appointments", params: { filter: "All" } } },
    { label: "Total Visits",   subLabel: "All time", value: stats.totalVisits, icon: "paw",      color: "#1A5C3A", route: "/admin/totalvisits" },
    { label: "Pending",        subLabel: "All time", value: stats.pending,     icon: "time",     color: "#2D6A4F", route: { pathname: "/admin/appointments", params: { filter: "Pending" } } },
    { label: "Completed",      subLabel: "All time", value: stats.completed,   icon: "ribbon",   color: "#3E7B27", route: { pathname: "/admin/appointments", params: { filter: "Completed" } } },
  ];

  return (
    <View style={s.container}>
      {/* Hero Header */}
      <View style={s.hero}>
        <View style={s.heroLeft}>
          <Text style={s.heroGreeting}>{greeting} 👋</Text>
          <Text style={s.heroName}>{user?.fullName || "Admin"}</Text>
          <TouchableOpacity onPress={() => setCalModal(true)} activeOpacity={0.7} style={s.heroDateRow}>
            <Ionicons name="calendar-outline" size={12} color="rgba(168,217,108,0.8)" />
            <Text style={s.heroDate}>
              {isToday
                ? new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })
                : selectedDate.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={s.heroRight}>
          <TouchableOpacity style={s.bellBtn} onPress={() => router.push("/admin/notifications")} activeOpacity={0.8}>
            <Ionicons name="notifications-outline" size={22} color="#fff" />
            {unreadCount > 0 && (
              <View style={s.bellBadge}>
                <Text style={s.bellBadgeTxt}>{unreadCount > 99 ? "99+" : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <View style={s.heroBadge}>
            <Ionicons name="shield-checkmark-outline" size={11} color="#A8D96C" />
            <Text style={s.heroBadgeTxt}>Admin</Text>
          </View>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0B3D2E" style={{ flex: 1 }} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor="#A8D96C" />}
        >
          {/* Date Filter Banner */}
          {!isToday && (
            <TouchableOpacity style={s.dateBanner} onPress={() => setCalModal(true)} activeOpacity={0.8}>
              <Ionicons name="calendar" size={15} color="#B45309" />
              <Text style={s.dateBannerTxt}>
                Showing: {selectedDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </Text>
              <TouchableOpacity onPress={() => setSelectedDate(new Date())} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={16} color="#B45309" />
              </TouchableOpacity>
            </TouchableOpacity>
          )}

          {/* Stats Grid */}
          <View style={s.statsGrid}>
            {STAT_CARDS.map((stat) => (
              <TouchableOpacity key={stat.label} style={[s.statCard, { backgroundColor: stat.color }]} onPress={() => router.push(stat.route)} activeOpacity={0.8}>
                <View style={s.statIconBox}>
                  <Ionicons name={stat.icon} size={22} color="#A8D96C" />
                </View>
                <Text style={s.statValue}>{stat.value}</Text>
                <Text style={s.statLabel}>{stat.label}</Text>
                <Text style={s.statSubLabel}>{stat.subLabel}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Quick Actions */}
          <View style={s.sectionRow}>
            <Text style={s.sectionTitle}>Quick Actions</Text>
          </View>
          <View style={s.actionsGrid}>
            {QUICK_ACTIONS.map((a) => (
              <TouchableOpacity key={a.label} style={s.actionCard} onPress={() => router.push(a.route)} activeOpacity={0.8}>
                <View style={s.actionIconBox}>
                  <Ionicons name={a.icon} size={24} color="#0B3D2E" />
                </View>
                <Text style={s.actionLabel}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Recent Visits */}
          <View style={s.sectionRow}>
            <Text style={s.sectionTitle}>Recent Visits</Text>
            <TouchableOpacity onPress={() => router.push("/admin/totalvisits")}>
              <Text style={s.sectionLink}>View All →</Text>
            </TouchableOpacity>
          </View>
          {recentVisits.length === 0 ? (
            <View style={s.emptyBox}>
              <Ionicons name="document-text-outline" size={40} color="#A8D96C" />
              <Text style={s.emptyText}>No visits yet</Text>
            </View>
          ) : (
            recentVisits.map((v, i) => (
              <View key={v._id || i} style={s.card}>
                <View style={s.cardHeader}>
                  <View style={s.cardHeaderLeft}>
                    <Text style={s.serviceName}>{v.visitType?.purpose || "Visit"}</Text>
                    {v.pet?.name && (
                      <Text style={s.petInfo}>🐾 {v.pet.name}{v.pet?.owner?.name ? `  •  ${v.pet.owner.name}` : ""}</Text>
                    )}
                  </View>
                  {v.details?.price != null && <Text style={s.priceTag}>₹{v.details.price}</Text>}
                </View>
                <View style={s.divider} />
                <View style={s.detailRow}>
                  <View style={s.detailItem}>
                    <Ionicons name="calendar-outline" size={13} color="#666" />
                    <Text style={s.detailText}>{fmtDateTime(v.createdAt)}</Text>
                  </View>
                </View>
              </View>
            ))
          )}

          {/* Recent Bookings */}
          <View style={s.sectionRow}>
            <Text style={s.sectionTitle}>Recent Bookings</Text>
            <TouchableOpacity onPress={() => router.push("/admin/appointments")}>
              <Text style={s.sectionLink}>View All →</Text>
            </TouchableOpacity>
          </View>
          {recentAppointments.length === 0 ? (
            <View style={s.emptyBox}>
              <Ionicons name="calendar-outline" size={40} color="#A8D96C" />
              <Text style={s.emptyText}>No bookings yet</Text>
            </View>
          ) : (
            recentAppointments.map((appt) => (
              <View key={appt._id} style={s.card}>
                <View style={s.cardHeader}>
                  <View style={s.cardHeaderLeft}>
                    <Text style={s.serviceName}>{appt.serviceName}</Text>
                    <Text style={s.petInfo}>🐾 {appt.petName}  •  {appt.customerId?.fullName || "Customer"}</Text>
                  </View>
                  <View style={[s.statusBadge, { backgroundColor: STATUS_BG[appt.status] }]}>
                    <Text style={[s.statusText, { color: STATUS_COLOR[appt.status] }]}>{appt.status}</Text>
                  </View>
                </View>
                <View style={s.divider} />
                <View style={s.detailRow}>
                  <View style={s.detailItem}>
                    <Ionicons name="time-outline" size={13} color="#666" />
                    <Text style={s.detailText}>{appt.appointmentTime}</Text>
                  </View>
                  {appt.totalAmount > 0 && (
                    <View style={s.detailItem}>
                      <Ionicons name="cash-outline" size={13} color="#666" />
                      <Text style={s.detailText}>₹{appt.totalAmount}</Text>
                    </View>
                  )}
                </View>
              </View>
            ))
          )}

          <View style={{ height: 30 }} />
        </ScrollView>
      )}

      {/* Calendar Modal */}
      <Modal visible={calModal} transparent animationType="fade" onRequestClose={() => setCalModal(false)}>
        <TouchableOpacity style={s.calOverlay} activeOpacity={1} onPress={() => setCalModal(false)}>
          <TouchableOpacity activeOpacity={1} style={s.calBox}>
            <View style={s.calHeader}>
              <TouchableOpacity onPress={() => setCalMonth(new Date(calYear, calMonthIdx - 1, 1))} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="chevron-back" size={20} color="#0B3D2E" />
              </TouchableOpacity>
              <Text style={s.calMonthTxt}>{MONTH_NAMES[calMonthIdx]} {calYear}</Text>
              <TouchableOpacity onPress={() => setCalMonth(new Date(calYear, calMonthIdx + 1, 1))} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="chevron-forward" size={20} color="#0B3D2E" />
              </TouchableOpacity>
            </View>
            <View style={s.calDayRow}>
              {DAY_NAMES.map(d => <Text key={d} style={s.calDayName}>{d}</Text>)}
            </View>
            <FlatList
              data={calDays}
              numColumns={7}
              keyExtractor={(_, i) => String(i)}
              scrollEnabled={false}
              renderItem={({ item: day }) => {
                if (!day) return <View style={s.calDayEmpty} />;
                const thisDate = new Date(calYear, calMonthIdx, day);
                const isSelected = isSameDay(thisDate, selectedDate);
                const isTodayDay = isSameDay(thisDate, new Date());
                const isFuture = thisDate > new Date();
                return (
                  <TouchableOpacity
                    style={[s.calDay, isSelected && s.calDaySelected, isTodayDay && !isSelected && s.calDayToday, isFuture && s.calDayFuture]}
                    onPress={() => { setSelectedDate(thisDate); setCalModal(false); }}
                    disabled={isFuture}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.calDayTxt, isSelected && s.calDayTxtSelected, isTodayDay && !isSelected && s.calDayTxtToday, isFuture && s.calDayTxtFuture]}>{day}</Text>
                  </TouchableOpacity>
                );
              }}
            />
            <TouchableOpacity style={s.calTodayBtn} onPress={() => { setSelectedDate(new Date()); setCalModal(false); }} activeOpacity={0.8}>
              <Text style={s.calTodayBtnTxt}>Go to Today</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F7F0" },

  hero: {
    backgroundColor: "#0B3D2E",
    paddingHorizontal: 20, paddingTop: STATUS_BAR_HEIGHT + 20, paddingBottom: 36,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  heroLeft: { flex: 1 },
  heroGreeting: { fontSize: 12, color: "#A8D96C", fontFamily: "Inter_400Regular", marginBottom: 2 },
  heroName: { fontSize: 22, color: "#fff", fontFamily: "Poppins_700Bold", marginBottom: 6 },
  heroDateRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  heroDate: { fontSize: 11, color: "rgba(168,217,108,0.8)", fontFamily: "Inter_400Regular" },
  heroRight: { flexDirection: "column", alignItems: "flex-end", gap: 10 },
  bellBtn: { position: "relative", padding: 8, backgroundColor: "rgba(168,217,108,0.15)", borderRadius: 12 },
  bellBadge: {
    position: "absolute", top: -3, right: -3,
    backgroundColor: "#C62828", borderRadius: 10,
    minWidth: 17, height: 17, justifyContent: "center", alignItems: "center",
    paddingHorizontal: 3, borderWidth: 1.5, borderColor: "#0B3D2E",
  },
  bellBadgeTxt: { fontSize: 8, fontFamily: "Poppins_700Bold", color: "#fff" },
  heroBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(168,217,108,0.15)",
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  heroBadgeTxt: { fontSize: 11, fontFamily: "Poppins_700Bold", color: "#A8D96C" },

  scroll: { paddingBottom: 48 },

  dateBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FFF9E6", borderRadius: 12, padding: 10, marginHorizontal: 16, marginTop: 16, marginBottom: 4, borderWidth: 1, borderColor: "#FDE68A" },
  dateBannerTxt: { flex: 1, fontSize: 13, fontFamily: "Poppins_700Bold", color: "#B45309" },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, padding: 16, paddingBottom: 4 },
  statCard: {
    width: "47.5%", borderRadius: 18, padding: 16,
    elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
  },
  statIconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: "rgba(168,217,108,0.15)", justifyContent: "center", alignItems: "center", marginBottom: 12 },
  statValue: { fontSize: 30, fontFamily: "Poppins_700Bold", color: "#fff", marginBottom: 4 },
  statLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.75)", marginTop: 2 },
  statSubLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.55)", marginTop: 1 },

  sectionRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, marginTop: 20, marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  sectionLink: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#3E7B27" },

  actionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingHorizontal: 16, marginBottom: 4 },
  actionCard: {
    width: "30%", backgroundColor: "#fff", borderRadius: 14, padding: 12,
    alignItems: "center", gap: 8, elevation: 2, borderWidth: 1, borderColor: "#E8F5E8",
  },
  actionIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#E8F5E8", justifyContent: "center", alignItems: "center" },
  actionLabel: { fontSize: 10, fontFamily: "Poppins_700Bold", color: "#0B3D2E", textAlign: "center" },

  card: {
    backgroundColor: "#fff", borderRadius: 16, padding: 14,
    marginHorizontal: 16, marginBottom: 10, elevation: 2, borderWidth: 1, borderColor: "#D4EDD4",
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  cardHeaderLeft: { flex: 1 },
  serviceName: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 2 },
  petInfo: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#666" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginLeft: 8 },
  statusText: { fontSize: 11, fontFamily: "Poppins_700Bold", textTransform: "capitalize" },
  priceTag: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#3E7B27" },

  divider: { height: 1, backgroundColor: "#E8F5E8", marginBottom: 10 },
  detailRow: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 4 },
  detailItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  detailText: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#555" },

  emptyBox: { alignItems: "center", paddingVertical: 30, gap: 8, marginBottom: 8 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#999" },

  calOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center" },
  calBox: { backgroundColor: "#fff", borderRadius: 20, padding: 20, width: "88%", elevation: 10 },
  calHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  calMonthTxt: { fontSize: 16, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  calDayRow: { flexDirection: "row", marginBottom: 6 },
  calDayName: { flex: 1, textAlign: "center", fontSize: 11, fontFamily: "Poppins_700Bold", color: "#3E7B27" },
  calDay: { flex: 1, aspectRatio: 1, justifyContent: "center", alignItems: "center", borderRadius: 8, margin: 1 },
  calDayEmpty: { flex: 1, aspectRatio: 1, margin: 1 },
  calDaySelected: { backgroundColor: "#0B3D2E" },
  calDayToday: { backgroundColor: "#E8F5E8", borderWidth: 1.5, borderColor: "#3E7B27" },
  calDayFuture: { opacity: 0.3 },
  calDayTxt: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#1A1A1A" },
  calDayTxtSelected: { fontFamily: "Poppins_700Bold", color: "#A8D96C" },
  calDayTxtToday: { fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  calDayTxtFuture: { color: "#ccc" },
  calTodayBtn: { backgroundColor: "#0B3D2E", borderRadius: 12, paddingVertical: 12, alignItems: "center", marginTop: 14 },
  calTodayBtnTxt: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#A8D96C" },
});
