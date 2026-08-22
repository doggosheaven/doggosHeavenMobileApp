import { useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { getAuth } from "../../utils/authStorage";
import { BASE_URL } from "../../constants/api";
import { ErrorState } from "../../components/ScreenState";

const STATUS_COLOR = { pending: "#F59E0B", confirmed: "#3E7B27", completed: "#0B3D2E", cancelled: "#C62828" };
const STATUS_BG    = { pending: "#FFF9E6", confirmed: "#E8F5E8", completed: "#E8F5E8", cancelled: "#FFEBEE" };

function getConfig(alert) {
  switch (alert.alertType) {
    case "serviceAction":
      switch (alert.action) {
        case "added":   return { icon: "add-circle",       color: "#3E7B27", bg: "#E8F5E8", label: "Service Added" };
        case "updated": return { icon: "pencil",           color: "#F59E0B", bg: "#FFF9E6", label: "Service Updated" };
        case "deleted": return { icon: "trash",            color: "#C62828", bg: "#FFEBEE", label: "Service Deleted" };
        default:        return { icon: "construct",        color: "#0B3D2E", bg: "#E8F5E8", label: "Service Action" };
      }
    case "newBooking":     return { icon: "calendar",         color: "#0B3D2E", bg: "#E8F5E8", label: "New Booking" };
    case "newPet":         return { icon: "paw",              color: "#E67E22", bg: "#FFF3E0", label: "New Pet Registered" };
    case "inventoryStock": return { icon: "cube",             color: "#1565C0", bg: "#EEF9FF", label: "Low Stock Alert" };
    case "vaccinationDue": return { icon: "shield-checkmark", color: "#7B1FA2", bg: "#F3E5F5", label: "Vaccination Due" };
    default:               return { icon: "notifications",    color: "#0B3D2E", bg: "#E8F5E8", label: "Notification" };
  }
}

function getMessage(alert) {
  switch (alert.alertType) {
    case "serviceAction": {
      const verb = alert.action === "added" ? "added" : alert.action === "updated" ? "updated" : "deleted";
      return `"${alert.serviceName}" was ${verb} by ${alert.performedBy || "Staff"}`;
    }
    case "newBooking":
      return `New booking: ${alert.serviceName} — by ${alert.performedBy || "Customer"}`;
    case "newPet":
      return `New pet registered: ${alert.serviceName} — by ${alert.performedBy || "Staff"}`;
    case "inventoryStock":
      return `${alert.itemName || "Item"} is running low — only ${alert.stockUnit ?? "?"} units left`;
    case "vaccinationDue":
      return `Vaccination due for a pet`;
    default:
      return "New notification";
  }
}

function timeAgo(date) {
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatDate(d) {
  return d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
}

export default function AdminNotifications() {
  const router = useRouter();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [token, setToken] = useState("");
  const [bookingModal, setBookingModal] = useState(null);
  const [actionId, setActionId] = useState(null);

  const load = useCallback(async () => {
    try {
      const { token: t } = await getAuth();
      setToken(t || "");
      const res = await fetch(`${BASE_URL}/api/v1/alerts/getall`, {
        headers: { Authorization: t || "" },
      });
      const json = await res.json();
      if (json.success) setAlerts(json.alerts || []);
    } catch (e) { if (__DEV__) console.log(e); setLoadError(true); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const markRead = async (id) => {
    try {
      await fetch(`${BASE_URL}/api/v1/alerts/markread/${id}`, {
        method: "PUT", headers: { Authorization: token },
      });
      setAlerts((prev) => prev.map((a) => a._id === id ? { ...a, isRead: true } : a));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await fetch(`${BASE_URL}/api/v1/alerts/markallread`, {
        method: "PUT", headers: { Authorization: token },
      });
      setAlerts((prev) => prev.map((a) => ({ ...a, isRead: true })));
    } catch { Alert.alert("Error", "Could not mark as read"); }
  };

  const handleTap = async (alert) => {
    if (!alert.isRead) await markRead(alert._id);

    if (alert.alertType === "newBooking" && alert.appointmentId) {
      setBookingModal(alert.appointmentId);
      return;
    }

    const navMap = {
      serviceAction: "/admin/services",
      newPet: "/admin/petmaster",
      inventoryStock: "/admin/inventory",
    };
    const route = navMap[alert.alertType];
    if (route) router.push(route);
  };

  const handleUpdateStatus = async (id, status) => {
    setActionId(id);
    try {
      const res = await fetch(`${BASE_URL}/api/v1/customerappointment/updateappoint/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: token },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        setBookingModal((prev) => prev ? { ...prev, status } : prev);
        setAlerts((prev) => prev.map((a) =>
          a.appointmentId?._id === id
            ? { ...a, appointmentId: { ...a.appointmentId, status } }
            : a
        ));
        Alert.alert("✅ Done", `Booking ${status} successfully.`);
      } else Alert.alert("Error", data.message);
    } catch { Alert.alert("Error", "Network error"); }
    finally { setActionId(null); }
  };

  const unreadCount = alerts.filter((a) => !a.isRead).length;
  const appt = bookingModal;

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="close" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Notifications</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={markAllRead} style={s.markAllBtn}>
            <Text style={s.markAllTxt}>Mark all read</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 90 }} />
        )}
      </View>

      {unreadCount > 0 && (
        <View style={s.unreadBanner}>
          <Ionicons name="ellipse" size={8} color="#F59E0B" />
          <Text style={s.unreadBannerTxt}>{unreadCount} unread notification{unreadCount > 1 ? "s" : ""}</Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color="#0B3D2E" style={{ flex: 1 }} />
      ) : loadError ? (
        <ErrorState
          message="Could not load this. Check your connection."
          onRetry={() => { setLoadError(false); setLoading(true); load(); }}
        />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#0B3D2E" />}
        >
          {alerts.length === 0 ? (
            <View style={s.emptyBox}>
              <Ionicons name="notifications-off-outline" size={56} color="#A8D96C" />
              <Text style={s.emptyTitle}>No Notifications</Text>
              <Text style={s.emptySubtitle}>You're all caught up!</Text>
            </View>
          ) : (
            alerts.map((alert) => {
              const cfg = getConfig(alert);
              const isClickable = alert.alertType === "newBooking"
                ? !!alert.appointmentId
                : ["newVisit", "serviceAction", "newPet", "inventoryStock"].includes(alert.alertType);
              return (
                <TouchableOpacity
                  key={alert._id}
                  style={[s.card, !alert.isRead ? s.cardUnread : s.cardRead]}
                  onPress={() => handleTap(alert)}
                  activeOpacity={isClickable ? 0.75 : 1}
                >
                  <View style={[s.iconBox, { backgroundColor: cfg.bg }]}>
                    <Ionicons name={cfg.icon} size={22} color={cfg.color} />
                  </View>
                  <View style={s.cardBody}>
                    <View style={s.cardTop}>
                      <Text style={[s.cardLabel, { color: cfg.color }]}>{cfg.label}</Text>
                      <View style={s.cardTopRight}>
                        {!alert.isRead && <View style={s.unreadDot} />}
                        {isClickable && <Ionicons name="chevron-forward" size={14} color="#ccc" />}
                      </View>
                    </View>
                    <Text style={s.cardMsg}>{getMessage(alert)}</Text>
                    {alert.alertType === "newBooking" && alert.appointmentId?.status && (
                      <View style={[s.inlineStatus, { backgroundColor: STATUS_BG[alert.appointmentId.status] }]}>
                        <Text style={[s.inlineStatusTxt, { color: STATUS_COLOR[alert.appointmentId.status] }]}>
                          {alert.appointmentId.status}
                        </Text>
                      </View>
                    )}
                    <Text style={s.cardTime}>{timeAgo(alert.alertDate)}</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
          <View style={{ height: 30 }} />
        </ScrollView>
      )}

      {/* Booking Detail Modal — same as staff */}
      <Modal visible={!!appt} transparent animationType="slide" onRequestClose={() => setBookingModal(null)}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Booking Details</Text>
              <TouchableOpacity onPress={() => setBookingModal(null)}>
                <Ionicons name="close" size={22} color="#0B3D2E" />
              </TouchableOpacity>
            </View>

            {appt && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Status Badge */}
                <View style={[s.statusBadge, { backgroundColor: STATUS_BG[appt.status] }]}>
                  <Ionicons
                    name={appt.status === "confirmed" ? "checkmark-circle" : appt.status === "cancelled" ? "close-circle" : "time"}
                    size={16} color={STATUS_COLOR[appt.status]}
                  />
                  <Text style={[s.statusText, { color: STATUS_COLOR[appt.status] }]}>
                    {appt.status?.toUpperCase()}
                  </Text>
                </View>

                {/* Details */}
                <View style={s.detailCard}>
                  {[
                    { icon: "construct-outline",  label: "Service",  value: appt.serviceName },
                    { icon: "paw-outline",         label: "Pet",      value: appt.petName },
                    { icon: "person-outline",      label: "Customer", value: appt.customerId?.fullName || appt.customerId?.name || "Customer" },
                    { icon: "calendar-outline",    label: "Date",     value: formatDate(appt.appointmentDate) },
                    { icon: "time-outline",        label: "Time",     value: appt.appointmentTime },
                    { icon: "cash-outline",        label: "Amount",   value: appt.totalAmount > 0 ? `₹${appt.totalAmount}` : "—" },
                    { icon: "card-outline",        label: "Payment",  value: appt.paymentStatus || "unpaid" },
                  ].map((row) => (
                    <View key={row.label} style={s.detailRow}>
                      <View style={s.detailLeft}>
                        <Ionicons name={row.icon} size={15} color="#3E7B27" />
                        <Text style={s.detailLabel}>{row.label}</Text>
                      </View>
                      <Text style={s.detailValue}>{row.value}</Text>
                    </View>
                  ))}
                  {appt.notes ? (
                    <View style={s.notesBox}>
                      <Text style={s.notesLabel}>Notes</Text>
                      <Text style={s.notesText}>{appt.notes}</Text>
                    </View>
                  ) : null}
                </View>

                {/* Action Buttons */}
                {appt.status === "pending" && (
                  <View style={s.actionRow}>
                    {actionId === appt._id ? (
                      <ActivityIndicator color="#0B3D2E" style={{ flex: 1 }} />
                    ) : (
                      <>
                        <TouchableOpacity
                          style={s.cancelBtn}
                          onPress={() => Alert.alert("Cancel Booking", "Are you sure you want to cancel this booking?", [
                            { text: "No", style: "cancel" },
                            { text: "Yes, Cancel", style: "destructive", onPress: () => handleUpdateStatus(appt._id, "cancelled") },
                          ])}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="close-circle-outline" size={18} color="#C62828" />
                          <Text style={s.cancelBtnTxt}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={s.acceptBtn}
                          onPress={() => Alert.alert("Accept Booking", "Confirm this booking?", [
                            { text: "No", style: "cancel" },
                            { text: "Yes, Accept", onPress: () => handleUpdateStatus(appt._id, "confirmed") },
                          ])}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                          <Text style={s.acceptBtnTxt}>Accept</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                )}

                {appt.status === "confirmed" && (
                  <TouchableOpacity
                    style={s.completeBtn}
                    onPress={() => Alert.alert("Mark Complete", "Mark this booking as completed?", [
                      { text: "Cancel", style: "cancel" },
                      { text: "Complete", onPress: () => handleUpdateStatus(appt._id, "completed") },
                    ])}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="ribbon-outline" size={18} color="#fff" />
                    <Text style={s.completeBtnTxt}>Mark as Completed</Text>
                  </TouchableOpacity>
                )}

                <View style={{ height: 20 }} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F7F0" },
  header: {
    backgroundColor: "#0B3D2E", paddingHorizontal: 20,
    paddingTop: 52, paddingBottom: 16,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  backBtn: { width: 36, height: 36, justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: "Poppins_700Bold", color: "#fff", textAlign: "center" },
  markAllBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  markAllTxt: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#A8D96C" },
  unreadBanner: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#FFF9E6", paddingHorizontal: 16, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: "#F59E0B22",
  },
  unreadBannerTxt: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#F59E0B" },
  scroll: { padding: 16 },
  card: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    backgroundColor: "#fff", borderRadius: 14, padding: 14,
    marginBottom: 10, elevation: 1, borderWidth: 1, borderColor: "#D4EDD4",
  },
  cardUnread: { borderColor: "#A8D96C", backgroundColor: "#FAFFF5", elevation: 3 },
  cardRead: { opacity: 0.7 },
  iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center", flexShrink: 0 },
  cardBody: { flex: 1 },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  cardLabel: { fontSize: 11, fontFamily: "Poppins_700Bold" },
  cardTopRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#A8D96C" },
  cardMsg: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#1A1A1A", lineHeight: 18, marginBottom: 4 },
  cardTime: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#999" },
  inlineStatus: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginBottom: 4 },
  inlineStatusTxt: { fontSize: 10, fontFamily: "Poppins_700Bold", textTransform: "capitalize" },
  emptyBox: { alignItems: "center", paddingVertical: 80, gap: 10 },
  emptyTitle: { fontSize: 16, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  emptySubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#999" },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, maxHeight: "85%",
  },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 18, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  statusBadge: {
    flexDirection: "row", alignItems: "center", gap: 8,
    alignSelf: "flex-start", paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, marginBottom: 16,
  },
  statusText: { fontSize: 13, fontFamily: "Poppins_700Bold", textTransform: "capitalize" },
  detailCard: {
    backgroundColor: "#F8FFF8", borderRadius: 14,
    borderWidth: 1, borderColor: "#D4EDD4", padding: 14, marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#E8F5E8",
  },
  detailLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  detailLabel: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#666" },
  detailValue: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E", textAlign: "right", flex: 1, marginLeft: 8 },
  notesBox: { paddingTop: 10 },
  notesLabel: { fontSize: 11, fontFamily: "Poppins_700Bold", color: "#3E7B27", marginBottom: 4 },
  notesText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#333", lineHeight: 18 },
  actionRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  cancelBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    borderWidth: 1.5, borderColor: "#C62828", borderRadius: 12, paddingVertical: 12,
    backgroundColor: "#FFEBEE",
  },
  cancelBtnTxt: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#C62828" },
  acceptBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    backgroundColor: "#0B3D2E", borderRadius: 12, paddingVertical: 12,
  },
  acceptBtnTxt: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#A8D96C" },
  completeBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#1A5C3A", borderRadius: 12, paddingVertical: 12, marginBottom: 10,
  },
  completeBtnTxt: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#fff" },
});
