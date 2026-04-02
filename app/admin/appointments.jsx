import { useState, useCallback } from "react";
import {
  View, Text, ScrollView, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, Modal, TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import { getAuth } from "../../utils/authStorage";
import { BASE_URL } from "../../constants/api";
import { buildInvoiceHTML, downloadInvoicePDF } from "../../utils/invoiceGenerator";

const FILTERS = ["All", "Pending", "Confirmed", "Completed", "Cancelled"];
const STATUS_COLOR = { pending: "#F59E0B", confirmed: "#3E7B27", completed: "#0B3D2E", cancelled: "#C62828" };
const STATUS_BG    = { pending: "#FFF9E6", confirmed: "#E8F5E8", completed: "#E8F5E8", cancelled: "#FFEBEE" };

export default function AdminAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [token, setToken] = useState("");

  const [invoiceAppt, setInvoiceAppt] = useState(null);
  const [invoiceHTML, setInvoiceHTML] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [payModal, setPayModal] = useState(false);
  const [payTarget, setPayTarget] = useState(null);
  const [payMode, setPayMode] = useState(null);
  const [payAmount, setPayAmount] = useState("");
  const [payLoading, setPayLoading] = useState(false);
  const [confirmAmountModal, setConfirmAmountModal] = useState(false);
  const [confirmAmount, setConfirmAmount] = useState("");
  const [confirmAmountAppt, setConfirmAmountAppt] = useState(null);
  const [confirmAmountLoading, setConfirmAmountLoading] = useState(false);

  const openInvoice = async (appt) => {
    setInvoiceHTML("");
    setInvoiceAppt(appt);
    const html = await buildInvoiceHTML(appt);
    setInvoiceHTML(html);
  };

  const loadAppointments = useCallback(async () => {
    try {
      const { token: t } = await getAuth();
      setToken(t || "");
      const res = await fetch(`${BASE_URL}/api/v1/customerappointment/getallappoint`, {
        headers: { Authorization: t || "" },
      });
      const data = await res.json();
      if (data.success) setAppointments(data.data || []);
    } catch (e) { console.log(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { loadAppointments(); }, [loadAppointments]));

  const handleConfirm = async (id) => {
    setActionId(id);
    try {
      const res = await fetch(`${BASE_URL}/api/v1/customerappointment/confirmappoint/${id}`, {
        method: "PATCH", headers: { Authorization: token },
      });
      const data = await res.json();
      if (data.success) {
        setAppointments(prev => prev.map(a => a._id === id ? { ...a, status: "confirmed" } : a));
        Alert.alert("✅ Confirmed", "Appointment confirmed successfully.");
      } else Alert.alert("Error", data.message);
    } catch { Alert.alert("Error", "Network error"); }
    finally { setActionId(null); }
  };

  const handleUpdateStatus = async (id, status, extraBody = {}) => {
    setActionId(id);
    try {
      const res = await fetch(`${BASE_URL}/api/v1/customerappointment/updateappoint/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: token },
        body: JSON.stringify({ status, ...extraBody }),
      });
      const data = await res.json();
      if (data.success) {
        const updated = data.data;
        setAppointments(prev => prev.map(a => a._id === id ? { ...a, ...updated } : a));
      } else Alert.alert("Error", data.message);
    } catch { Alert.alert("Error", "Network error"); }
    finally { setActionId(null); }
  };

  const openCompleteModal = (appt) => {
    if (appt.paymentStatus === "paid") {
      Alert.alert("Complete", "Mark as completed?", [
        { text: "Cancel", style: "cancel" },
        { text: "Complete", onPress: () => handleUpdateStatus(appt._id, "completed") },
      ]);
    } else {
      setPayTarget(appt); setPayMode(null); setPayAmount(String(appt.totalAmount || ""));
      setPayModal(true);
    }
  };

  const handleAddPayment = async (appt, completeAlso = false) => {
    if (!payMode) return Alert.alert("Select Mode", "Please select a payment mode.");
    setPayLoading(true);
    try {
      const status = completeAlso ? "completed" : appt.status;
      const res = await fetch(`${BASE_URL}/api/v1/customerappointment/updateappoint/${appt._id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: token },
        body: JSON.stringify({ status, paymentMode: payMode, paymentStatus: "paid", totalAmount: payAmount ? Number(payAmount) : appt.totalAmount }),
      });
      const data = await res.json();
      if (data.success) {
        const updated = data.data;
        setAppointments(prev => prev.map(a => a._id === appt._id ? { ...a, ...updated } : a));
        setPayModal(false); setPayTarget(null); setPayMode(null); setPayAmount("");
        Alert.alert("✅ Done", completeAlso ? `Completed & payment recorded via ${payMode}.` : `Payment recorded via ${payMode}.`);
      } else Alert.alert("Error", data.message);
    } catch { Alert.alert("Error", "Network error"); }
    finally { setPayLoading(false); }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadInvoicePDF(invoiceAppt);
    } catch {
      Alert.alert("Error", "Could not download invoice.");
    } finally {
      setDownloading(false);
    }
  };

  const filtered = filter === "All" ? appointments : appointments.filter(a => a.status === filter.toLowerCase());
  const formatDate = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>All Bookings</Text>
        <Text style={styles.headerCount}>{appointments.length} total</Text>
      </View>

      <View style={styles.filterWrapper}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={FILTERS}
          keyExtractor={(f) => f}
          contentContainerStyle={styles.filterContent}
          renderItem={({ item: f }) => (
            <TouchableOpacity style={[styles.filterChip, filter === f && styles.filterChipActive]} onPress={() => setFilter(f)}>
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0B3D2E" style={{ flex: 1 }} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadAppointments(); }} tintColor="#0B3D2E" />}
        >
          {filtered.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="calendar-outline" size={48} color="#A8D96C" />
              <Text style={styles.emptyText}>No {filter !== "All" ? filter : ""} bookings</Text>
            </View>
          ) : (
            filtered.map((appt) => (
              <View key={appt._id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <Text style={styles.serviceName}>{appt.serviceName}</Text>
                    <Text style={styles.petInfo}>🐾 {appt.petName} • {appt.customerId?.fullName || appt.customerId?.name || "Customer"}</Text>
                    {appt.customerId?.phone ? <Text style={styles.phoneInfo}>📞 {appt.customerId.phone}</Text> : null}
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: STATUS_BG[appt.status] }]}>
                    <Text style={[styles.statusText, { color: STATUS_COLOR[appt.status] }]}>{appt.status}</Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.detailRow}>
                  <View style={styles.detailItem}>
                    <Ionicons name="calendar-outline" size={13} color="#666" />
                    <Text style={styles.detailText}>{formatDate(appt.appointmentDate)}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Ionicons name="time-outline" size={13} color="#666" />
                    <Text style={styles.detailText}>{appt.appointmentTime}</Text>
                  </View>
                  {appt.totalAmount > 0 ? (
                    <View style={styles.detailItem}>
                      <Ionicons name="cash-outline" size={13} color="#666" />
                      <Text style={styles.detailText}>₹{appt.totalAmount}</Text>
                    </View>
                  ) : (
                    <View style={styles.detailItem}>
                      <Ionicons name="cash-outline" size={13} color="#F59E0B" />
                      <Text style={[styles.detailText, { color: "#B45309" }]}>Price on Request</Text>
                    </View>
                  )}
                  <View style={styles.detailItem}>
                    <Ionicons name={appt.paymentStatus === "paid" ? "checkmark-circle" : "time"} size={13} color={appt.paymentStatus === "paid" ? "#3E7B27" : "#F59E0B"} />
                    <Text style={styles.detailText}>{appt.paymentStatus}</Text>
                  </View>
                </View>

                {actionId === appt._id ? (
                  <ActivityIndicator size="small" color="#0B3D2E" style={{ marginTop: 10 }} />
                ) : (
                  <View style={styles.actionRow}>
                    {appt.status === "pending" && (
                      <TouchableOpacity style={styles.confirmBtn} onPress={() => {
                        if (appt.totalAmount === 0 || appt.totalAmount === null || appt.totalAmount === undefined) {
                          setConfirmAmountAppt(appt);
                          setConfirmAmount("");
                          setConfirmAmountModal(true);
                        } else {
                          handleConfirm(appt._id);
                        }
                      }} activeOpacity={0.8}>
                        <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                        <Text style={styles.confirmBtnText}>Confirm</Text>
                      </TouchableOpacity>
                    )}
                    {appt.status === "confirmed" && (
                      <TouchableOpacity style={styles.completeBtn} onPress={() => openCompleteModal(appt)} activeOpacity={0.8}>
                        <Ionicons name="ribbon-outline" size={16} color="#fff" />
                        <Text style={styles.confirmBtnText}>Mark Complete</Text>
                      </TouchableOpacity>
                    )}
                    {(appt.status === "pending" || appt.status === "confirmed") && (
                      <TouchableOpacity
                        style={styles.cancelBtn}
                        onPress={() => Alert.alert("Cancel Booking", "Are you sure?", [
                          { text: "No", style: "cancel" },
                          { text: "Yes", style: "destructive", onPress: () => handleUpdateStatus(appt._id, "cancelled") },
                        ])}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="close-circle-outline" size={16} color="#C62828" />
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                <Text style={styles.apptId}>ID: {appt._id.slice(-8).toUpperCase()}</Text>

                {/* Manual Payment Section */}
                {appt.status !== "cancelled" && appt.paymentStatus !== "paid" && appt.paymentMode !== "online" && (
                  <View style={styles.paySection}>
                    <View style={styles.paySectionHeader}>
                      <Ionicons name="cash-outline" size={14} color="#B45309" />
                      <Text style={styles.paySectionTitle}>Payment Pending</Text>
                    </View>
                    <TouchableOpacity style={styles.addPayBtn} onPress={() => { setPayTarget(appt); setPayMode(null); setPayAmount(String(appt.totalAmount || "")); setPayModal(true); }} activeOpacity={0.8}>
                      <Ionicons name="add-circle-outline" size={14} color="#0B3D2E" />
                      <Text style={styles.addPayBtnTxt}>Add Payment</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {appt.paymentStatus === "paid" && (
                  <View style={styles.paidBadgeRow}>
                    <Ionicons name="checkmark-circle" size={14} color="#3E7B27" />
                    <Text style={styles.paidBadgeTxt}>Paid via {appt.paymentMode || "online"}</Text>
                  </View>
                )}

                {/* View Invoice button */}
                {(appt.status === "completed" || appt.paymentStatus === "paid") && (
                  <TouchableOpacity
                    style={styles.invoiceBtn}
                    onPress={() => openInvoice(appt)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="document-text-outline" size={15} color="#3E7B27" />
                    <Text style={styles.invoiceBtnText}>View Invoice</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Payment Modal */}
      <Modal visible={payModal} transparent animationType="slide" onRequestClose={() => setPayModal(false)}>
        <View style={styles.payOverlay}>
          <View style={styles.paySheet}>
            <View style={styles.paySheetHeader}>
              <Text style={styles.paySheetTitle}>Record Payment</Text>
              <TouchableOpacity onPress={() => setPayModal(false)}>
                <Ionicons name="close" size={22} color="#0B3D2E" />
              </TouchableOpacity>
            </View>

            {payTarget && (
              <View style={styles.payCustomerBox}>
                <Ionicons name="person-outline" size={14} color="#3E7B27" />
                <Text style={styles.payCustomerTxt}>
                  {payTarget.customerId?.fullName || payTarget.customerId?.name || "Customer"}
                  {payTarget.customerId?.phone ? `  •  📞 ${payTarget.customerId.phone}` : ""}
                </Text>
              </View>
            )}

            <Text style={styles.payLabel}>Amount (₹)</Text>
            <TextInput
              style={styles.payInput}
              value={payAmount}
              onChangeText={setPayAmount}
              keyboardType="numeric"
              placeholder="Enter amount"
              placeholderTextColor="#aaa"
            />

            <Text style={styles.payLabel}>Amount (₹)</Text>
            <TextInput
              style={styles.payInput}
              value={payAmount}
              onChangeText={setPayAmount}
              keyboardType="numeric"
              placeholder="Enter amount"
              placeholderTextColor="#aaa"
            />

            <Text style={styles.payLabel}>Payment Mode</Text>
            <View style={styles.payModeRow}>
              {["cash", "card", "upi"].map((m) => (
                <TouchableOpacity key={m} style={[styles.payModeChip, payMode === m && styles.payModeChipActive]} onPress={() => setPayMode(m)} activeOpacity={0.8}>
                  <Text style={[styles.payModeChipTxt, payMode === m && styles.payModeChipTxtActive]}>{m.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {payTarget?.status === "confirmed" && (
              <View style={styles.completeToggleRow}>
                <Ionicons name="information-circle-outline" size={15} color="#666" />
                <Text style={styles.completeToggleTxt}>Booking will also be marked as Completed</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.payConfirmBtn, !payMode && { opacity: 0.5 }]}
              onPress={() => handleAddPayment(payTarget, payTarget?.status === "confirmed")}
              disabled={!payMode || payLoading}
              activeOpacity={0.8}
            >
              {payLoading ? <ActivityIndicator color="#A8D96C" /> : (
                <><Ionicons name="checkmark-circle-outline" size={18} color="#A8D96C" />
                <Text style={styles.payConfirmBtnTxt}>
                  {payTarget?.status === "confirmed" ? "Complete & Save Payment" : "Save Payment"}
                </Text></>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Confirm Amount Modal — for services with no price */}
      <Modal visible={confirmAmountModal} transparent animationType="slide" onRequestClose={() => setConfirmAmountModal(false)}>
        <View style={styles.payOverlay}>
          <View style={styles.paySheet}>
            <View style={styles.paySheetHeader}>
              <Text style={styles.paySheetTitle}>Set Service Amount</Text>
              <TouchableOpacity onPress={() => setConfirmAmountModal(false)}>
                <Ionicons name="close" size={22} color="#0B3D2E" />
              </TouchableOpacity>
            </View>

            {confirmAmountAppt && (
              <View style={styles.payCustomerBox}>
                <Ionicons name="construct-outline" size={14} color="#3E7B27" />
                <Text style={styles.payCustomerTxt}>
                  {confirmAmountAppt.serviceName} • {confirmAmountAppt.customerId?.fullName || confirmAmountAppt.customerId?.name || "Customer"}
                </Text>
              </View>
            )}

            <Text style={styles.payLabel}>Service Amount (₹) *</Text>
            <TextInput
              style={styles.payInput}
              value={confirmAmount}
              onChangeText={setConfirmAmount}
              keyboardType="numeric"
              placeholder="Enter amount for this service"
              placeholderTextColor="#aaa"
              autoFocus
            />
            <Text style={styles.confirmAmountHint}>
              This amount will be shown to the customer in their booking confirmation notification.
            </Text>

            <TouchableOpacity
              style={[styles.payConfirmBtn, (!confirmAmount || confirmAmountLoading) && { opacity: 0.5 }]}
              disabled={!confirmAmount || confirmAmountLoading}
              activeOpacity={0.8}
              onPress={async () => {
                const amt = Number(confirmAmount);
                if (!amt || amt <= 0) return Alert.alert("Invalid", "Please enter a valid amount.");
                setConfirmAmountLoading(true);
                try {
                  const res = await fetch(`${BASE_URL}/api/v1/customerappointment/confirmappoint/${confirmAmountAppt._id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json", Authorization: token },
                    body: JSON.stringify({ totalAmount: amt }),
                  });
                  const data = await res.json();
                  if (data.success) {
                    const updated = { ...confirmAmountAppt, status: "confirmed", totalAmount: amt };
                    setAppointments(prev => prev.map(a => a._id === confirmAmountAppt._id ? { ...a, ...updated } : a));
                    setConfirmAmountModal(false);
                    setConfirmAmountAppt(null);
                    setConfirmAmount("");
                    Alert.alert("✅ Confirmed", `Booking confirmed with amount ₹${amt}. Customer will be notified.`);
                  } else Alert.alert("Error", data.message);
                } catch { Alert.alert("Error", "Network error"); }
                finally { setConfirmAmountLoading(false); }
              }}
            >
              {confirmAmountLoading ? <ActivityIndicator color="#A8D96C" /> : (
                <><Ionicons name="checkmark-circle-outline" size={18} color="#A8D96C" />
                <Text style={styles.payConfirmBtnTxt}>Confirm Booking with ₹{confirmAmount || "0"}</Text></>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Invoice Modal ── */}
      <Modal
        visible={!!invoiceAppt}
        animationType="slide"
        onRequestClose={() => setInvoiceAppt(null)}
      >
        <SafeAreaView style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setInvoiceAppt(null)} style={styles.modalClose}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Invoice</Text>
            <Text style={styles.modalSub}>
              {invoiceAppt ? `DH-${invoiceAppt._id.slice(-8).toUpperCase()}` : ""}
            </Text>
          </View>

          {invoiceAppt && (
            invoiceHTML ? (
              <WebView
                style={{ flex: 1 }}
                originWhitelist={["*"]}
                source={{ html: invoiceHTML }}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <ActivityIndicator size="large" color="#0B3D2E" style={{ flex: 1 }} />
            )
          )}

          {/* Download Button */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.downloadBtn}
              onPress={handleDownload}
              disabled={downloading}
              activeOpacity={0.85}
            >
              {downloading ? (
                <ActivityIndicator color="#A8D96C" />
              ) : (
                <>
                  <Ionicons name="download-outline" size={20} color="#A8D96C" />
                  <Text style={styles.downloadBtnText}>Download PDF</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F7F0" },
  header: {
    backgroundColor: "#0B3D2E", paddingHorizontal: 20,
    paddingTop: 52, paddingBottom: 16,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  headerTitle: { fontSize: 20, fontFamily: "Poppins_700Bold", color: "#fff" },
  headerCount: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#A8D96C" },

  filterWrapper: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#D4EDD4",
    height: 56,
    justifyContent: "center",
  },
  filterContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: "#F0F7F0", borderWidth: 1, borderColor: "#D4EDD4" },
  filterChipActive: { backgroundColor: "#0B3D2E", borderColor: "#0B3D2E" },
  filterText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#3E7B27" },
  filterTextActive: { color: "#fff", fontFamily: "Poppins_700Bold" },

  scroll: { padding: 16, paddingBottom: 40 },

  card: {
    backgroundColor: "#fff", borderRadius: 16, padding: 14,
    marginBottom: 12, elevation: 2, borderWidth: 1, borderColor: "#D4EDD4",
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  cardHeaderLeft: { flex: 1 },
  serviceName: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 2 },
  petInfo: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#666" },
  phoneInfo: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#3E7B27", marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginLeft: 8 },
  statusText: { fontSize: 11, fontFamily: "Poppins_700Bold", textTransform: "capitalize" },

  divider: { height: 1, backgroundColor: "#E8F5E8", marginBottom: 10 },

  detailRow: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 10 },
  detailItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  detailText: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#555" },

  actionRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  confirmBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, backgroundColor: "#0B3D2E", borderRadius: 10, paddingVertical: 9,
  },
  completeBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, backgroundColor: "#1A5C3A", borderRadius: 10, paddingVertical: 9,
  },
  confirmBtnText: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#fff" },
  cancelBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, backgroundColor: "#FFF0F0", borderRadius: 10, paddingVertical: 9,
    borderWidth: 1, borderColor: "#FFCDD2",
  },
  cancelBtnText: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#C62828" },

  apptId: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#bbb", textAlign: "right", marginTop: 8 },

  paySection: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#FFF9E6", borderRadius: 10, padding: 10, marginTop: 8, borderWidth: 1, borderColor: "#FDE68A" },
  paySectionHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  paySectionTitle: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#B45309" },
  addPayBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#E8F5E8", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: "#D4EDD4" },
  addPayBtnTxt: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  paidBadgeRow: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#E8F5E8", borderRadius: 8, padding: 8, marginTop: 8, borderWidth: 1, borderColor: "#A8D96C" },
  paidBadgeTxt: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#3E7B27", textTransform: "capitalize" },

  payOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  paySheet: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
  paySheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  paySheetTitle: { fontSize: 17, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  payLabel: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 6, marginTop: 12 },
  payCustomerBox: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#E8F5E8", borderRadius: 10, padding: 10, marginBottom: 4, borderWidth: 1, borderColor: "#D4EDD4" },
  payCustomerTxt: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E", flex: 1 },
  payInput: { borderWidth: 1, borderColor: "#D4EDD4", borderRadius: 10, backgroundColor: "#F0F7F0", paddingHorizontal: 12, height: 46, fontSize: 14, fontFamily: "Inter_400Regular", color: "#1A1A1A" },
  payModeRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  payModeChip: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: "#D4EDD4", alignItems: "center", backgroundColor: "#F0F7F0" },
  payModeChipActive: { backgroundColor: "#0B3D2E", borderColor: "#0B3D2E" },
  payModeChipTxt: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#666" },
  payModeChipTxtActive: { color: "#A8D96C" },
  completeToggleRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12, backgroundColor: "#F0F7F0", borderRadius: 8, padding: 10 },
  completeToggleTxt: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#555", flex: 1 },
  payConfirmBtn: { backgroundColor: "#0B3D2E", borderRadius: 12, height: 50, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 16 },
  payConfirmBtnTxt: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#A8D96C" },
  confirmAmountHint: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#888", marginTop: 6, lineHeight: 16 },

  invoiceBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    marginTop: 10, paddingVertical: 9, borderRadius: 10,
    backgroundColor: "#F0F7F0", borderWidth: 1, borderColor: "#A8D96C",
  },
  invoiceBtnText: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#3E7B27" },

  emptyBox: { alignItems: "center", paddingVertical: 60 },
  emptyText: { fontSize: 16, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginTop: 12 },

  // Modal
  modalContainer: { flex: 1, backgroundColor: "#fff" },
  modalHeader: {
    backgroundColor: "#0B3D2E", paddingHorizontal: 20,
    paddingTop: 16, paddingBottom: 16,
    flexDirection: "row", alignItems: "center", gap: 12,
  },
  modalClose: { width: 36, height: 36, justifyContent: "center" },
  modalTitle: { fontSize: 18, fontFamily: "Poppins_700Bold", color: "#fff", flex: 1 },
  modalSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#A8D96C" },

  modalFooter: {
    padding: 16, backgroundColor: "#fff",
    borderTopWidth: 1, borderTopColor: "#D4EDD4",
  },
  downloadBtn: {
    backgroundColor: "#0B3D2E", borderRadius: 14, height: 52,
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, elevation: 3,
  },
  downloadBtnText: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#A8D96C" },
});
