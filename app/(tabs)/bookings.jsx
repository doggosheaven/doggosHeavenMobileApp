import { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, Alert, ActivityIndicator, Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Header from "../../components/Header";
import { getAuth } from "../../utils/authStorage";
import { BASE_URL } from "../../constants/api";
import { initiatePayment, calcGST } from "../../utils/paymentHelper";

const STATUS_CONFIG = {
  pending:   { label: "Pending",   bg: "#FFF9E6", color: "#B8860B", icon: "⏳" },
  confirmed: { label: "Confirmed", bg: "#E8F5E8", color: "#2E7D32", icon: "✅" },
  completed: { label: "Completed", bg: "#E8F5E8", color: "#0B3D2E", icon: "🎉" },
  cancelled: { label: "Cancelled", bg: "#FFEBEE", color: "#C62828", icon: "❌" },
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
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("All");
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [payingId, setPayingId] = useState(null);
  const [showFilterModal, setShowFilterModal] = useState(false);

  const loadAppointments = useCallback(async () => {
    try {
      const { user: u, token: t } = await getAuth();
      setToken(t);
      setUser(u);
      const res = await fetch(`${BASE_URL}/api/v1/customerappointment/getcustomerappoint/${u?.id}`, {
        headers: { Authorization: t || "" },
      });
      const data = await res.json();
      if (data.success) setAppointments(data.data || []);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadAppointments(); }, []);
  const onRefresh = () => { setRefreshing(true); loadAppointments(); };

  const handlePayNow = async (appt) => {
    setPayingId(appt._id);
    await initiatePayment({
      appointmentId: appt._id,
      amount: appt.totalAmount,
      paymentMethod: appt.paymentMode || "online",
      serviceName: appt.serviceName,
      user,
      token,
      onSuccess: loadAppointments,
      onRefresh: loadAppointments,
    });
    setPayingId(null);
  };

  const handleCancel = (id) => {
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

  const filtered = filter === "All"
    ? appointments
    : appointments.filter((a) => a.status === filter.toLowerCase());

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
      <Header title="All Bookings" />

      {/* Filter Button Row */}
      <View style={styles.filterRow}>
        <TouchableOpacity style={styles.filterBtn} onPress={() => setShowFilterModal(true)} activeOpacity={0.8}>
          <Ionicons name="filter" size={16} color="#0B3D2E" />
          <Text style={styles.filterBtnText}>Filter: {activeFilter?.label}</Text>
          <Ionicons name="chevron-down" size={14} color="#0B3D2E" />
        </TouchableOpacity>
        {filter !== "All" && (
          <TouchableOpacity style={styles.clearFilterBtn} onPress={() => setFilter("All")}>
            <Ionicons name="close-circle" size={16} color="#C62828" />
            <Text style={styles.clearFilterText}>Clear</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.filterCount}>{filtered.length} booking{filtered.length !== 1 ? "s" : ""}</Text>
      </View>

      {/* Filter Modal */}
      <Modal visible={showFilterModal} transparent animationType="fade" onRequestClose={() => setShowFilterModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowFilterModal(false)}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Filter Bookings</Text>
            {FILTERS.map((f) => (
              <TouchableOpacity
                key={f.key}
                style={[styles.modalOption, filter === f.key && styles.modalOptionActive]}
                onPress={() => { setFilter(f.key); setShowFilterModal(false); }}
                activeOpacity={0.8}
              >
                <Ionicons name={f.icon} size={20} color={filter === f.key ? "#A8D96C" : "#0B3D2E"} />
                <Text style={[styles.modalOptionText, filter === f.key && styles.modalOptionTextActive]}>{f.label}</Text>
                {filter === f.key && <Ionicons name="checkmark" size={18} color="#A8D96C" style={{ marginLeft: "auto" }} />}
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
        {/* New Booking Button */}
        <TouchableOpacity
          style={styles.newBookingBtn}
          onPress={() => router.navigate("/(tabs)/services")}
          activeOpacity={0.8}
        >
          <View style={styles.newBookingIconBox}>
            <Text style={styles.newBookingIcon}>➕</Text>
          </View>
          <Text style={styles.newBookingText}>Book a New Service</Text>
        </TouchableOpacity>

        {/* Stats Row */}
        {appointments.length > 0 && (
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNum}>{appointments.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNum}>{appointments.filter(a => a.status === "pending").length}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNum}>{appointments.filter(a => a.status === "confirmed").length}</Text>
              <Text style={styles.statLabel}>Confirmed</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNum}>{appointments.filter(a => a.status === "completed").length}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
          </View>
        )}

        {/* Appointments List */}
        {loading ? (
          <View style={styles.emptyBox}>
            <ActivityIndicator size="large" color="#0B3D2E" />
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
              <View key={appt._id} style={styles.card}>
                {/* Card Header */}
                <View style={styles.cardHeader}>
                  <View style={styles.serviceIconBox}>
                    <Text style={styles.serviceIconText}>🐾</Text>
                  </View>
                  <View style={styles.cardHeaderInfo}>
                    <Text style={styles.serviceName}>{appt.serviceName || "Service"}</Text>
                    <Text style={styles.petName}>🐶 {appt.petName}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                    <Text style={styles.statusIcon}>{status.icon}</Text>
                    <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                  </View>
                </View>

                <View style={styles.divider} />

                {/* Details */}
                <View style={styles.detailsRow}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailIcon}>📅</Text>
                    <Text style={styles.detailText}>{formatDate(appt.appointmentDate)}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailIcon}>🕐</Text>
                    <Text style={styles.detailText}>{formatTime(appt.appointmentTime)}</Text>
                  </View>
                  {appt.totalAmount > 0 && (() => {
                    const { gst, total } = calcGST(appt.totalAmount, appt.paymentMode || "online");
                    return (
                      <View style={styles.detailItem}>
                        <Text style={styles.detailIcon}>💰</Text>
                        <Text style={styles.detailText}>₹{total} <Text style={{ color: "#B8860B", fontSize: 10 }}>(+₹{gst} GST)</Text></Text>
                      </View>
                    );
                  })()}
                </View>

                {/* Pet Info */}
                {(appt.petBreed || appt.petAge) && (
                  <View style={styles.petInfoBox}>
                    {appt.petBreed && <Text style={styles.petInfoText}>Breed: {appt.petBreed}</Text>}
                    {appt.petAge && <Text style={styles.petInfoText}>Age: {appt.petAge}</Text>}
                  </View>
                )}

                {/* Notes */}
                {appt.notes ? (
                  <View style={styles.notesBox}>
                    <Text style={styles.notesText}>📝 {appt.notes}</Text>
                  </View>
                ) : null}

                {/* Pay Now Banner */}
                {appt.status === "confirmed" && appt.paymentStatus !== "paid" && (() => {
                  const { gst, total } = calcGST(appt.totalAmount, appt.paymentMode || "online");
                  return (
                    <TouchableOpacity
                      style={styles.payBanner}
                      onPress={() => handlePayNow(appt)}
                      activeOpacity={0.8}
                      disabled={payingId === appt._id}
                    >
                      {payingId === appt._id ? (
                        <ActivityIndicator size="small" color="#0B3D2E" style={{ marginRight: 8 }} />
                      ) : (
                        <Ionicons name="card" size={16} color="#0B3D2E" />
                      )}
                      <View style={styles.payBannerInfo}>
                        <Text style={styles.payBannerTitle}>
                          {payingId === appt._id ? "Opening Payment..." : "Payment Pending"}
                        </Text>
                        <Text style={styles.payBannerSub}>Pay ₹{total} (base ₹{appt.totalAmount} + GST ₹{gst})</Text>
                      </View>
                      {payingId !== appt._id && <Text style={styles.payBannerArrow}>Pay →</Text>}
                    </TouchableOpacity>
                  );
                })()}

                {appt.status === "confirmed" && appt.paymentStatus === "paid" && (
                  <View style={styles.paidBanner}>
                    <Ionicons name="checkmark-circle" size={16} color="#2E7D32" />
                    <Text style={styles.paidBannerText}>Payment Completed ✅</Text>
                  </View>
                )}

                {/* Cancel Button */}
                {(appt.status === "pending" || appt.status === "confirmed") && (
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancel(appt._id)}>
                    <Text style={styles.cancelText}>Cancel Appointment</Text>
                  </TouchableOpacity>
                )}

                <Text style={styles.bookingId}>ID: {appt._id.slice(-8).toUpperCase()}</Text>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F7F0" },

  // Filter
  filterRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: "#D4EDD4",
  },
  filterBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#F0F7F0", borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: "#A8D96C",
  },
  filterBtnText: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  clearFilterBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  clearFilterText: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#C62828" },
  filterCount: { marginLeft: "auto", fontSize: 12, fontFamily: "Inter_400Regular", color: "#888" },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center" },
  modalBox: {
    backgroundColor: "#fff", borderRadius: 20, padding: 20,
    width: "80%", elevation: 10,
  },
  modalTitle: { fontSize: 16, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 16 },
  modalOption: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12, marginBottom: 6,
    backgroundColor: "#F0F7F0",
  },
  modalOptionActive: { backgroundColor: "#0B3D2E" },
  modalOptionText: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#0B3D2E" },
  modalOptionTextActive: { color: "#fff", fontFamily: "Poppins_700Bold" },

  scroll: { padding: 16, paddingBottom: 40 },

  // New Booking
  newBookingBtn: {
    backgroundColor: "#0B3D2E", borderRadius: 16, padding: 16,
    flexDirection: "row", alignItems: "center", marginBottom: 16, elevation: 3,
  },
  newBookingIconBox: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "rgba(168,217,108,0.2)",
    justifyContent: "center", alignItems: "center", marginRight: 12,
  },
  newBookingIcon: { fontSize: 18 },
  newBookingText: { flex: 1, fontSize: 15, fontFamily: "Poppins_700Bold", color: "#fff" },

  // Stats
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1, backgroundColor: "#fff", borderRadius: 14, padding: 12,
    alignItems: "center", elevation: 2,
    borderWidth: 1, borderColor: "#D4EDD4",
  },
  statNum: { fontSize: 20, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  statLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#666", marginTop: 2 },

  // Empty
  emptyBox: { alignItems: "center", paddingVertical: 60 },
  emptyEmoji: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 6 },
  emptySubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#999" },

  // Card
  card: {
    backgroundColor: "#fff", borderRadius: 16, padding: 16,
    marginBottom: 14, elevation: 2,
    borderWidth: 1, borderColor: "#D4EDD4",
  },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  serviceIconBox: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: "#E8F5E8",
    justifyContent: "center", alignItems: "center", marginRight: 12,
  },
  serviceIconText: { fontSize: 22 },
  cardHeaderInfo: { flex: 1 },
  serviceName: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 2 },
  petName: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#666" },
  statusBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  statusIcon: { fontSize: 11 },
  statusText: { fontSize: 11, fontFamily: "Poppins_700Bold" },

  divider: { height: 1, backgroundColor: "#E8F5E8", marginBottom: 12 },

  detailsRow: { flexDirection: "row", gap: 16, marginBottom: 10, flexWrap: "wrap" },
  detailItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  detailIcon: { fontSize: 13 },
  detailText: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#333" },

  petInfoBox: {
    flexDirection: "row", gap: 16, marginBottom: 10,
    backgroundColor: "#F0F7F0", borderRadius: 10, padding: 10,
  },
  petInfoText: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#3E7B27" },

  notesBox: {
    backgroundColor: "#F0F7F0", borderRadius: 10, padding: 10, marginBottom: 10,
  },
  notesText: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#555" },

  cancelBtn: {
    borderWidth: 1.5, borderColor: "#C62828", borderRadius: 12,
    paddingVertical: 10, alignItems: "center", marginBottom: 10,
  },
  cancelText: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#C62828" },

  payBanner: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#A8D96C", borderRadius: 12, padding: 12, marginBottom: 10,
  },
  payBannerInfo: { flex: 1 },
  payBannerTitle: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  payBannerSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#1A5C3A", marginTop: 2 },
  payBannerArrow: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },

  paidBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#E8F5E8", borderRadius: 12, padding: 10, marginBottom: 10,
  },
  paidBannerText: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#2E7D32" },

  bookingId: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#bbb", textAlign: "right" },
});
