import { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, Alert, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import Header from "../../components/Header";
import { getAuth } from "../../utils/authStorage";
import { BASE_URL } from "../../constants/api";

const STATUS_CONFIG = {
  pending:   { label: "Pending",   bg: "#FFF9E6", color: "#B8860B", icon: "⏳" },
  confirmed: { label: "Confirmed", bg: "#E8F5E8", color: "#2E7D32", icon: "✅" },
  completed: { label: "Completed", bg: "#E8F5E8", color: "#0B3D2E", icon: "🎉" },
  cancelled: { label: "Cancelled", bg: "#FFEBEE", color: "#C62828", icon: "❌" },
};

const FILTERS = ["All", "Pending", "Confirmed", "Completed", "Cancelled"];

export default function BookingsScreen() {
  const router = useRouter();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("All");
  const [token, setToken] = useState(null);

  const loadAppointments = useCallback(async () => {
    try {
      const { user: u, token: t } = await getAuth();
      setToken(t);
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

  const formatDate = (d) => new Date(d).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });

  const formatTime = (t) => {
    const [h, m] = t.split(":");
    const date = new Date();
    date.setHours(+h, +m);
    return date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
  };

  return (
    <View style={styles.container}>
      <Header title="My Bookings" />

      {/* Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterBar}
        contentContainerStyle={styles.filterContent}
      >
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0B3D2E" />}
      >
        {/* New Booking Button */}
        <TouchableOpacity
          style={styles.newBookingBtn}
          onPress={() => router.navigate({ pathname: "/(tabs)/home", params: { scrollToServices: "true" } })}
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
                  {appt.totalAmount > 0 && (
                    <View style={styles.detailItem}>
                      <Text style={styles.detailIcon}>💰</Text>
                      <Text style={styles.detailText}>₹{appt.totalAmount}</Text>
                    </View>
                  )}
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
  filterBar: { backgroundColor: "#fff", maxHeight: 56, borderBottomWidth: 1, borderBottomColor: "#D4EDD4" },
  filterContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 6,
    borderRadius: 20, backgroundColor: "#F0F7F0",
    borderWidth: 1, borderColor: "#D4EDD4",
  },
  filterChipActive: { backgroundColor: "#0B3D2E", borderColor: "#0B3D2E" },
  filterText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#3E7B27" },
  filterTextActive: { color: "#fff", fontFamily: "Poppins_700Bold" },

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

  bookingId: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#bbb", textAlign: "right" },
});
