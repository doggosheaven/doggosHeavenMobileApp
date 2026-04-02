import { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, ScrollView, ActivityIndicator, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BASE_URL } from "../constants/api";
import { initiatePayment, calcGST } from "../utils/paymentHelper";

const STATUS_CONFIG = {
  pending:   { label: "Pending",   bg: "#FFF9E6", color: "#B8860B", icon: "time" },
  confirmed: { label: "Confirmed", bg: "#E8F5E8", color: "#2E7D32", icon: "checkmark-circle" },
  completed: { label: "Completed", bg: "#E8F5E8", color: "#0B3D2E", icon: "ribbon" },
  cancelled: { label: "Cancelled", bg: "#FFEBEE", color: "#C62828", icon: "close-circle" },
};

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

const fmtTime = (t) => {
  if (!t) return "—";
  const [h, m] = t.split(":");
  if (!h || !m) return t;
  const date = new Date();
  date.setHours(+h, +m);
  return date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
};

export default function BookingDetailModal({ visible, appt, onClose, user, token, onRefresh }) {
  const [payingId, setPayingId] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  if (!appt) return null;

  const status = STATUS_CONFIG[appt.status] || STATUS_CONFIG.pending;
  const baseAmount = appt.totalAmount || 0;
  const { rate: gstRate, gst: gstAmt, total: grandTotal } = calcGST(baseAmount, appt.paymentMode || "online");
  const gstLabel = gstRate === 0.20 ? "GST 20% (Card)" : "GST 18% (Online)";

  const handlePayNow = async () => {
    setPayingId(appt._id);
    try {
      await initiatePayment({
        appointmentId: appt._id,
        amount: baseAmount,
        paymentMethod: appt.paymentMode || "online",
        serviceName: appt.serviceName,
        user,
        token,
        onSuccess: () => { onRefresh?.(); onClose(); },
        onRefresh: () => { onRefresh?.(); },
      });
    } catch (e) {
      Alert.alert("Error", e.message || "Payment failed");
    } finally {
      setPayingId(null);
    }
  };

  const handleCancel = () => {
    Alert.alert("Cancel Appointment", "Are you sure you want to cancel?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, Cancel", style: "destructive",
        onPress: async () => {
          setCancelling(true);
          try {
            const res = await fetch(`${BASE_URL}/api/v1/customerappointment/cancelappoint/${appt._id}`, {
              method: "DELETE",
              headers: { Authorization: token || "" },
            });
            const data = await res.json();
            if (data.success) {
              onRefresh?.();
              onClose();
            } else {
              Alert.alert("Error", data.message || "Could not cancel");
            }
          } catch {
            Alert.alert("Error", "Network error");
          } finally {
            setCancelling(false);
          }
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          {/* Handle */}
          <View style={s.handle} />

          {/* Header */}
          <View style={s.header}>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>{appt.serviceName || "Booking"}</Text>
              <Text style={s.sub}>🐾 {appt.petName}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <Ionicons name="close" size={22} color="#0B3D2E" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.body}>
            {/* Status Badge */}
            <View style={[s.statusBadge, { backgroundColor: status.bg }]}>
              <Ionicons name={status.icon} size={15} color={status.color} />
              <Text style={[s.statusTxt, { color: status.color }]}>{status.label}</Text>
            </View>

            {/* Details Card */}
            <View style={s.detailCard}>
              {[
                { icon: "construct-outline", label: "Service",  value: appt.serviceName },
                { icon: "paw-outline",       label: "Pet",      value: appt.petName },
                { icon: "calendar-outline",  label: "Date",     value: fmtDate(appt.appointmentDate) },
                { icon: "time-outline",      label: "Time",     value: fmtTime(appt.appointmentTime) },
                { icon: "cash-outline",      label: "Base Amount", value: baseAmount > 0 ? `₹${baseAmount}` : "Price on Request" },
              ].map((row) => (
                <View key={row.label} style={s.dRow}>
                  <View style={s.dLeft}>
                    <Ionicons name={row.icon} size={14} color="#3E7B27" />
                    <Text style={s.dLabel}>{row.label}</Text>
                  </View>
                  <Text style={s.dValue}>{row.value}</Text>
                </View>
              ))}

              {/* GST Breakdown */}
              {baseAmount > 0 && (
                <>
                  <View style={s.dRow}>
                    <View style={s.dLeft}>
                      <Ionicons name="receipt-outline" size={14} color="#B8860B" />
                      <Text style={[s.dLabel, { color: "#B8860B" }]}>{gstLabel}</Text>
                    </View>
                    <Text style={[s.dValue, { color: "#B8860B" }]}>+ ₹{gstAmt}</Text>
                  </View>
                  <View style={[s.dRow, { borderBottomWidth: 0 }]}>
                    <View style={s.dLeft}>
                      <Ionicons name="card-outline" size={14} color="#0B3D2E" />
                      <Text style={[s.dLabel, { fontFamily: "Poppins_700Bold", color: "#0B3D2E" }]}>Total Payable</Text>
                    </View>
                    <Text style={[s.dValue, { color: "#0B3D2E", fontSize: 15 }]}>₹{grandTotal}</Text>
                  </View>
                </>
              )}

              <View style={[s.dRow, { borderBottomWidth: 0, paddingTop: 4 }]}>
                <View style={s.dLeft}>
                  <Ionicons name="card-outline" size={14} color="#3E7B27" />
                  <Text style={s.dLabel}>Payment</Text>
                </View>
                <Text style={s.dValue}>{appt.paymentStatus === "paid" ? "Paid ✅" : "Pending"}</Text>
              </View>
              {appt.petBreed ? (
                <View style={s.dRow}>
                  <View style={s.dLeft}>
                    <Ionicons name="information-circle-outline" size={14} color="#3E7B27" />
                    <Text style={s.dLabel}>Breed</Text>
                  </View>
                  <Text style={s.dValue}>{appt.petBreed}</Text>
                </View>
              ) : null}
              {appt.notes ? (
                <View style={s.notesBox}>
                  <Text style={s.notesLabel}>📝 Notes</Text>
                  <Text style={s.notesVal}>{appt.notes}</Text>
                </View>
              ) : null}
            </View>

            {/* Pay Now Banner */}
            {appt.status === "confirmed" && appt.paymentStatus !== "paid" && baseAmount > 0 && (
              <TouchableOpacity
                style={s.payBanner}
                onPress={handlePayNow}
                activeOpacity={0.8}
                disabled={!!payingId}
              >
                {payingId ? (
                  <ActivityIndicator size="small" color="#0B3D2E" />
                ) : (
                  <Ionicons name="card" size={18} color="#0B3D2E" />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={s.payBannerTitle}>
                    {payingId ? "Opening Payment..." : "Payment Pending"}
                  </Text>
                  <Text style={s.payBannerSub}>Pay ₹{grandTotal} (incl. {gstLabel})</Text>
                </View>
                {!payingId && <Text style={s.payBannerArrow}>Pay →</Text>}
              </TouchableOpacity>
            )}

            {appt.status === "confirmed" && appt.paymentStatus === "paid" && (
              <View style={s.paidBanner}>
                <Ionicons name="checkmark-circle" size={16} color="#2E7D32" />
                <Text style={s.paidBannerTxt}>Payment Completed ✅</Text>
              </View>
            )}

            {/* Cancel Button */}
            {(appt.status === "pending" || appt.status === "confirmed") && (
              <TouchableOpacity
                style={s.cancelBtn}
                onPress={handleCancel}
                disabled={cancelling}
                activeOpacity={0.8}
              >
                {cancelling
                  ? <ActivityIndicator size="small" color="#C62828" />
                  : <Text style={s.cancelTxt}>Cancel Appointment</Text>
                }
              </TouchableOpacity>
            )}

            <Text style={s.bookingId}>Booking ID: {appt._id?.slice(-8).toUpperCase()}</Text>
            <View style={{ height: 20 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: "88%",
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: "#D4EDD4",
    alignSelf: "center", marginTop: 10, marginBottom: 4,
  },
  header: {
    flexDirection: "row", alignItems: "flex-start",
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: "#E8F5E8",
  },
  title: { fontSize: 17, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 2 },
  sub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#666" },
  closeBtn: {
    backgroundColor: "#F0F7F0", borderRadius: 20, padding: 6, marginLeft: 10,
  },
  body: { paddingHorizontal: 20, paddingTop: 14 },

  statusBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    alignSelf: "flex-start", paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, marginBottom: 14,
  },
  statusTxt: { fontSize: 13, fontFamily: "Poppins_700Bold" },

  detailCard: {
    backgroundColor: "#F8FFF8", borderRadius: 14,
    borderWidth: 1, borderColor: "#D4EDD4", padding: 14, marginBottom: 14,
  },
  dRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#E8F5E8",
  },
  dLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  dLabel: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#666" },
  dValue: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E", textAlign: "right", flex: 1, marginLeft: 8 },
  notesBox: { paddingTop: 10 },
  notesLabel: { fontSize: 11, fontFamily: "Poppins_700Bold", color: "#3E7B27", marginBottom: 4 },
  notesVal: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#333" },

  payBanner: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#A8D96C", borderRadius: 12, padding: 14, marginBottom: 10,
  },
  payBannerTitle: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  payBannerSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#1A5C3A", marginTop: 2 },
  payBannerArrow: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },

  paidBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#E8F5E8", borderRadius: 12, padding: 12, marginBottom: 10,
  },
  paidBannerTxt: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#2E7D32" },

  cancelBtn: {
    borderWidth: 1.5, borderColor: "#C62828", borderRadius: 12,
    paddingVertical: 12, alignItems: "center", marginBottom: 10,
  },
  cancelTxt: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#C62828" },

  bookingId: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#bbb", textAlign: "right" },
});
