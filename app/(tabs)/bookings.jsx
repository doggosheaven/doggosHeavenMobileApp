import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, Alert, ActivityIndicator, Modal, FlatList,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Header from "../../components/Header";
import { useApp } from "../../context/AppContext";
import { BASE_URL } from "../../constants/api";

// Pad to a full six-row grid so the calendar keeps one height all year — an
// unpadded month renders four, five or six rows and the dialog jumps about.
const padToSixWeeks = (cells) => {
  const out = [...cells];
  while (out.length < 42) out.push(null);
  return out;
};


const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAY_NAMES = ["Su","Mo","Tu","We","Th","Fr","Sa"];

const STATUS_CONFIG = {
  pending:   { label: "Pending",   bg: "#FFF9E6", color: "#B8860B", icon: "⏳", barColor: "#F0C040" },
  confirmed: { label: "Confirmed", bg: "#E8F5E8", color: "#2E7D32", icon: "✅", barColor: "#4CAF50" },
  completed: { label: "Completed", bg: "#E3F2FD", color: "#1565C0", icon: "🎉", barColor: "#1565C0" },
  cancelled: { label: "Cancelled", bg: "#FFEBEE", color: "#C62828", icon: "❌", barColor: "#C62828" },
};

const FILTERS = [
  { key: "All",       icon: "apps-outline",            label: "All" },
  { key: "Pending",   icon: "time-outline",             label: "Pending" },
  { key: "Confirmed", icon: "checkmark-circle-outline", label: "Confirmed" },
  { key: "Completed", icon: "ribbon-outline",           label: "Completed" },
  { key: "Cancelled", icon: "close-circle-outline",     label: "Cancelled" },
];

export default function BookingsScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("All");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showCalModal, setShowCalModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [calMonth, setCalMonth] = useState(new Date());
  const { user, token, appointments, loadAppointments, setAppointments } = useApp();

  const loading = appointments.length === 0 && !refreshing;

  useEffect(() => { loadAppointments(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAppointments(true);
    setRefreshing(false);
  };

  const handlePayNow = (appt, e) => {
    e?.stopPropagation?.();
    Alert.alert(
      "\u23f3 Payment Awaiting",
      "Please coordinate with our staff to complete the payment of \u20b9" + appt.totalAmount + " for " + appt.serviceName + ".\n\nVisit the clinic or contact us directly.",
      [{ text: "OK" }]
    );
  };

  const handleCancel = (id, e) => {
    e?.stopPropagation?.();
    Alert.alert("Cancel Appointment", "Are you sure you want to cancel?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, Cancel", style: "destructive",
        onPress: async () => {
          try {
            const res = await fetch(`${BASE_URL}/api/v1/customerappointment/cancelappoint/${id}`, {
              method: "DELETE",
              headers: { Authorization: token || "" },
            });
            const data = await res.json();
            if (data.success) {
              setAppointments((prev) =>
                prev.map((a) => a._id === id ? { ...a, status: "cancelled" } : a)
              );
            } else {
              Alert.alert("Error", data.message || "Could not cancel");
            }
          } catch {
            Alert.alert("Error", "Network error");
          }
        },
      },
    ]);
  };

  const isSameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();

  const filtered = (filter === "All"
    ? appointments
    : appointments.filter((a) => a.status === filter.toLowerCase())
  ).filter((a) => selectedDate ? isSameDay(a.appointmentDate, selectedDate) : true);

  const calYear = calMonth.getFullYear();
  const calMonthIdx = calMonth.getMonth();
  const daysInMonth = new Date(calYear, calMonthIdx + 1, 0).getDate();
  const firstDay = new Date(calYear, calMonthIdx, 1).getDay();
  const calDays = padToSixWeeks([...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]);
  const fmtSelectedDate = selectedDate ? selectedDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";

  const activeFilter = FILTERS.find((f) => f.key === filter);

  const formatDate = (d) => new Date(d).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });

  const formatTime = (t) => {
    if (!t) return "N/A";
    const [h, m] = t.split(":");
    if (!h || !m) return t;
    const date = new Date();
    date.setHours(+h, +m);
    return date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
  };

  return (
    <View style={styles.container}>
      <Header title="My Bookings" />

      {/* Filter Bar */}
      <View style={styles.filterBar}>
        <TouchableOpacity style={styles.filterBtn} onPress={() => setShowFilterModal(true)} activeOpacity={0.8}>
          <Ionicons name="options-outline" size={16} color="#0B3D2E" />
          <Text style={styles.filterBtnText}>{activeFilter?.label}</Text>
          <Ionicons name="chevron-down" size={13} color="#0B3D2E" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.filterBtn, selectedDate && styles.filterBtnActive]} onPress={() => setShowCalModal(true)} activeOpacity={0.8}>
          <Ionicons name="calendar-outline" size={16} color={selectedDate ? "#fff" : "#0B3D2E"} />
          <Text style={[styles.filterBtnText, selectedDate && { color: "#fff" }]}>
            {selectedDate ? fmtSelectedDate : "Date"}
          </Text>
          {selectedDate && (
            <TouchableOpacity onPress={() => setSelectedDate(null)} hitSlop={{ top:6,bottom:6,left:6,right:6 }}>
              <Ionicons name="close-circle" size={14} color="#fff" />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
        {filter !== "All" && (
          <TouchableOpacity style={styles.clearBtn} onPress={() => setFilter("All")} activeOpacity={0.8}>
            <Ionicons name="close-circle" size={15} color="#C62828" />
            <Text style={styles.clearBtnText}>Clear</Text>
          </TouchableOpacity>
        )}
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{filtered.length}</Text>
        </View>
      </View>

      {/* Calendar Modal */}
      <Modal visible={showCalModal} transparent animationType="fade" onRequestClose={() => setShowCalModal(false)}>
        <TouchableOpacity style={styles.calOverlay} activeOpacity={1} onPress={() => setShowCalModal(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.calBox}>
            <View style={styles.calHeader}>
              <TouchableOpacity onPress={() => setCalMonth(new Date(calYear, calMonthIdx - 1, 1))} hitSlop={{top:8,bottom:8,left:8,right:8}}>
                <Ionicons name="chevron-back" size={20} color="#0B3D2E" />
              </TouchableOpacity>
              <Text style={styles.calMonthTxt}>{MONTH_NAMES[calMonthIdx]} {calYear}</Text>
              <TouchableOpacity onPress={() => setCalMonth(new Date(calYear, calMonthIdx + 1, 1))} hitSlop={{top:8,bottom:8,left:8,right:8}}>
                <Ionicons name="chevron-forward" size={20} color="#0B3D2E" />
              </TouchableOpacity>
            </View>
            <View style={styles.calDayRow}>
              {DAY_NAMES.map(d => <Text key={d} style={styles.calDayName}>{d}</Text>)}
            </View>
            <FlatList
              data={calDays}
              numColumns={7}
              keyExtractor={(_, i) => String(i)}
              scrollEnabled={false}
              renderItem={({ item: day }) => {
                if (!day) return <View style={styles.calDayEmpty} />;
                const thisDate = new Date(calYear, calMonthIdx, day);
                const isSel = selectedDate && isSameDay(thisDate, selectedDate);
                const isToday = isSameDay(thisDate, new Date());
                return (
                  <TouchableOpacity
                    style={[styles.calDay, isSel && styles.calDaySelected, isToday && !isSel && styles.calDayToday]}
                    onPress={() => { setSelectedDate(thisDate); setShowCalModal(false); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.calDayTxt, isSel && styles.calDayTxtSelected, isToday && !isSel && styles.calDayTxtToday]}>{day}</Text>
                  </TouchableOpacity>
                );
              }}
            />
            <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
              <TouchableOpacity style={[styles.calTodayBtn, { flex: 1, backgroundColor: "#F0F7F0" }]} onPress={() => { setSelectedDate(new Date()); setShowCalModal(false); }} activeOpacity={0.8}>
                <Text style={[styles.calTodayBtnTxt, { color: "#0B3D2E" }]}>Today</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.calTodayBtn, { flex: 1 }]} onPress={() => { setSelectedDate(null); setShowCalModal(false); }} activeOpacity={0.8}>
                <Text style={styles.calTodayBtnTxt}>Show All</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Filter Modal */}
      <Modal visible={showFilterModal} transparent animationType="slide" onRequestClose={() => setShowFilterModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowFilterModal(false)}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Filter Bookings</Text>
            {FILTERS.map((f) => (
              <TouchableOpacity
                key={f.key}
                style={[styles.modalOption, filter === f.key && styles.modalOptionActive]}
                onPress={() => { setFilter(f.key); setShowFilterModal(false); }}
                activeOpacity={0.8}
              >
                <View style={[styles.modalOptionIcon, filter === f.key && styles.modalOptionIconActive]}>
                  <Ionicons name={f.icon} size={18} color={filter === f.key ? "#fff" : "#0B3D2E"} />
                </View>
                <Text style={[styles.modalOptionText, filter === f.key && styles.modalOptionTextActive]}>{f.label}</Text>
                <Text style={styles.modalOptionCount}>
                  {f.key === "All" ? appointments.length : appointments.filter(a => a.status === f.key.toLowerCase()).length}
                </Text>
                {filter === f.key && <Ionicons name="checkmark-circle" size={18} color="#A8D96C" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0B3D2E" />}
      >
        {/* New Booking CTA */}
        <TouchableOpacity style={styles.newBookingBtn} onPress={() => router.navigate("/(tabs)/services")} activeOpacity={0.85}>
          <View style={styles.newBookingLeft}>
            <View style={styles.newBookingIconBox}>
              <Ionicons name="add" size={22} color="#A8D96C" />
            </View>
            <View>
              <Text style={styles.newBookingTitle}>Book a New Service</Text>
              <Text style={styles.newBookingSub}>Explore all available services</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#A8D96C" />
        </TouchableOpacity>

        {/* Stats */}
        {appointments.length > 0 && (
          <View style={styles.statsRow}>
            {[
              { label: "Total", count: appointments.length, color: "#0B3D2E" },
              { label: "Pending", count: appointments.filter(a => a.status === "pending").length, color: "#B8860B" },
              { label: "Confirmed", count: appointments.filter(a => a.status === "confirmed").length, color: "#2E7D32" },
              { label: "Done", count: appointments.filter(a => a.status === "completed").length, color: "#1565C0" },
            ].map((s) => (
              <View key={s.label} style={styles.statCard}>
                <Text style={[styles.statNum, { color: s.color }]}>{s.count}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* List */}
        {loading ? (
          <View style={styles.emptyBox}>
            <ActivityIndicator size="large" color="#0B3D2E" />
            <Text style={styles.loadingText}>Loading bookings...</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={styles.emptyTitle}>No {filter !== "All" ? filter : ""} Bookings</Text>
            <Text style={styles.emptySubtitle}>Your appointments will appear here</Text>
          </View>
        ) : (
          filtered.map((appt) => {
            const status = STATUS_CONFIG[appt.status] || STATUS_CONFIG.pending;
            return (
              <TouchableOpacity
                key={appt._id}
                style={styles.card}
                onPress={() => router.push({ pathname: "/screens/bookingdetail", params: { id: appt._id } })}
                activeOpacity={0.88}
              >
                {/* Left color bar */}
                <View style={[styles.cardBar, { backgroundColor: status.barColor }]} />

                <View style={styles.cardInner}>
                  {/* Top row */}
                  <View style={styles.cardTop}>
                    <View style={styles.cardIconBox}>
                      <Text style={styles.cardIconText}>🐾</Text>
                    </View>
                    <View style={styles.cardTopInfo}>
                      <Text style={styles.cardServiceName} numberOfLines={1}>{appt.serviceName || "Service"}</Text>
                      <Text style={styles.cardPetName}>🐶 {appt.petName}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                      <Text style={styles.statusIcon}>{status.icon}</Text>
                      <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                    </View>
                  </View>

                  {/* Divider */}
                  <View style={styles.divider} />

                  {/* Info chips */}
                  <View style={styles.chipsRow}>
                    <View style={styles.chip}>
                      <Ionicons name="calendar-outline" size={12} color="#3E7B27" />
                      <Text style={styles.chipText}>{formatDate(appt.appointmentDate)}</Text>
                    </View>
                    <View style={styles.chip}>
                      <Ionicons name="time-outline" size={12} color="#3E7B27" />
                      <Text style={styles.chipText}>{formatTime(appt.appointmentTime)}</Text>
                    </View>
                    {appt.totalAmount > 0 && (
                      <View style={styles.chip}>
                        <Ionicons name="pricetag-outline" size={12} color="#3E7B27" />
                        <Text style={styles.chipText}>₹{appt.totalAmount}</Text>
                      </View>
                    )}
                    {appt.ambulanceRequired && (
                      <View style={[styles.chip, styles.chipAccent]}>
                        <Text style={styles.chipAccentText}>🚗 Pickup & Drop</Text>
                      </View>
                    )}
                  </View>

                  {/* Pay Now inline */}
                  {appt.status === "confirmed" && appt.paymentStatus !== "paid" && (
                    <TouchableOpacity
                      style={styles.payInline}
                      onPress={(e) => handlePayNow(appt, e)}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="card" size={14} color="#0B3D2E" />
                      <Text style={styles.payInlineText}>Pay ₹{appt.totalAmount}</Text>
                      <Ionicons name="chevron-forward" size={13} color="#0B3D2E" style={{ marginLeft: "auto" }} />
                    </TouchableOpacity>
                  )}

                  {appt.status === "confirmed" && appt.paymentStatus === "paid" && (
                    <View style={styles.paidChip}>
                      <Ionicons name="checkmark-circle" size={13} color="#2E7D32" />
                      <Text style={styles.paidChipText}>Payment Done</Text>
                    </View>
                  )}

                  {/* Bottom row */}
                  <View style={styles.cardBottom}>
                    <Text style={styles.cardId}>#{appt._id.slice(-6).toUpperCase()}</Text>
                    <View style={styles.cardActions}>
                      {(appt.status === "pending" || appt.status === "confirmed") && (
                        <TouchableOpacity
                          style={styles.cancelChip}
                          onPress={(e) => handleCancel(appt._id, e)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="close-circle-outline" size={13} color="#C62828" />
                          <Text style={styles.cancelChipText}>Cancel</Text>
                        </TouchableOpacity>
                      )}
                      <View style={styles.viewDetailChip}>
                        <Text style={styles.viewDetailText}>View Details</Text>
                        <Ionicons name="chevron-forward" size={12} color="#3E7B27" />
                      </View>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F7F2" },

  filterBar: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: "#E0EEE0",
  },
  filterBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#F0F7F0", borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 7,
    borderWidth: 1, borderColor: "#A8D96C",
  },
  filterBtnText: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  filterBtnActive: { backgroundColor: "#0B3D2E", borderColor: "#0B3D2E" },
  clearBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  clearBtnText: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#C62828" },
  countBadge: {
    marginLeft: "auto", backgroundColor: "#0B3D2E",
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3,
  },
  countText: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#A8D96C" },

  // Modal bottom sheet
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 36,
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: "#ddd",
    borderRadius: 2, alignSelf: "center", marginBottom: 16,
  },
  modalTitle: { fontSize: 16, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 14 },
  modalOption: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 12, paddingHorizontal: 12, borderRadius: 14, marginBottom: 6,
    backgroundColor: "#F0F7F0",
  },
  modalOptionActive: { backgroundColor: "#0B3D2E" },
  modalOptionIcon: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: "#E8F5E8", justifyContent: "center", alignItems: "center",
  },
  modalOptionIconActive: { backgroundColor: "rgba(168,217,108,0.2)" },
  modalOptionText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: "#0B3D2E" },
  modalOptionTextActive: { color: "#fff", fontFamily: "Poppins_700Bold" },
  modalOptionCount: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#888", marginRight: 6 },

  scroll: { padding: 14, paddingBottom: 40 },

  // New Booking
  newBookingBtn: {
    backgroundColor: "#0B3D2E", borderRadius: 18, padding: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginBottom: 14, elevation: 4,
  },
  newBookingLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  newBookingIconBox: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: "rgba(168,217,108,0.15)",
    justifyContent: "center", alignItems: "center",
  },
  newBookingTitle: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#fff" },
  newBookingSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#A8D96C", marginTop: 1 },

  // Stats
  statsRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  statCard: {
    flex: 1, backgroundColor: "#fff", borderRadius: 14, paddingVertical: 12,
    alignItems: "center", elevation: 1, borderWidth: 1, borderColor: "#E0EEE0",
  },
  statNum: { fontSize: 20, fontFamily: "Poppins_700Bold" },
  statLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#888", marginTop: 2 },

  // Empty / Loading
  emptyBox: { alignItems: "center", paddingVertical: 60 },
  emptyEmoji: { fontSize: 52, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 6 },
  emptySubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#999" },
  loadingText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#888", marginTop: 12 },

  // Card
  card: {
    backgroundColor: "#fff", borderRadius: 18, marginBottom: 12,
    elevation: 2, borderWidth: 1, borderColor: "#E0EEE0",
    flexDirection: "row", overflow: "hidden",
  },
  cardBar: { width: 5 },
  cardInner: { flex: 1, padding: 14 },

  cardTop: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  cardIconBox: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: "#E8F5E8", justifyContent: "center", alignItems: "center", marginRight: 10,
  },
  cardIconText: { fontSize: 20 },
  cardTopInfo: { flex: 1 },
  cardServiceName: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 2 },
  cardPetName: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#666" },

  statusBadge: {
    flexDirection: "row", alignItems: "center", gap: 3,
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20,
  },
  statusIcon: { fontSize: 10 },
  statusText: { fontSize: 10, fontFamily: "Poppins_700Bold" },

  divider: { height: 1, backgroundColor: "#F0F7F0", marginBottom: 10 },

  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#F0F7F0", borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  chipText: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#333" },
  chipAccent: { backgroundColor: "#E8F5E8" },
  chipAccentText: { fontSize: 11, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },

  payInline: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#A8D96C", borderRadius: 12, padding: 10, marginBottom: 8,
  },
  payInlineText: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },

  paidChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#E8F5E8", borderRadius: 10, padding: 8, marginBottom: 8,
    alignSelf: "flex-start",
  },
  paidChipText: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#2E7D32" },

  cardBottom: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginTop: 4,
  },
  cardId: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#bbb" },
  cardActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  cancelChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    borderWidth: 1, borderColor: "#FFCDD2", borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4, backgroundColor: "#FFF5F5",
  },
  cancelChipText: { fontSize: 11, fontFamily: "Poppins_700Bold", color: "#C62828" },
  viewDetailChip: {
    flexDirection: "row", alignItems: "center", gap: 2,
    backgroundColor: "#E8F5E8", borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  viewDetailText: { fontSize: 11, fontFamily: "Poppins_700Bold", color: "#3E7B27" },

  // Calendar
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
  calDayTxt: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#1A1A1A" },
  calDayTxtSelected: { fontFamily: "Poppins_700Bold", color: "#A8D96C" },
  calDayTxtToday: { fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  calTodayBtn: { backgroundColor: "#0B3D2E", borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  calTodayBtnTxt: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#A8D96C" },
});
