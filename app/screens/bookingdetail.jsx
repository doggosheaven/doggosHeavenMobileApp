import { useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "../../context/AppContext";
import { BASE_URL } from "../../constants/api";
import { initiatePayment } from "../../utils/paymentHelper";

const STATUS_CONFIG = {
  pending:   { label: "Pending",   bg: "#FFF9E6", color: "#B8860B", icon: "⏳", desc: "Waiting for confirmation from Doggos Heaven team." },
  confirmed: { label: "Confirmed", bg: "#E8F5E8", color: "#2E7D32", icon: "✅", desc: "Your booking is confirmed. Please complete the payment." },
  completed: { label: "Completed", bg: "#E8F5E8", color: "#0B3D2E", icon: "🎉", desc: "Service has been completed successfully." },
  cancelled: { label: "Cancelled", bg: "#FFEBEE", color: "#C62828", icon: "❌", desc: "This booking has been cancelled." },
};

export default function BookingDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user, token, appointments, loadAppointments, setAppointments } = useApp();
  const [payingId, setPayingId] = useState(null);

  const appt = appointments.find((a) => a._id === params.id);

  if (!appt) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Booking Detail</Text>
        </View>
        <View style={styles.notFound}>
          <Text style={styles.notFoundEmoji}>📭</Text>
          <Text style={styles.notFoundText}>Booking not found</Text>
        </View>
      </View>
    );
  }

  const status = STATUS_CONFIG[appt.status] || STATUS_CONFIG.pending;

  const formatDate = (d) => new Date(d).toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const formatTime = (t) => {
    if (!t) return "N/A";
    const [h, m] = t.split(":");
    const date = new Date();
    date.setHours(+h, +m);
    return date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
  };

  const handlePayNow = async () => {
    setPayingId(appt._id);
    await initiatePayment({
      appointmentId: appt._id,
      amount: appt.totalAmount,
      paymentMethod: appt.paymentMode || "online",
      serviceName: appt.serviceName,
      user,
      token,
      onSuccess: () => loadAppointments(true),
      onRefresh: () => loadAppointments(true),
    });
    setPayingId(null);
  };

  const handleCancel = () => {
    Alert.alert("Cancel Appointment", "Are you sure you want to cancel this booking?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, Cancel", style: "destructive",
        onPress: async () => {
          try {
            const res = await fetch(`${BASE_URL}/api/v1/customerappointment/cancelappoint/${appt._id}`, {
              method: "DELETE",
              headers: { Authorization: token || "" },
            });
            const data = await res.json();
            if (data.success) {
              setAppointments((prev) =>
                prev.map((a) => a._id === appt._id ? { ...a, status: "cancelled" } : a)
              );
              router.back();
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

  const subtotal = appt.totalAmount - (appt.gstAmount || 0);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Booking Detail</Text>
          <Text style={styles.headerSub}>ID: {appt._id.slice(-8).toUpperCase()}</Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
          <Text style={styles.statusPillIcon}>{status.icon}</Text>
          <Text style={[styles.statusPillText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Status Banner */}
        <View style={[styles.statusBanner, { backgroundColor: status.bg, borderColor: status.color + "40" }]}>
          <Text style={styles.statusBannerIcon}>{status.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.statusBannerTitle, { color: status.color }]}>{status.label}</Text>
            <Text style={[styles.statusBannerDesc, { color: status.color }]}>{status.desc}</Text>
          </View>
        </View>

        {/* Service Info */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <View style={styles.cardIconBox}>
              <Text style={{ fontSize: 20 }}>🐾</Text>
            </View>
            <Text style={styles.cardTitle}>Service Details</Text>
          </View>
          <Row label="Service" value={appt.serviceName || "—"} />
          {appt.pricingType && <Row label="Type" value={appt.pricingType} />}
        </View>

        {/* Pet Info */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <View style={styles.cardIconBox}>
              <Text style={{ fontSize: 20 }}>🐶</Text>
            </View>
            <Text style={styles.cardTitle}>Pet Details</Text>
          </View>
          <Row label="Name" value={appt.petName || "—"} />
          {appt.petBreed ? <Row label="Breed" value={appt.petBreed} /> : null}
          {appt.petAge ? <Row label="Age" value={appt.petAge} /> : null}
        </View>

        {/* Appointment Info */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <View style={styles.cardIconBox}>
              <Text style={{ fontSize: 20 }}>📅</Text>
            </View>
            <Text style={styles.cardTitle}>Appointment Details</Text>
          </View>
          <Row label="Date" value={formatDate(appt.appointmentDate)} />
          <Row label="Time" value={formatTime(appt.appointmentTime)} />
        </View>

        {/* Pickup & Drop */}
        {appt.ambulanceRequired && (
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <View style={styles.cardIconBox}>
                <Text style={{ fontSize: 20 }}>🚗</Text>
              </View>
              <Text style={styles.cardTitle}>Pickup & Drop</Text>
            </View>
            {appt.ambulanceKm > 0 && <Row label="Distance" value={`${appt.ambulanceKm} km`} />}
            {appt.ambulanceFare > 0 && <Row label="Fare" value={`₹${appt.ambulanceFare}`} highlight />}
          </View>
        )}

        {/* Notes */}
        {appt.notes ? (
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <View style={styles.cardIconBox}>
                <Text style={{ fontSize: 20 }}>📝</Text>
              </View>
              <Text style={styles.cardTitle}>Notes</Text>
            </View>
            <Text style={styles.notesText}>{appt.notes}</Text>
          </View>
        ) : null}

        {/* Payment Summary */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <View style={styles.cardIconBox}>
              <Text style={{ fontSize: 20 }}>💰</Text>
            </View>
            <Text style={styles.cardTitle}>Payment Summary</Text>
          </View>
          {subtotal > 0 && <Row label="Subtotal" value={`₹${subtotal}`} />}
          {appt.gstAmount > 0 && <Row label="GST (18%)" value={`₹${appt.gstAmount}`} warn />}
          <Row label="Payment Mode" value={appt.paymentMode === "online" ? "📱 Online" : appt.paymentMode || "—"} />
          <Row
            label="Payment Status"
            value={appt.paymentStatus === "paid" ? "✅ Paid" : "⏳ Pending"}
            highlight={appt.paymentStatus === "paid"}
            warn={appt.paymentStatus !== "paid"}
          />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>₹{appt.totalAmount}</Text>
          </View>
        </View>

        {/* Pay Now */}
        {appt.status === "confirmed" && appt.paymentStatus !== "paid" && (
          <TouchableOpacity
            style={styles.payBtn}
            onPress={handlePayNow}
            activeOpacity={0.85}
            disabled={!!payingId}
          >
            {payingId ? (
              <ActivityIndicator size="small" color="#0B3D2E" />
            ) : (
              <>
                <Ionicons name="card" size={20} color="#0B3D2E" />
                <View>
                  <Text style={styles.payBtnTitle}>Pay Now</Text>
                  <Text style={styles.payBtnSub}>₹{appt.totalAmount} · Online Payment</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#0B3D2E" style={{ marginLeft: "auto" }} />
              </>
            )}
          </TouchableOpacity>
        )}

        {appt.status === "confirmed" && appt.paymentStatus === "paid" && (
          <View style={styles.paidBanner}>
            <Ionicons name="checkmark-circle" size={22} color="#2E7D32" />
            <Text style={styles.paidBannerText}>Payment Completed ✅</Text>
          </View>
        )}

        {/* Cancel */}
        {(appt.status === "pending" || appt.status === "confirmed") && (
          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} activeOpacity={0.8}>
            <Ionicons name="close-circle-outline" size={18} color="#C62828" />
            <Text style={styles.cancelText}>Cancel Appointment</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.footerNote}>
          Booked on {new Date(appt.createdAt || appt.bookedAt || Date.now()).toLocaleDateString("en-IN", {
            day: "numeric", month: "short", year: "numeric",
          })}
        </Text>

      </ScrollView>
    </View>
  );
}

function Row({ label, value, highlight, warn }) {
  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.label}>{label}</Text>
      <Text style={[
        rowStyles.value,
        highlight && rowStyles.highlight,
        warn && rowStyles.warn,
      ]}>{value}</Text>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: "#F0F7F0",
  },
  label: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#666", flex: 1 },
  value: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E", flex: 2, textAlign: "right" },
  highlight: { color: "#2E7D32" },
  warn: { color: "#B8860B" },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F7F0" },
  scroll: { padding: 16, paddingBottom: 48 },

  header: {
    backgroundColor: "#0B3D2E", paddingHorizontal: 16,
    paddingTop: 12, paddingBottom: 16,
    flexDirection: "row", alignItems: "center", gap: 12,
  },
  backBtn: { padding: 6 },
  headerTitle: { fontSize: 18, fontFamily: "Poppins_700Bold", color: "#fff" },
  headerSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#A8D96C", marginTop: 1 },
  statusPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  statusPillIcon: { fontSize: 12 },
  statusPillText: { fontSize: 11, fontFamily: "Poppins_700Bold" },

  statusBanner: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 14, padding: 14, marginBottom: 12,
    borderWidth: 1,
  },
  statusBannerIcon: { fontSize: 28 },
  statusBannerTitle: { fontSize: 15, fontFamily: "Poppins_700Bold", marginBottom: 2 },
  statusBannerDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },

  card: {
    backgroundColor: "#fff", borderRadius: 16, padding: 16,
    marginBottom: 12, elevation: 2, borderWidth: 1, borderColor: "#D4EDD4",
  },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  cardIconBox: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "#E8F5E8", justifyContent: "center", alignItems: "center",
  },
  cardTitle: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },

  notesText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#444", lineHeight: 20 },

  totalRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingTop: 12, marginTop: 4,
  },
  totalLabel: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  totalValue: { fontSize: 20, fontFamily: "Poppins_700Bold", color: "#3E7B27" },

  payBtn: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#A8D96C", borderRadius: 16, padding: 16,
    marginBottom: 12, elevation: 3,
  },
  payBtnTitle: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  payBtnSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#1A5C3A", marginTop: 2 },

  paidBanner: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#E8F5E8", borderRadius: 14, padding: 14, marginBottom: 12,
  },
  paidBannerText: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#2E7D32" },

  cancelBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    borderWidth: 1.5, borderColor: "#C62828", borderRadius: 14,
    paddingVertical: 14, marginBottom: 16,
  },
  cancelText: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#C62828" },

  footerNote: {
    textAlign: "center", fontSize: 11,
    fontFamily: "Inter_400Regular", color: "#bbb", marginBottom: 8,
  },

  notFound: { flex: 1, alignItems: "center", justifyContent: "center" },
  notFoundEmoji: { fontSize: 56, marginBottom: 12 },
  notFoundText: { fontSize: 16, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
});
