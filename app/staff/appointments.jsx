import { useState, useCallback, useEffect } from "react";
import {
  View, Text, ScrollView, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, Modal, TextInput,
  KeyboardAvoidingView, Platform, Image,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import * as ImagePicker from "expo-image-picker";
import { getAuth } from "../../utils/authStorage";
import { BASE_URL } from "../../constants/api";
import { buildInvoiceHTML, downloadInvoicePDF } from "../../utils/invoiceGenerator";
import { useStaff } from "../../context/StaffContext";

const FILTERS = ["All", "Pending", "Confirmed", "Completed", "Cancelled"];
const STATUS_COLOR = { pending: "#F59E0B", confirmed: "#3E7B27", completed: "#0B3D2E", cancelled: "#C62828" };
const STATUS_BG    = { pending: "#FFF9E6", confirmed: "#E8F5E8", completed: "#E8F5E8", cancelled: "#FFEBEE" };

function formatDate(d) {
  return d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
}

export default function StaffAppointments() {
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [invoiceAppt, setInvoiceAppt] = useState(null);
  const [invoiceHTML, setInvoiceHTML] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [detailAppt, setDetailAppt] = useState(null);
  const [payModal, setPayModal] = useState(false);
  const [payAppt, setPayAppt] = useState(null); // alag state payment ke liye
  const [payMode, setPayMode] = useState(null);
  const [payAmount, setPayAmount] = useState("");
  const [payLoading, setPayLoading] = useState(false);
  const [payScreenshot, setPayScreenshot] = useState(null);
  const [cashNotes, setCashNotes] = useState([]); // [{ denomination: 500, count: 2 }]
  const [noteDenom, setNoteDenom] = useState("");
  const [confirmAmountModal, setConfirmAmountModal] = useState(false);
  const [confirmAmount, setConfirmAmount] = useState("");
  const [confirmAmountAppt, setConfirmAmountAppt] = useState(null);
  const [confirmAmountLoading, setConfirmAmountLoading] = useState(false);
  const [calModal, setCalModal] = useState(false);
  const [calMonth, setCalMonth] = useState(new Date());
  const { appointments, setAppointments, token, setToken, loadAppointments } = useStaff();

  useEffect(() => {
    if (!token) getAuth().then(({ token: t }) => setToken(t || "")).catch(() => {});
    loadAppointments();
  }, [loadAppointments, setToken, token]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAppointments(true);
    setRefreshing(false);
  };

  const openInvoice = async (appt) => {
    setDetailAppt(null);
    setInvoiceHTML("");
    setInvoiceAppt(appt);
    try {
      const html = await buildInvoiceHTML(appt);
      setInvoiceHTML(html);
    } catch {
      Alert.alert("Error", "Could not generate invoice.");
      setInvoiceAppt(null);
    }
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
        setDetailAppt(prev => prev?._id === id ? { ...prev, ...updated } : prev);
        Alert.alert("✅ Done", `Booking ${status} successfully.`);
      } else Alert.alert("Error", data.message);
    } catch { Alert.alert("Error", "Network error"); }
    finally { setActionId(null); }
  };

  const pickPaymentImage = async () => {
    Alert.alert(
      "Upload Photo",
      "Choose source",
      [
        {
          text: "Camera",
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== "granted") return Alert.alert("Permission needed", "Please allow camera access.");
            const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
            if (!result.canceled) setPayScreenshot(result.assets[0]);
          },
        },
        {
          text: "Gallery",
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== "granted") return Alert.alert("Permission needed", "Please allow photo access.");
            const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
            if (!result.canceled) setPayScreenshot(result.assets[0]);
          },
        },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  const resetPayModal = () => {
    setPayModal(false); setPayAppt(null); setPayMode(null); setPayAmount("");
    setPayScreenshot(null); setCashNotes([]); setNoteDenom("");
  };

  const cashTotal = cashNotes.reduce((sum, n) => sum + (n.denomination * n.count), 0);

  const submitPaymentRecord = async (apptId, markComplete = false) => {
    if (!payMode) return Alert.alert("Select Mode", "Please select a payment mode.");
    if (!payScreenshot) return Alert.alert("Upload Required", payMode === "cash" ? "Please upload cash photo." : "Please upload payment screenshot.");
    const bookingAmt = Number(payAmount) || payAppt?.totalAmount || 0;
    if (payMode === "cash" && cashNotes.length > 0) {
      if (cashTotal < bookingAmt) return Alert.alert("Amount Short", "Cash total \u20b9" + cashTotal + " is less than booking amount \u20b9" + bookingAmt + ". Please add more notes.");
      if (cashTotal > bookingAmt) {
        const change = cashTotal - bookingAmt;
        const proceed = await new Promise(resolve =>
          Alert.alert("Extra Cash", "Cash total \u20b9" + cashTotal + " is \u20b9" + change + " more than booking amount \u20b9" + bookingAmt + ". Return \u20b9" + change + " as change?",
            [{ text: "Cancel", onPress: () => resolve(false), style: "cancel" }, { text: "Yes, Proceed", onPress: () => resolve(true) }]
          )
        );
        if (!proceed) return;
      }
    }
    setPayLoading(true);
    try {
      const formData = new FormData();
      formData.append("amount", String(bookingAmt));
      formData.append("paymentMode", payMode);
      formData.append("screenshot", { uri: payScreenshot.uri, type: "image/jpeg", name: "payment.jpg" });
      if (cashNotes.length > 0) {
        const noteStr = cashNotes.map(n => n.count + "x\u20b9" + n.denomination).join(", ");
        formData.append("cashSerialNumber", noteStr);
      }
      const res = await fetch(`${BASE_URL}/api/v1/payments/record/${apptId}`, {
        method: "POST",
        headers: { Authorization: token },
        body: formData,
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      if (markComplete) {
        await fetch(`${BASE_URL}/api/v1/customerappointment/updateappoint/${apptId}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: token },
          body: JSON.stringify({ status: "completed", paymentMode: payMode, paymentStatus: "paid" }),
        });
      }
      setAppointments(prev => prev.map(a => a._id === apptId ? {
        ...a, paymentStatus: "paid", paymentMode: payMode,
        ...(markComplete ? { status: "completed" } : {}),
      } : a));
      resetPayModal();
      Alert.alert("\u2705 Done", markComplete ? "Payment recorded & booking completed!" : "Payment recorded via " + payMode + ".");
    } catch (e) {
      Alert.alert("Error", e.message || "Network error");
    } finally {
      setPayLoading(false);
    }
  };

  const handleAddPayment = () => submitPaymentRecord(payAppt._id, false);

  const openCompleteModal = (appt) => {
    setPayAppt(appt);
    setPayMode(null);
    setPayAmount(String(appt.totalAmount || ""));
    setPayScreenshot(null);
    setCashNotes([]);
    setNoteDenom("");
    setPayModal(true);
  };

  const { filterDate: filterDateParam } = useLocalSearchParams();
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(filterDateParam || null);

  const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const DAY_NAMES = ["Su","Mo","Tu","We","Th","Fr","Sa"];
  const calYear = calMonth.getFullYear();
  const calMonthIdx = calMonth.getMonth();
  const daysInMonth = new Date(calYear, calMonthIdx + 1, 0).getDate();
  const firstDay = new Date(calYear, calMonthIdx, 1).getDay();
  const calDays = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const isSameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();

  const dateFiltered = selectedDate
    ? appointments.filter(a => isSameDay(a.appointmentDate, selectedDate))
    : appointments;

  const [showFilterModal, setShowFilterModal] = useState(false);
  const filtered = filter === "All" ? dateFiltered : dateFiltered.filter(a => a.status === filter.toLowerCase());
  const appt = detailAppt;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>
          {selectedDate ? `Appts — ${new Date(selectedDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : "All Bookings"}
        </Text>
        <View style={s.headerRight}>
          <Text style={s.headerCount}>{filtered.length} / {appointments.length}</Text>
          <TouchableOpacity
            style={[s.filterIconBtn, !!selectedDate && s.filterIconBtnActive]}
            onPress={() => setCalModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="calendar-outline" size={20} color={selectedDate ? "#0B3D2E" : "#A8D96C"} />
            {selectedDate && <View style={s.filterDot} />}
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.filterIconBtn, filter !== "All" && s.filterIconBtnActive]}
            onPress={() => setShowFilterModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="options-outline" size={20} color={filter !== "All" ? "#0B3D2E" : "#A8D96C"} />
            {filter !== "All" && <View style={s.filterDot} />}
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Bottom Sheet */}
      <Modal visible={showFilterModal} transparent animationType="slide" onRequestClose={() => setShowFilterModal(false)}>
        <TouchableOpacity style={s.filterOverlay} activeOpacity={1} onPress={() => setShowFilterModal(false)}>
          <TouchableOpacity activeOpacity={1} style={s.filterSheet}>
            <View style={s.filterHandle} />
            <Text style={s.filterSheetTitle}>Filter Bookings</Text>
            {FILTERS.map((f) => (
              <TouchableOpacity
                key={f}
                style={[s.filterOption, filter === f && s.filterOptionActive]}
                onPress={() => { setFilter(f); setShowFilterModal(false); }}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={f === "All" ? "apps-outline" : f === "Pending" ? "time-outline" : f === "Confirmed" ? "checkmark-circle-outline" : f === "Completed" ? "ribbon-outline" : "close-circle-outline"}
                  size={20}
                  color={filter === f ? "#A8D96C" : "#0B3D2E"}
                />
                <Text style={[s.filterOptionTxt, filter === f && s.filterOptionTxtActive]}>{f}</Text>
                {filter === f && <Ionicons name="checkmark" size={18} color="#A8D96C" style={{ marginLeft: "auto" }} />}
              </TouchableOpacity>
            ))}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Date Filter Banner */}
      {selectedDate && (
        <View style={s.dateBanner}>
          <Ionicons name="calendar" size={14} color="#B45309" />
          <Text style={s.dateBannerTxt}>
            {new Date(selectedDate).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
          </Text>
          <TouchableOpacity onPress={() => setSelectedDate(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={16} color="#B45309" />
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color="#0B3D2E" style={{ flex: 1 }} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0B3D2E" />}
        >
          {filtered.length === 0 ? (
            <View style={s.emptyBox}>
              <Ionicons name="calendar-outline" size={48} color="#A8D96C" />
              <Text style={s.emptyText}>No {filter !== "All" ? filter : ""} bookings</Text>
            </View>
          ) : (
            filtered.map((appt) => (
              <TouchableOpacity key={appt._id} style={s.card} onPress={() => setDetailAppt(appt)} activeOpacity={0.8}>
                <View style={s.cardHeader}>
                  <View style={s.cardHeaderLeft}>
                    <Text style={s.serviceName}>{appt.serviceName}</Text>
                    <Text style={s.petInfo}>🐾 {appt.petName} • {appt.customerId?.fullName || appt.customerId?.name || "Customer"}</Text>
                    {appt.customerId?.phone ? <Text style={s.phoneInfo}>📞 {appt.customerId.phone}</Text> : null}
                  </View>
                  <View style={s.cardRight}>
                    <View style={[s.statusBadge, { backgroundColor: STATUS_BG[appt.status] }]}>
                      <Text style={[s.statusText, { color: STATUS_COLOR[appt.status] }]}>{appt.status}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#ccc" style={{ marginTop: 4 }} />
                  </View>
                </View>
                <View style={s.divider} />
                <View style={s.detailRow}>
                  <View style={s.detailItem}>
                    <Ionicons name="calendar-outline" size={13} color="#666" />
                    <Text style={s.detailText}>{formatDate(appt.appointmentDate)}</Text>
                  </View>
                  <View style={s.detailItem}>
                    <Ionicons name="time-outline" size={13} color="#666" />
                    <Text style={s.detailText}>{appt.appointmentTime}</Text>
                  </View>
                  {appt.totalAmount > 0 ? (
                    <View style={s.detailItem}>
                      <Ionicons name="cash-outline" size={13} color="#666" />
                      <Text style={s.detailText}>₹{appt.totalAmount}</Text>
                    </View>
                  ) : (
                    <View style={s.detailItem}>
                      <Ionicons name="cash-outline" size={13} color="#F59E0B" />
                      <Text style={[s.detailText, { color: "#B45309" }]}>Price on Request</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      {/* Booking Detail Modal */}
      <Modal visible={!!appt} transparent animationType="slide" onRequestClose={() => setDetailAppt(null)}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Booking Details</Text>
              <TouchableOpacity onPress={() => setDetailAppt(null)}>
                <Ionicons name="close" size={22} color="#0B3D2E" />
              </TouchableOpacity>
            </View>

            {appt && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={[s.statusBig, { backgroundColor: STATUS_BG[appt.status] }]}>
                  <Ionicons name={appt.status === "confirmed" ? "checkmark-circle" : appt.status === "cancelled" ? "close-circle" : appt.status === "completed" ? "ribbon" : "time"} size={16} color={STATUS_COLOR[appt.status]} />
                  <Text style={[s.statusBigTxt, { color: STATUS_COLOR[appt.status] }]}>{appt.status?.toUpperCase()}</Text>
                </View>

                <View style={s.detailCard}>
                  {[
                    { icon: "construct-outline", label: "Service",  value: appt.serviceName },
                    { icon: "paw-outline",        label: "Pet",      value: appt.petName },
                    { icon: "person-outline",     label: "Customer", value: appt.customerId?.fullName || appt.customerId?.name || "Customer" },
                    { icon: "call-outline",        label: "Mobile",   value: appt.customerId?.phone || "—" },
                    { icon: "calendar-outline",   label: "Date",     value: formatDate(appt.appointmentDate) },
                    { icon: "time-outline",        label: "Time",     value: appt.appointmentTime },
                    { icon: "cash-outline",        label: "Amount",   value: appt.totalAmount > 0 ? `₹${appt.totalAmount}` : "Price on Request" },
                    { icon: "card-outline",        label: "Payment",  value: appt.paymentStatus || "unpaid" },
                  ].map((row) => (
                    <View key={row.label} style={s.dRow}>
                      <View style={s.dLeft}>
                        <Ionicons name={row.icon} size={15} color="#3E7B27" />
                        <Text style={s.dLabel}>{row.label}</Text>
                      </View>
                      <Text style={s.dValue}>{row.value}</Text>
                    </View>
                  ))}
                  {appt.notes ? (
                    <View style={{ paddingTop: 10 }}>
                      <Text style={{ fontSize: 11, fontFamily: "Poppins_700Bold", color: "#3E7B27", marginBottom: 4 }}>Notes</Text>
                      <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: "#333" }}>{appt.notes}</Text>
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
                          onPress={() => Alert.alert("Cancel", "Cancel this booking?", [
                            { text: "No", style: "cancel" },
                            { text: "Yes", style: "destructive", onPress: () => handleUpdateStatus(appt._id, "cancelled") },
                          ])}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="close-circle-outline" size={18} color="#C62828" />
                          <Text style={s.cancelBtnTxt}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={s.acceptBtn}
                          onPress={() => {
                            if (appt.totalAmount === 0 || appt.totalAmount === null || appt.totalAmount === undefined) {
                              // No price set — ask staff to enter amount
                              setConfirmAmountAppt(appt);
                              setConfirmAmount("");
                              setConfirmAmountModal(true);
                            } else {
                              Alert.alert("Accept", "Confirm this booking?", [
                                { text: "No", style: "cancel" },
                                { text: "Yes", onPress: () => handleUpdateStatus(appt._id, "confirmed") },
                              ]);
                            }
                          }}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                          <Text style={s.acceptBtnTxt}>Accept</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                )}

                {/* Manual Payment Section */}
                {appt.status !== "cancelled" && appt.paymentStatus !== "paid" && appt.paymentMode !== "online" && (
                  <View style={s.paySection}>
                    <View style={s.paySectionHeader}>
                      <Ionicons name="cash-outline" size={15} color="#F59E0B" />
                      <Text style={s.paySectionTitle}>Payment Pending</Text>
                    </View>
                    <TouchableOpacity style={s.addPayBtn} onPress={() => {
                      setPayAppt(appt);
                      setPayMode(null);
                      setPayAmount(String(appt.totalAmount || ""));
                      setPayScreenshot(null);
                      setCashNotes([]);
                      setNoteDenom("");
                      setPayModal(true);
                    }} activeOpacity={0.8}>
                      <Ionicons name="add-circle-outline" size={16} color="#0B3D2E" />
                      <Text style={s.addPayBtnTxt}>Add Payment</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {appt.paymentStatus === "paid" && (
                  <View style={s.paidBadgeRow}>
                    <Ionicons name="checkmark-circle" size={15} color="#3E7B27" />
                    <Text style={s.paidBadgeTxt}>Paid via {appt.paymentMode || "online"}</Text>
                  </View>
                )}

                {appt.status === "confirmed" && (
                  <TouchableOpacity
                    style={s.completeBtn}
                    onPress={() => {
                      const apptCopy = { ...appt };
                      setDetailAppt(null);
                      setTimeout(() => openCompleteModal(apptCopy), 400);
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="ribbon-outline" size={18} color="#fff" />
                    <Text style={s.completeBtnText}>Mark as Completed</Text>
                  </TouchableOpacity>
                )}

                {/* Invoice — only admin can view, hidden for staff */}
                {/* {(appt.status === "completed" || appt.paymentStatus === "paid") && (
                  <TouchableOpacity style={s.invoiceBtn} onPress={() => openInvoice(appt)} activeOpacity={0.8}>
                    <Ionicons name="document-text-outline" size={15} color="#3E7B27" />
                    <Text style={s.invoiceBtnText}>View Invoice</Text>
                  </TouchableOpacity>
                )} */}

                <View style={{ height: 20 }} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Payment Modal */}
      <Modal visible={payModal} transparent animationType="slide" onRequestClose={() => { setPayModal(false); }}>
        <KeyboardAvoidingView style={s.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setPayModal(false)} />
          <View style={[s.modalSheet, { maxHeight: "90%" }]}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Record Payment</Text>
              <TouchableOpacity onPress={() => setPayModal(false)}>
                <Ionicons name="close" size={22} color="#0B3D2E" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {payAppt && (
                <View style={s.payCustomerBox}>
                  <Ionicons name="person-outline" size={14} color="#3E7B27" />
                  <Text style={s.payCustomerTxt}>
                    {payAppt.customerId?.fullName || payAppt.customerId?.name || "Customer"}
                    {payAppt.customerId?.phone ? "  \u2022  " + payAppt.customerId.phone : ""}
                  </Text>
                </View>
              )}

              <Text style={s.payLabel}>Amount (\u20b9)</Text>
              <TextInput
                style={s.payInput}
                value={payAmount}
                onChangeText={setPayAmount}
                keyboardType="numeric"
                placeholder="Enter amount"
                placeholderTextColor="#aaa"
              />

              <Text style={s.payLabel}>Payment Mode</Text>
              <View style={s.payModeRow}>
                {["cash", "online"].map((m) => (
                  <TouchableOpacity key={m} style={[s.payModeChip, payMode === m && s.payModeChipActive]}
                  onPress={() => { setPayMode(m); setPayScreenshot(null); setCashNotes([]); setNoteDenom(""); }}
                    activeOpacity={0.8}>
                    <Text style={[s.payModeChipTxt, payMode === m && s.payModeChipTxtActive]}>
                      {m === "cash" ? "\ud83d\udcb5 CASH" : "\ud83d\udcf1 ONLINE"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {payMode && (
                <>
                  <Text style={s.payLabel}>
                    {payMode === "cash" ? "\ud83d\udcf7 Cash Photo" : "\ud83d\udcf8 Payment Screenshot"}
                  </Text>
                  <TouchableOpacity style={s.uploadBox} onPress={pickPaymentImage} activeOpacity={0.8}>
                    {payScreenshot ? (
                      <Image source={{ uri: payScreenshot.uri }} style={s.uploadPreview} resizeMode="cover" />
                    ) : (
                      <View style={s.uploadPlaceholder}>
                        <Ionicons name="cloud-upload-outline" size={28} color="#3E7B27" />
                        <Text style={s.uploadPlaceholderTxt}>Tap to upload</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </>
              )}

              {payMode === "cash" && (
                <>
                  <Text style={s.payLabel}>Cash Notes</Text>
                  <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
                    <TextInput
                      style={[s.payInput, { width: 90 }]}
                      value={noteDenom}
                      onChangeText={v => setNoteDenom(v.replace(/[^0-9]/g, ""))}
                      keyboardType="numeric"
                      placeholder="\u20b9 Note"
                      placeholderTextColor="#aaa"
                    />
                    <TouchableOpacity
                      style={{ backgroundColor: noteDenom ? "#0B3D2E" : "#ccc", borderRadius: 10, paddingHorizontal: 16, justifyContent: "center" }}
                      onPress={() => {
                        const d = Number(noteDenom);
                        if (!d || d <= 0) return Alert.alert("Enter Note Value", "e.g. 500, 200, 100");
                        const existing = cashNotes.findIndex(n => n.denomination === d);
                        if (existing >= 0) {
                          setCashNotes(prev => prev.map((n, i) => i === existing ? { ...n, count: n.count + 1 } : n));
                        } else {
                          setCashNotes(prev => [...prev, { denomination: d, count: 1 }]);
                        }
                        setNoteDenom("");
                      }}
                      disabled={!noteDenom}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="add" size={20} color="#A8D96C" />
                    </TouchableOpacity>
                  </View>
                  <Text style={{ fontSize: 10, fontFamily: "Inter_400Regular", color: "#aaa", marginBottom: 8 }}>
                    Enter note value (e.g. 500) and tap + to add
                  </Text>

                  {cashNotes.length > 0 && (
                    <View style={{ backgroundColor: "#F8FFF8", borderRadius: 12, borderWidth: 1, borderColor: "#D4EDD4", padding: 10, marginBottom: 6 }}>
                      {cashNotes.map((note, idx) => (
                        <View key={idx} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 6, borderBottomWidth: idx < cashNotes.length - 1 ? 1 : 0, borderBottomColor: "#E8F5E8" }}>
                          <View style={{ backgroundColor: "#0B3D2E", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginRight: 8 }}>
                            <Text style={{ fontSize: 12, fontFamily: "Poppins_700Bold", color: "#A8D96C" }}>₹{note.denomination}</Text>
                          </View>
                          <Text style={{ flex: 1, fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E" }}>× {note.count}</Text>
                          <Text style={{ fontSize: 13, fontFamily: "Poppins_700Bold", color: "#3E7B27", marginRight: 8 }}>₹{note.denomination * note.count}</Text>
                          <View style={{ flexDirection: "row", gap: 4 }}>
                            <TouchableOpacity
                              style={{ backgroundColor: "#E8F5E8", borderRadius: 6, padding: 4 }}
                              onPress={() => setCashNotes(prev => prev.map((n, i) => i === idx ? { ...n, count: Math.max(1, n.count - 1) } : n))}
                              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            >
                              <Ionicons name="remove" size={14} color="#0B3D2E" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={{ backgroundColor: "#E8F5E8", borderRadius: 6, padding: 4 }}
                              onPress={() => setCashNotes(prev => prev.map((n, i) => i === idx ? { ...n, count: n.count + 1 } : n))}
                              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            >
                              <Ionicons name="add" size={14} color="#0B3D2E" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => setCashNotes(prev => prev.filter((_, i) => i !== idx))}
                              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            >
                              <Ionicons name="close-circle" size={18} color="#C62828" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                      <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#D4EDD4" }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
                          <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: "#666" }}>Cash Total</Text>
                          <Text style={{ fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E" }}>₹{cashTotal}</Text>
                        </View>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
                          <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: "#666" }}>Booking Amount</Text>
                          <Text style={{ fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E" }}>₹{Number(payAmount) || payAppt?.totalAmount || 0}</Text>
                        </View>
                        {(() => {
                          const booking = Number(payAmount) || payAppt?.totalAmount || 0;
                          const diff = cashTotal - booking;
                          if (diff === 0) return (
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#E8F5E8", borderRadius: 8, padding: 6, marginTop: 4 }}>
                              <Ionicons name="checkmark-circle" size={14} color="#3E7B27" />
                              <Text style={{ fontSize: 12, fontFamily: "Poppins_700Bold", color: "#3E7B27" }}>Exact amount ✔</Text>
                            </View>
                          );
                          return (
                            <View style={{ flexDirection: "row", justifyContent: "space-between", backgroundColor: diff < 0 ? "#FFEBEE" : "#FFF9E6", borderRadius: 8, padding: 6, marginTop: 4 }}>
                              <Text style={{ fontSize: 12, fontFamily: "Poppins_700Bold", color: diff < 0 ? "#C62828" : "#B45309" }}>
                                {diff < 0 ? "⚠️ Short" : "⚠️ Extra (Return change)"}
                              </Text>
                              <Text style={{ fontSize: 12, fontFamily: "Poppins_700Bold", color: diff < 0 ? "#C62828" : "#B45309" }}>₹{Math.abs(diff)}</Text>
                            </View>
                          );
                        })()}
                      </View>
                    </View>
                  )}
                </>
              )}

              {payAppt?.status === "confirmed" && (
                <View style={s.completeToggleRow}>
                  <Ionicons name="information-circle-outline" size={15} color="#666" />
                  <Text style={s.completeToggleTxt}>Booking will also be marked as Completed</Text>
                </View>
              )}

              <TouchableOpacity
                style={[s.payConfirmBtn, (!payMode || payLoading) && { opacity: 0.5 }]}
                onPress={() => submitPaymentRecord(payAppt._id, payAppt?.status === "confirmed")}
                disabled={!payMode || payLoading}
                activeOpacity={0.8}
              >
                {payLoading ? <ActivityIndicator color="#A8D96C" /> : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#A8D96C" />
                    <Text style={s.payConfirmBtnTxt}>
                      {payAppt?.status === "confirmed" ? "Complete & Save Payment" : "Save Payment"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              <View style={{ height: 24 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Confirm Amount Modal — for services with no price */}
      <Modal visible={confirmAmountModal} transparent animationType="slide" onRequestClose={() => setConfirmAmountModal(false)}>
        <KeyboardAvoidingView style={s.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setConfirmAmountModal(false)} />
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Set Service Amount</Text>
              <TouchableOpacity onPress={() => setConfirmAmountModal(false)}>
                <Ionicons name="close" size={22} color="#0B3D2E" />
              </TouchableOpacity>
            </View>

            {confirmAmountAppt && (
              <View style={s.payCustomerBox}>
                <Ionicons name="construct-outline" size={14} color="#3E7B27" />
                <Text style={s.payCustomerTxt}>
                  {confirmAmountAppt.serviceName} • {confirmAmountAppt.customerId?.fullName || confirmAmountAppt.customerId?.name || "Customer"}
                </Text>
              </View>
            )}

            <Text style={s.payLabel}>Service Amount (₹) *</Text>
            <TextInput
              style={s.payInput}
              value={confirmAmount}
              onChangeText={setConfirmAmount}
              keyboardType="numeric"
              placeholder="Enter amount for this service"
              placeholderTextColor="#aaa"
              autoFocus
            />
            <Text style={s.confirmAmountHint}>
              This amount will be shown to the customer in their booking confirmation notification.
            </Text>

            <TouchableOpacity
              style={[s.payConfirmBtn, (!confirmAmount || confirmAmountLoading) && { opacity: 0.5 }]}
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
                    setDetailAppt(prev => prev?._id === confirmAmountAppt._id ? { ...prev, ...updated } : prev);
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
                <Text style={s.payConfirmBtnTxt}>Confirm Booking with ₹{confirmAmount || "0"}</Text></>
              )}
            </TouchableOpacity>
            <View style={{ height: 20 }} />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Calendar Date Picker Modal */}
      <Modal visible={calModal} transparent animationType="fade" onRequestClose={() => setCalModal(false)}>
        <TouchableOpacity style={s.calOverlay} activeOpacity={1} onPress={() => setCalModal(false)}>
          <TouchableOpacity activeOpacity={1} style={s.calBox}>
            <View style={s.calHeader}>
              <TouchableOpacity onPress={() => setCalMonth(new Date(calYear, calMonthIdx - 1, 1))} hitSlop={{ top:8,bottom:8,left:8,right:8 }}>
                <Ionicons name="chevron-back" size={20} color="#0B3D2E" />
              </TouchableOpacity>
              <Text style={s.calMonthTxt}>{MONTH_NAMES[calMonthIdx]} {calYear}</Text>
              <TouchableOpacity onPress={() => setCalMonth(new Date(calYear, calMonthIdx + 1, 1))} hitSlop={{ top:8,bottom:8,left:8,right:8 }}>
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
                const isSelected = selectedDate && isSameDay(thisDate, selectedDate);
                const isTodayDay = isSameDay(thisDate, new Date());
                return (
                  <TouchableOpacity
                    style={[s.calDay, isSelected && s.calDaySelected, isTodayDay && !isSelected && s.calDayToday]}
                    onPress={() => { setSelectedDate(thisDate); setCalModal(false); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.calDayTxt, isSelected && s.calDayTxtSelected, isTodayDay && !isSelected && s.calDayTxtToday]}>{day}</Text>
                  </TouchableOpacity>
                );
              }}
            />
            <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
              <TouchableOpacity style={[s.calTodayBtn, { flex: 1, backgroundColor: "#F0F7F0" }]} onPress={() => { setSelectedDate(new Date()); setCalModal(false); }} activeOpacity={0.8}>
                <Text style={[s.calTodayBtnTxt, { color: "#0B3D2E" }]}>Today</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.calTodayBtn, { flex: 1 }]} onPress={() => { setSelectedDate(null); setCalModal(false); }} activeOpacity={0.8}>
                <Text style={s.calTodayBtnTxt}>Show All</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Invoice Modal */}
      <Modal visible={!!invoiceAppt} animationType="slide" onRequestClose={() => setInvoiceAppt(null)}>
        <SafeAreaView style={s.invoiceContainer}>
          <View style={s.invoiceHeader}>
            <TouchableOpacity onPress={() => setInvoiceAppt(null)} style={s.modalClose}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={s.modalTitle}>Invoice</Text>
            <Text style={s.modalSub}>{invoiceAppt ? `DH-${invoiceAppt._id.slice(-8).toUpperCase()}` : ""}</Text>
          </View>
          {invoiceAppt && (
            invoiceHTML ? (
              <WebView style={{ flex: 1 }} originWhitelist={["*"]} source={{ html: invoiceHTML }} showsVerticalScrollIndicator={false} />
            ) : (
              <ActivityIndicator size="large" color="#0B3D2E" style={{ flex: 1 }} />
            )
          )}
          <View style={s.modalFooter}>
            <TouchableOpacity
              style={s.downloadBtn} disabled={downloading} activeOpacity={0.85}
              onPress={async () => {
                setDownloading(true);
                try { await downloadInvoicePDF(invoiceAppt); }
                catch { Alert.alert("Error", "Could not download invoice."); }
                finally { setDownloading(false); }
              }}
            >
              {downloading ? <ActivityIndicator color="#A8D96C" /> : (
                <><Ionicons name="download-outline" size={20} color="#A8D96C" /><Text style={s.downloadBtnText}>Download PDF</Text></>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F7F0" },
  header: {
    backgroundColor: "#0B3D2E", paddingHorizontal: 20,
    paddingTop: 52, paddingBottom: 16,
    flexDirection: "row", alignItems: "center", gap: 12,
  },
  backBtn: { width: 32, height: 32, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 20, fontFamily: "Poppins_700Bold", color: "#fff", flex: 1 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerCount: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#A8D96C" },
  filterIconBtn: {
    position: "relative", padding: 8,
    backgroundColor: "rgba(168,217,108,0.15)", borderRadius: 12,
  },
  filterIconBtnActive: { backgroundColor: "#A8D96C" },
  filterDot: {
    position: "absolute", top: 5, right: 5,
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: "#F59E0B", borderWidth: 1, borderColor: "#0B3D2E",
  },
  filterOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  filterSheet: {
    backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 36,
  },
  filterHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: "#D4EDD4",
    alignSelf: "center", marginBottom: 16,
  },
  filterSheetTitle: { fontSize: 16, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 14 },
  filterOption: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 13, paddingHorizontal: 14, borderRadius: 12,
    marginBottom: 6, backgroundColor: "#F0F7F0",
  },
  filterOptionActive: { backgroundColor: "#0B3D2E" },
  filterOptionTxt: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#0B3D2E", flex: 1 },
  filterOptionTxtActive: { color: "#fff", fontFamily: "Poppins_700Bold" },
  scroll: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: "#fff", borderRadius: 16, padding: 14,
    marginBottom: 12, elevation: 2, borderWidth: 1, borderColor: "#D4EDD4",
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  cardHeaderLeft: { flex: 1 },
  cardRight: { alignItems: "flex-end" },
  serviceName: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 2 },
  petInfo: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#666" },
  phoneInfo: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#3E7B27", marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginLeft: 8 },
  statusText: { fontSize: 11, fontFamily: "Poppins_700Bold", textTransform: "capitalize" },
  divider: { height: 1, backgroundColor: "#E8F5E8", marginBottom: 10 },
  detailRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  detailItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  detailText: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#555" },
  emptyBox: { alignItems: "center", paddingVertical: 60 },
  emptyText: { fontSize: 16, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginTop: 12 },

  // Detail Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "88%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 18, fontFamily: "Poppins_700Bold", color: "#0B3D2E", flex: 1 },
  modalSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#A8D96C" },
  statusBig: { flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginBottom: 16 },
  statusBigTxt: { fontSize: 13, fontFamily: "Poppins_700Bold" },
  detailCard: { backgroundColor: "#F8FFF8", borderRadius: 14, borderWidth: 1, borderColor: "#D4EDD4", padding: 14, marginBottom: 16 },
  dRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#E8F5E8" },
  dLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  dLabel: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#666" },
  dValue: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E", textAlign: "right", flex: 1, marginLeft: 8 },
  actionRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  cancelBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1.5, borderColor: "#C62828", borderRadius: 12, paddingVertical: 12, backgroundColor: "#FFEBEE" },
  cancelBtnTxt: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#C62828" },
  acceptBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#0B3D2E", borderRadius: 12, paddingVertical: 12 },
  acceptBtnTxt: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#A8D96C" },
  completeBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#1A5C3A", borderRadius: 12, paddingVertical: 12, marginBottom: 10 },
  completeBtnText: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#fff" },
  invoiceBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 4, paddingVertical: 10, borderRadius: 10, backgroundColor: "#F0F7F0", borderWidth: 1, borderColor: "#A8D96C" },
  invoiceBtnText: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#3E7B27" },

  paySection: { backgroundColor: "#FFF9E6", borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: "#FDE68A", flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  paySectionHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  paySectionTitle: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#B45309" },
  addPayBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#E8F5E8", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: "#D4EDD4" },
  addPayBtnTxt: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  paidBadgeRow: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#E8F5E8", borderRadius: 10, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: "#A8D96C" },
  paidBadgeTxt: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#3E7B27", textTransform: "capitalize" },

  payLabel: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 6, marginTop: 12 },
  payCustomerBox: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#E8F5E8", borderRadius: 10, padding: 10, marginBottom: 4, borderWidth: 1, borderColor: "#D4EDD4" },
  payCustomerTxt: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E", flex: 1 },
  payInput: { borderWidth: 1, borderColor: "#D4EDD4", borderRadius: 10, backgroundColor: "#F0F7F0", paddingHorizontal: 12, height: 46, fontSize: 14, fontFamily: "Inter_400Regular", color: "#1A1A1A" },
  payModeRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  payModeChip: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: "#D4EDD4", alignItems: "center", backgroundColor: "#F0F7F0" },
  payModeChipActive: { backgroundColor: "#0B3D2E", borderColor: "#0B3D2E" },
  payModeChipTxt: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#666" },
  payModeChipTxtActive: { color: "#A8D96C" },
  uploadBox: { borderWidth: 1.5, borderColor: "#A8D96C", borderStyle: "dashed", borderRadius: 12, overflow: "hidden", height: 120, marginBottom: 4 },
  uploadPreview: { width: "100%", height: "100%" },
  uploadPlaceholder: { flex: 1, justifyContent: "center", alignItems: "center", gap: 6, backgroundColor: "#F0F7F0" },
  uploadPlaceholderTxt: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#3E7B27" },
  completeToggleRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12, backgroundColor: "#F0F7F0", borderRadius: 8, padding: 10 },
  completeToggleTxt: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#555", flex: 1 },
  payConfirmBtn: { backgroundColor: "#0B3D2E", borderRadius: 12, height: 50, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 16 },
  payConfirmBtnTxt: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#A8D96C" },
  confirmAmountHint: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#888", marginTop: 6, lineHeight: 16 },

  // Invoice Modal
  invoiceContainer: { flex: 1, backgroundColor: "#fff" },
  invoiceHeader: { backgroundColor: "#0B3D2E", paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, flexDirection: "row", alignItems: "center", gap: 12 },
  modalClose: { width: 36, height: 36, justifyContent: "center" },
  modalFooter: { padding: 16, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#D4EDD4" },
  downloadBtn: { backgroundColor: "#0B3D2E", borderRadius: 14, height: 52, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, elevation: 3 },
  downloadBtnText: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#A8D96C" },
  apptId: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#bbb", textAlign: "right", marginTop: 8 },

  dateBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FFF9E6", borderRadius: 12, padding: 10, marginHorizontal: 16, marginTop: 12, marginBottom: 4, borderWidth: 1, borderColor: "#FDE68A" },
  dateBannerTxt: { flex: 1, fontSize: 13, fontFamily: "Poppins_700Bold", color: "#B45309" },

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
