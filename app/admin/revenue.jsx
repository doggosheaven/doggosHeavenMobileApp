import { useState, useCallback, useMemo } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, FlatList,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { getAuth } from "../../utils/authStorage";
import { BASE_URL } from "../../constants/api";

// ── Calendar Modal (same as staff dashboard) ─────────────────────────────────
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAY_NAMES   = ["Su","Mo","Tu","We","Th","Fr","Sa"];

function CalendarModal({ visible, selectedDate, onSelect, onClose }) {
  const [calMonth, setCalMonth] = useState(selectedDate || new Date());
  const year  = calMonth.getFullYear();
  const month = calMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay    = new Date(year, month, 1).getDay();
  const isSameDay   = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();
  const calDays = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={cs.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={cs.box}>
          <View style={cs.header}>
            <TouchableOpacity onPress={() => setCalMonth(new Date(year, month - 1, 1))} hitSlop={{ top:8,bottom:8,left:8,right:8 }}>
              <Ionicons name="chevron-back" size={20} color="#0B3D2E" />
            </TouchableOpacity>
            <Text style={cs.monthTxt}>{MONTH_NAMES[month]} {year}</Text>
            <TouchableOpacity onPress={() => setCalMonth(new Date(year, month + 1, 1))} hitSlop={{ top:8,bottom:8,left:8,right:8 }}>
              <Ionicons name="chevron-forward" size={20} color="#0B3D2E" />
            </TouchableOpacity>
          </View>
          <View style={cs.dayRow}>
            {DAY_NAMES.map(d => <Text key={d} style={cs.dayName}>{d}</Text>)}
          </View>
          <FlatList
            data={calDays}
            numColumns={7}
            keyExtractor={(_, i) => String(i)}
            scrollEnabled={false}
            renderItem={({ item: day }) => {
              if (!day) return <View style={cs.dayEmpty} />;
              const thisDate   = new Date(year, month, day);
              const isSelected = selectedDate && isSameDay(thisDate, selectedDate);
              const isTodayDay = isSameDay(thisDate, new Date());
              const isFuture   = thisDate > new Date();
              return (
                <TouchableOpacity
                  style={[cs.day, isSelected && cs.daySelected, isTodayDay && !isSelected && cs.dayToday, isFuture && cs.dayFuture]}
                  onPress={() => { onSelect(thisDate); onClose(); }}
                  disabled={isFuture}
                  activeOpacity={0.7}
                >
                  <Text style={[cs.dayTxt, isSelected && cs.dayTxtSelected, isTodayDay && !isSelected && cs.dayTxtToday, isFuture && cs.dayTxtFuture]}>{day}</Text>
                </TouchableOpacity>
              );
            }}
          />
          <TouchableOpacity style={cs.todayBtn} onPress={() => { onSelect(new Date()); onClose(); }} activeOpacity={0.8}>
            <Text style={cs.todayBtnTxt}>Go to Today</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const cs = StyleSheet.create({
  overlay: { flex:1, backgroundColor:"rgba(0,0,0,0.45)", justifyContent:"center", alignItems:"center" },
  box: { backgroundColor:"#fff", borderRadius:20, padding:20, width:"88%", elevation:10 },
  header: { flexDirection:"row", justifyContent:"space-between", alignItems:"center", marginBottom:14 },
  monthTxt: { fontSize:16, fontFamily:"Poppins_700Bold", color:"#0B3D2E" },
  dayRow: { flexDirection:"row", marginBottom:6 },
  dayName: { flex:1, textAlign:"center", fontSize:11, fontFamily:"Poppins_700Bold", color:"#3E7B27" },
  day: { flex:1, aspectRatio:1, justifyContent:"center", alignItems:"center", borderRadius:8, margin:1 },
  dayEmpty: { flex:1, aspectRatio:1, margin:1 },
  daySelected: { backgroundColor:"#0B3D2E" },
  dayToday: { backgroundColor:"#E8F5E8", borderWidth:1.5, borderColor:"#3E7B27" },
  dayFuture: { opacity:0.3 },
  dayTxt: { fontSize:13, fontFamily:"Inter_400Regular", color:"#1A1A1A" },
  dayTxtSelected: { fontFamily:"Poppins_700Bold", color:"#A8D96C" },
  dayTxtToday: { fontFamily:"Poppins_700Bold", color:"#0B3D2E" },
  dayTxtFuture: { color:"#ccc" },
  todayBtn: { backgroundColor:"#0B3D2E", borderRadius:12, paddingVertical:12, alignItems:"center", marginTop:14 },
  todayBtnTxt: { fontSize:14, fontFamily:"Poppins_700Bold", color:"#A8D96C" },
});

// ── Quick filter helpers ──────────────────────────────────────────────────────
const QUICK_FILTERS = [
  { label: "1M",  months: 1  },
  { label: "6M",  months: 6  },
  { label: "1Y",  months: 12 },
  { label: "All", months: 0  },
];

function getStartDate(months) {
  if (!months) return null;
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AdminRevenue() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Date filter state
  const [quickFilter, setQuickFilter] = useState("1M");
  const [fromDate, setFromDate] = useState(getStartDate(1));
  const [toDate, setToDate] = useState(new Date());
  const [showFromCal, setShowFromCal] = useState(false);
  const [showToCal, setShowToCal] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const { token } = await getAuth();
      const res = await fetch(`${BASE_URL}/api/v1/customerappointment/getallappoint`, {
        headers: { Authorization: token || "" },
      });
      const data = await res.json();
      if (data.success) setAppointments(data.data || []);
    } catch (e) { console.log(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleQuickFilter = (f) => {
    setQuickFilter(f.label);
    if (f.months === 0) {
      setFromDate(null);
    } else {
      setFromDate(getStartDate(f.months));
    }
    setToDate(new Date());
  };

  // Filter appointments by date range
  const filtered = useMemo(() => {
    return appointments.filter(a => {
      const d = new Date(a.appointmentDate || a.createdAt);
      if (fromDate && d < fromDate) return false;
      const toEnd = new Date(toDate); toEnd.setHours(23, 59, 59, 999);
      if (d > toEnd) return false;
      return true;
    });
  }, [appointments, fromDate, toDate]);

  const paid       = filtered.filter(a => a.paymentStatus === "paid");
  const pending    = filtered.filter(a => a.paymentStatus !== "paid" && a.status !== "cancelled");
  const totalRev   = paid.reduce((sum, a) => sum + (a.totalAmount || 0), 0);
  const pendingRev = pending.reduce((sum, a) => sum + (a.totalAmount || 0), 0);

  const byService = paid.reduce((acc, a) => {
    const key = a.serviceName || "Other";
    if (!acc[key]) acc[key] = { count: 0, amount: 0 };
    acc[key].count++;
    acc[key].amount += a.totalAmount || 0;
    return acc;
  }, {});
  const serviceList = Object.entries(byService).sort((a, b) => b[1].amount - a[1].amount);
  const recentPaid  = [...paid].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 10);

  const fmtDate = (d) => d ? d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
  const isCustom = quickFilter === "custom";

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Revenue</Text>
        <Text style={styles.headerSub}>{paid.length} paid transactions</Text>
      </View>

      {/* Quick Filters */}
      <View style={styles.filterBar}>
        <View style={styles.quickRow}>
          {QUICK_FILTERS.map(f => (
            <TouchableOpacity
              key={f.label}
              style={[styles.quickChip, quickFilter === f.label && styles.quickChipActive]}
              onPress={() => handleQuickFilter(f)}
              activeOpacity={0.8}
            >
              <Text style={[styles.quickChipTxt, quickFilter === f.label && styles.quickChipTxtActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Date Range Pickers */}
        <View style={styles.dateRow}>
          <TouchableOpacity style={styles.datePicker} onPress={() => setShowFromCal(true)} activeOpacity={0.8}>
            <Ionicons name="calendar-outline" size={14} color="#0B3D2E" />
            <Text style={styles.datePickerTxt}>{fromDate ? fmtDate(fromDate) : "All time"}</Text>
          </TouchableOpacity>
          <Text style={styles.dateArrow}>→</Text>
          <TouchableOpacity style={styles.datePicker} onPress={() => setShowToCal(true)} activeOpacity={0.8}>
            <Ionicons name="calendar-outline" size={14} color="#0B3D2E" />
            <Text style={styles.datePickerTxt}>{fmtDate(toDate)}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0B3D2E" style={{ flex: 1 }} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor="#0B3D2E" />}
        >
          {/* Total Revenue Card */}
          <View style={styles.totalCard}>
            <View style={styles.totalIconBox}>
              <Ionicons name="trending-up" size={28} color="#A8D96C" />
            </View>
            <Text style={styles.totalLabel}>Total Revenue Collected</Text>
            <Text style={styles.totalAmount}>₹{totalRev.toLocaleString("en-IN")}</Text>
            <Text style={styles.totalSub}>From {paid.length} paid bookings</Text>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { borderLeftColor: "#3E7B27" }]}>
              <Ionicons name="checkmark-circle" size={20} color="#3E7B27" />
              <Text style={styles.statAmount}>₹{totalRev.toLocaleString("en-IN")}</Text>
              <Text style={styles.statLabel}>Collected</Text>
            </View>
            <View style={[styles.statCard, { borderLeftColor: "#F59E0B" }]}>
              <Ionicons name="time" size={20} color="#F59E0B" />
              <Text style={styles.statAmount}>₹{pendingRev.toLocaleString("en-IN")}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={[styles.statCard, { borderLeftColor: "#0B3D2E" }]}>
              <Ionicons name="cash" size={20} color="#0B3D2E" />
              <Text style={styles.statAmount}>₹{(totalRev + pendingRev).toLocaleString("en-IN")}</Text>
              <Text style={styles.statLabel}>Total Billed</Text>
            </View>
          </View>

          {/* Revenue by Service */}
          {serviceList.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Revenue by Service</Text>
              {serviceList.map(([name, data]) => {
                const pct = totalRev > 0 ? (data.amount / totalRev) * 100 : 0;
                return (
                  <View key={name} style={styles.serviceCard}>
                    <View style={styles.serviceTop}>
                      <Text style={styles.serviceName}>{name}</Text>
                      <Text style={styles.serviceAmount}>₹{data.amount.toLocaleString("en-IN")}</Text>
                    </View>
                    <View style={styles.progressBg}>
                      <View style={[styles.progressFill, { width: `${pct}%` }]} />
                    </View>
                    <Text style={styles.serviceCount}>{data.count} booking{data.count > 1 ? "s" : ""} • {pct.toFixed(1)}%</Text>
                  </View>
                );
              })}
            </>
          )}

          {/* Recent Transactions */}
          {recentPaid.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Recent Transactions</Text>
              {recentPaid.map((a) => (
                <View key={a._id} style={styles.txCard}>
                  <View style={styles.txIconBox}>
                    <Ionicons name="checkmark-circle" size={20} color="#3E7B27" />
                  </View>
                  <View style={styles.txInfo}>
                    <Text style={styles.txService}>{a.serviceName}</Text>
                    <Text style={styles.txPet}>🐾 {a.petName} • {a.customerId?.fullName || "Customer"}</Text>
                    <Text style={styles.txDate}>
                      {new Date(a.appointmentDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </Text>
                  </View>
                  <Text style={styles.txAmount}>₹{a.totalAmount}</Text>
                </View>
              ))}
            </>
          )}

          {paid.length === 0 && (
            <View style={styles.emptyBox}>
              <Ionicons name="cash-outline" size={48} color="#A8D96C" />
              <Text style={styles.emptyText}>No revenue in this period</Text>
              <Text style={styles.emptySub}>Try a different date range</Text>
            </View>
          )}
        </ScrollView>
      )}

      <CalendarModal
        visible={showFromCal}
        selectedDate={fromDate}
        onSelect={(d) => { setFromDate(d); setQuickFilter("custom"); }}
        onClose={() => setShowFromCal(false)}
      />
      <CalendarModal
        visible={showToCal}
        selectedDate={toDate}
        onSelect={(d) => { setToDate(d); setQuickFilter("custom"); }}
        onClose={() => setShowToCal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F7F0" },
  header: {
    backgroundColor: "#0B3D2E", paddingHorizontal: 20,
    paddingTop: 52, paddingBottom: 16,
  },
  headerTitle: { fontSize: 20, fontFamily: "Poppins_700Bold", color: "#fff" },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#A8D96C", marginTop: 2 },

  filterBar: {
    backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: "#D4EDD4", gap: 10,
  },
  quickRow: { flexDirection: "row", gap: 8 },
  quickChip: {
    paddingHorizontal: 18, paddingVertical: 7, borderRadius: 20,
    backgroundColor: "#F0F7F0", borderWidth: 1, borderColor: "#D4EDD4",
  },
  quickChipActive: { backgroundColor: "#0B3D2E", borderColor: "#0B3D2E" },
  quickChipTxt: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#3E7B27" },
  quickChipTxtActive: { color: "#A8D96C" },

  dateRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  datePicker: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#F0F7F0", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: "#D4EDD4",
  },
  datePickerTxt: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#0B3D2E", flex: 1 },
  dateArrow: { fontSize: 16, color: "#999", fontFamily: "Poppins_700Bold" },

  scroll: { padding: 16, paddingBottom: 40 },

  totalCard: {
    backgroundColor: "#0B3D2E", borderRadius: 20, padding: 24,
    alignItems: "center", marginBottom: 16, elevation: 4,
  },
  totalIconBox: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: "rgba(168,217,108,0.2)",
    justifyContent: "center", alignItems: "center", marginBottom: 12,
  },
  totalLabel: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#A8D96C", marginBottom: 6 },
  totalAmount: { fontSize: 36, fontFamily: "Poppins_700Bold", color: "#fff", marginBottom: 4 },
  totalSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#6B9E6B" },

  statsRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1, backgroundColor: "#fff", borderRadius: 14, padding: 12,
    alignItems: "center", elevation: 2,
    borderWidth: 1, borderColor: "#D4EDD4", borderLeftWidth: 4,
  },
  statAmount: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginTop: 6, marginBottom: 2 },
  statLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#666" },

  sectionTitle: { fontSize: 16, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 12 },

  serviceCard: {
    backgroundColor: "#fff", borderRadius: 14, padding: 14,
    marginBottom: 10, elevation: 2, borderWidth: 1, borderColor: "#D4EDD4",
  },
  serviceTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  serviceName: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  serviceAmount: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#3E7B27" },
  progressBg: { height: 6, backgroundColor: "#E8F5E8", borderRadius: 3, marginBottom: 6 },
  progressFill: { height: 6, backgroundColor: "#A8D96C", borderRadius: 3 },
  serviceCount: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#999" },

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
  txAmount: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },

  emptyBox: { alignItems: "center", paddingVertical: 60 },
  emptyText: { fontSize: 16, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginTop: 12 },
  emptySub: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#999", marginTop: 4 },
});
