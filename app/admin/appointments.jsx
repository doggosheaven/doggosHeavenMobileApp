import { useState, useCallback, useEffect } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, Modal, TextInput, FlatList, Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getAuth } from "../../utils/authStorage";
import { BASE_URL } from "../../constants/api";
import { registerCacheReset } from "../../utils/sessionCache";
import { buildInvoiceHTML, downloadInvoicePDF } from "../../utils/invoiceGenerator";

const FILTERS = ["All", "Pending", "Confirmed", "Completed", "Cancelled"];
const STATUS_COLOR = { pending: "#F59E0B", confirmed: "#3E7B27", completed: "#0B3D2E", cancelled: "#C62828" };
const STATUS_BG    = { pending: "#FFF9E6", confirmed: "#E8F5E8", completed: "#E8F5E8", cancelled: "#FFEBEE" };

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAY_NAMES   = ["Su","Mo","Tu","We","Th","Fr","Sa"];

function CalendarModal({ visible, selectedDate, onSelect, onClose }) {
  const [calMonth, setCalMonth] = useState(selectedDate || new Date());
  const year  = calMonth.getFullYear();
  const month = calMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay    = new Date(year, month, 1).getDay();
  const isSameDay   = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();
  const calDays     = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={cal.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={cal.box}>
          <View style={cal.header}>
            <TouchableOpacity onPress={() => setCalMonth(new Date(year, month-1, 1))} hitSlop={{top:8,bottom:8,left:8,right:8}}>
              <Ionicons name="chevron-back" size={20} color="#0B3D2E" />
            </TouchableOpacity>
            <Text style={cal.monthTxt}>{MONTH_NAMES[month]} {year}</Text>
            <TouchableOpacity onPress={() => setCalMonth(new Date(year, month+1, 1))} hitSlop={{top:8,bottom:8,left:8,right:8}}>
              <Ionicons name="chevron-forward" size={20} color="#0B3D2E" />
            </TouchableOpacity>
          </View>
          <View style={cal.dayRow}>
            {DAY_NAMES.map(d => <Text key={d} style={cal.dayName}>{d}</Text>)}
          </View>
          <FlatList
            data={calDays} numColumns={7} keyExtractor={(_,i)=>String(i)} scrollEnabled={false}
            renderItem={({item:day}) => {
              if (!day) return <View style={cal.dayEmpty}/>;
              const thisDate = new Date(year, month, day);
              const isSel    = selectedDate && isSameDay(thisDate, selectedDate);
              const isToday  = isSameDay(thisDate, new Date());
              return (
                <TouchableOpacity style={[cal.day, isSel && cal.daySelected, isToday && !isSel && cal.dayToday]} onPress={()=>{onSelect(thisDate);onClose();}} activeOpacity={0.7}>
                  <Text style={[cal.dayTxt, isSel && cal.dayTxtSelected, isToday && !isSel && cal.dayTxtToday]}>{day}</Text>
                </TouchableOpacity>
              );
            }}
          />
          <TouchableOpacity style={cal.todayBtn} onPress={()=>{onSelect(new Date());onClose();}} activeOpacity={0.8}>
            <Text style={cal.todayBtnTxt}>Go to Today</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const cal = StyleSheet.create({
  overlay: {flex:1,backgroundColor:"rgba(0,0,0,0.45)",justifyContent:"center",alignItems:"center"},
  box: {backgroundColor:"#fff",borderRadius:20,padding:20,width:"88%",elevation:10},
  header: {flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:14},
  monthTxt: {fontSize:16,fontFamily:"Poppins_700Bold",color:"#0B3D2E"},
  dayRow: {flexDirection:"row",marginBottom:6},
  dayName: {flex:1,textAlign:"center",fontSize:11,fontFamily:"Poppins_700Bold",color:"#3E7B27"},
  day: {flex:1,height:36,justifyContent:"center",alignItems:"center",borderRadius:8,margin:1},
  dayEmpty: {flex:1,height:36,margin:1},
  daySelected: {backgroundColor:"#0B3D2E"},
  dayToday: {backgroundColor:"#E8F5E8",borderWidth:1.5,borderColor:"#3E7B27"},
  dayTxt: {fontSize:13,fontFamily:"Inter_400Regular",color:"#1A1A1A"},
  dayTxtSelected: {fontFamily:"Poppins_700Bold",color:"#A8D96C"},
  dayTxtToday: {fontFamily:"Poppins_700Bold",color:"#0B3D2E"},
  todayBtn: {backgroundColor:"#0B3D2E",borderRadius:12,paddingVertical:12,alignItems:"center",marginTop:14},
  todayBtnTxt: {fontSize:14,fontFamily:"Poppins_700Bold",color:"#A8D96C"},
});

let _cachedAppts = null;
let _cachedApptToken = "";

registerCacheReset(() => { _cachedAppts = null; _cachedApptToken = ""; });

export default function AdminAppointments() {
  const { filter: paramFilter } = useLocalSearchParams();
  const router = useRouter();
  const [appointments, setAppointments] = useState(_cachedAppts || []);
  const [filter, setFilter] = useState(paramFilter || "All");
  const [selectedDate, setSelectedDate] = useState(null);
  const [showCal, setShowCal] = useState(false);
  const [loading, setLoading] = useState(!_cachedAppts);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [token, setToken] = useState(_cachedApptToken);

  
  useEffect(() => {
    if (paramFilter) setFilter(paramFilter);
    else setFilter("All");
  }, [paramFilter]);

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
  const [detailAppt, setDetailAppt] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [payHistoryLoading, setPayHistoryLoading] = useState(false);
  const [fullImg, setFullImg] = useState(null);

  const openInvoice = async (appt) => {
    setInvoiceHTML("");
    setInvoiceAppt(appt);
    const html = await buildInvoiceHTML(appt);
    setInvoiceHTML(html);
  };

  const openDetailAppt = async (appt) => {
    setDetailAppt(appt);
    setPaymentHistory([]);
    setPayHistoryLoading(true);
    try {
      const { token: freshToken } = await getAuth();
      const t = freshToken || token || "";
      if (t) setToken(t);
      const res = await fetch(`${BASE_URL}/api/v1/payments/history/${appt._id}`, {
        headers: { Authorization: t },
      });
      const data = await res.json();
      if (data.success) setPaymentHistory(data.payments || []);
    } catch (e) { console.log("payment history error:", e); }
    finally { setPayHistoryLoading(false); }
  };

  const loadAppointments = useCallback(async (force = false) => {
    if (!force && _cachedAppts) { setAppointments(_cachedAppts); setLoading(false); return; }
    try {
      const { token: t } = await getAuth();
      setToken(t || ""); _cachedApptToken = t || "";
      const res = await fetch(`${BASE_URL}/api/v1/customerappointment/getallappoint`, {
        headers: { Authorization: t || "" },
      });
      const data = await res.json();
      if (data.success) { setAppointments(data.data || []); _cachedAppts = data.data || []; }
    } catch (e) { console.log(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { loadAppointments(); }, [loadAppointments]));

  const handleConfirm = async (id) => {
    setActionId(id);
    try {
      const t = token || (await getAuth()).token || "";
      const res = await fetch(`${BASE_URL}/api/v1/customerappointment/confirmappoint/${id}`, {
        method: "PATCH", headers: { Authorization: t },
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
      const t = token || (await getAuth()).token || "";
      const res = await fetch(`${BASE_URL}/api/v1/customerappointment/updateappoint/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: t },
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

  const [showFilterModal, setShowFilterModal] = useState(false);
  const isSameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";
  const isToday = selectedDate && isSameDay(selectedDate, new Date());

  const filtered = appointments.filter(a => {
    const statusMatch = filter === "All" || a.status === filter.toLowerCase();
    const dateMatch   = !selectedDate || isSameDay(new Date(a.appointmentDate), selectedDate);
    return statusMatch && dateMatch;
  });
  const formatDate = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="close" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Bookings</Text>
        <View style={styles.headerRight}>
          <Text style={styles.headerCount}>{filtered.length} / {appointments.length}</Text>
          <TouchableOpacity
            style={[styles.filterIconBtn, filter !== "All" && styles.filterIconBtnActive]}
            onPress={() => setShowFilterModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="options-outline" size={20} color={filter !== "All" ? "#0B3D2E" : "#A8D96C"} />
            {filter !== "All" && <View style={styles.filterDot} />}
          </TouchableOpacity>
        </View>
      </View>

      {/* Date Picker Bar */}
      <View style={styles.dateBar}>
        <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowCal(true)} activeOpacity={0.8}>
          <Ionicons name="calendar-outline" size={15} color="#0B3D2E" />
          <Text style={styles.datePickerTxt}>
            {selectedDate ? (isToday ? "Today" : fmtDate(selectedDate)) : "All Dates"}
          </Text>
          {selectedDate ? (
            <TouchableOpacity onPress={() => setSelectedDate(null)} hitSlop={{top:8,bottom:8,left:8,right:8}}>
              <Ionicons name="close-circle" size={15} color="#C62828" />
            </TouchableOpacity>
          ) : (
            <Ionicons name="chevron-down" size={15} color="#999" />
          )}
        </TouchableOpacity>
        {filter !== "All" && (
          <View style={[styles.activeFilterBadge, { backgroundColor: STATUS_BG[filter.toLowerCase()] }]}>
            <Text style={[styles.activeFilterBadgeTxt, { color: STATUS_COLOR[filter.toLowerCase()] }]}>{filter}</Text>
            <TouchableOpacity onPress={() => setFilter("All")} hitSlop={{top:6,bottom:6,left:6,right:6}}>
              <Ionicons name="close" size={12} color={STATUS_COLOR[filter.toLowerCase()]} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <CalendarModal
        visible={showCal}
        selectedDate={selectedDate}
        onSelect={(d) => setSelectedDate(d)}
        onClose={() => setShowCal(false)}
      />

      {/* Filter Bottom Sheet */}
      <Modal visible={showFilterModal} transparent animationType="slide" onRequestClose={() => setShowFilterModal(false)}>
        <TouchableOpacity style={styles.filterOverlay} activeOpacity={1} onPress={() => setShowFilterModal(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.filterSheet}>
            <View style={styles.filterHandle} />
            <Text style={styles.filterSheetTitle}>Filter Bookings</Text>
            {FILTERS.map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.filterOption, filter === f && styles.filterOptionActive]}
                onPress={() => { setFilter(f); setShowFilterModal(false); }}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={f === "All" ? "apps-outline" : f === "Pending" ? "time-outline" : f === "Confirmed" ? "checkmark-circle-outline" : f === "Completed" ? "ribbon-outline" : "close-circle-outline"}
                  size={20}
                  color={filter === f ? "#A8D96C" : "#0B3D2E"}
                />
                <Text style={[styles.filterOptionTxt, filter === f && styles.filterOptionTxtActive]}>{f}</Text>
                {filter === f && <Ionicons name="checkmark" size={18} color="#A8D96C" style={{ marginLeft: "auto" }} />}
              </TouchableOpacity>
            ))}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {loading ? (
        <ActivityIndicator size="large" color="#0B3D2E" style={{ flex: 1 }} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadAppointments(true); }} tintColor="#0B3D2E" />}
        >
          {filtered.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="calendar-outline" size={48} color="#A8D96C" />
              <Text style={styles.emptyText}>No {filter !== "All" ? filter : ""} bookings</Text>
            </View>
          ) : (
            filtered.map((appt) => (
              <TouchableOpacity key={appt._id} style={styles.card} onPress={() => openDetailAppt(appt)} activeOpacity={0.85}>
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
                    {/* Online paid + pending → auto confirm & complete */}
                    {appt.paymentStatus === "paid" && appt.paymentMode === "online" && appt.status !== "completed" && appt.status !== "cancelled" && (
                      <TouchableOpacity style={styles.completeBtn} onPress={() =>
                        Alert.alert("Mark Complete", "Payment already received online. Mark as completed?", [
                          { text: "Cancel", style: "cancel" },
                          { text: "Complete", onPress: () => handleUpdateStatus(appt._id, "completed") },
                        ])
                      } activeOpacity={0.8}>
                        <Ionicons name="ribbon-outline" size={16} color="#fff" />
                        <Text style={styles.confirmBtnText}>Mark Complete</Text>
                      </TouchableOpacity>
                    )}
                    {/* Normal pending — not online paid */}
                    {appt.status === "pending" && !(appt.paymentStatus === "paid" && appt.paymentMode === "online") && (
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
                    {/* Confirmed but not online paid → Mark Complete */}
                    {appt.status === "confirmed" && !(appt.paymentStatus === "paid" && appt.paymentMode === "online") && (
                      <TouchableOpacity style={styles.completeBtn} onPress={() => openCompleteModal(appt)} activeOpacity={0.8}>
                        <Ionicons name="ribbon-outline" size={16} color="#fff" />
                        <Text style={styles.confirmBtnText}>Mark Complete</Text>
                      </TouchableOpacity>
                    )}
                    {/* Cancel — only if not online paid */}
                    {(appt.status === "pending" || appt.status === "confirmed") && !(appt.paymentStatus === "paid" && appt.paymentMode === "online") && (
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
              </TouchableOpacity>
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

      {/* ── Booking Detail Modal ── */}
      <Modal visible={!!detailAppt} animationType="slide" onRequestClose={() => setDetailAppt(null)}>
        <SafeAreaView style={styles.modalContainer} edges={["top"]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setDetailAppt(null)} style={styles.modalClose}>
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Booking Detail</Text>
            <View style={[styles.statusBadge, { backgroundColor: STATUS_BG[detailAppt?.status] }]}>
              <Text style={[styles.statusText, { color: STATUS_COLOR[detailAppt?.status] }]}>{detailAppt?.status}</Text>
            </View>
          </View>

          {detailAppt && (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40, backgroundColor: "#F0F7F0" }}>

              {/* Service Info */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Service Info</Text>
                <DetailRow icon="construct-outline" label="Service" value={detailAppt.serviceName} />
                <DetailRow icon="calendar-outline" label="Date" value={formatDate(detailAppt.appointmentDate)} />
                <DetailRow icon="time-outline" label="Time" value={detailAppt.appointmentTime} />
                {detailAppt.notes ? <DetailRow icon="document-text-outline" label="Notes" value={detailAppt.notes} last /> : null}
              </View>

              {/* Pet Info */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Pet Info</Text>
                <DetailRow icon="paw-outline" label="Pet Name" value={detailAppt.petName} />
                <DetailRow icon="color-palette-outline" label="Breed" value={detailAppt.petBreed || "—"} />
                <DetailRow icon="calendar-outline" label="Age" value={detailAppt.petAge || "—"} last />
              </View>

              {/* Customer Info */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Customer Info</Text>
                <DetailRow icon="person-outline" label="Name" value={detailAppt.customerId?.fullName || detailAppt.customerId?.name || "—"} />
                <DetailRow icon="mail-outline" label="Email" value={detailAppt.customerId?.email || "—"} />
                <DetailRow icon="call-outline" label="Phone" value={detailAppt.customerId?.phone || "—"} last />
              </View>

              {/* Payment Info */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Payment Info</Text>
                <DetailRow icon="cash-outline" label="Amount" value={detailAppt.totalAmount > 0 ? `₹${detailAppt.totalAmount}` : "Price on Request"} />
                {/* GST disabled: {detailAppt.gstAmount > 0 && <DetailRow icon="receipt-outline" label="GST" value={`₹${detailAppt.gstAmount}`} />} */}
                <DetailRow icon="card-outline" label="Payment Mode" value={detailAppt.paymentMode || "—"} />
                <DetailRow icon="checkmark-circle-outline" label="Payment Status" value={detailAppt.paymentStatus} />
                {detailAppt.ambulanceRequired && (
                  <DetailRow icon="car-outline" label="Pickup & Drop" value={`${detailAppt.ambulanceKm} km • ₹${detailAppt.ambulanceFare}`} />
                )}
                <DetailRow icon="time-outline" label="Booked At" value={detailAppt.bookedAt ? new Date(detailAppt.bookedAt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"} last />
              </View>

              {/* Payment Details from Staff */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Payment Details (Staff Recorded)</Text>
                {payHistoryLoading ? (
                  <ActivityIndicator size="small" color="#0B3D2E" style={{ marginVertical: 12 }} />
                ) : paymentHistory.length === 0 ? (
                  <View style={{ paddingVertical: 14, alignItems: "center" }}>
                    <Ionicons name="receipt-outline" size={28} color="#ccc" />
                    <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: "#aaa", marginTop: 6 }}>No payment recorded yet</Text>
                  </View>
                ) : (
                  paymentHistory.map((pay, idx) => (
                    <View key={pay._id} style={[styles.payHistoryCard, idx < paymentHistory.length - 1 && { marginBottom: 12 }]}>
                      {/* Mode + Amount */}
                      <View style={styles.payHistoryTop}>
                        <View style={[styles.payModeBadge, { backgroundColor: pay.paymentMode === "cash" ? "#FFF9E6" : "#EEF9FF" }]}>
                          <Text style={[styles.payModeBadgeTxt, { color: pay.paymentMode === "cash" ? "#B45309" : "#1565C0" }]}>
                            {pay.paymentMode === "cash" ? "💵 CASH" : "📱 ONLINE"}
                          </Text>
                        </View>
                        <Text style={styles.payHistoryAmt}>₹{pay.amount}</Text>
                        <Text style={styles.payHistoryTime}>
                          {new Date(pay.paidAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </Text>
                      </View>

                      {/* Recorded by */}
                      {pay.recordedBy?.fullName && (
                        <View style={styles.payHistoryRow}>
                          <Ionicons name="person-outline" size={13} color="#3E7B27" />
                          <Text style={styles.payHistoryLabel}>Recorded by</Text>
                          <Text style={styles.payHistoryValue}>{pay.recordedBy.fullName}</Text>
                        </View>
                      )}

                      {/* Cash Notes breakdown */}
                      {pay.paymentMode === "cash" && pay.cashSerialNumber && (
                        <View style={styles.payHistoryRow}>
                          <Ionicons name="cash-outline" size={13} color="#3E7B27" />
                          <Text style={styles.payHistoryLabel}>Notes</Text>
                          <Text style={[styles.payHistoryValue, { flex: 2 }]}>{pay.cashSerialNumber}</Text>
                        </View>
                      )}

                      {/* Note / remark */}
                      {pay.note && (
                        <View style={styles.payHistoryRow}>
                          <Ionicons name="document-text-outline" size={13} color="#3E7B27" />
                          <Text style={styles.payHistoryLabel}>Note</Text>
                          <Text style={[styles.payHistoryValue, { flex: 2 }]}>{pay.note}</Text>
                        </View>
                      )}

                      {/* Screenshot / Cash photo */}
                      {pay.screenshot && (
                        <View style={{ marginTop: 10 }}>
                          <Text style={styles.payHistoryLabel}>
                            {pay.paymentMode === "cash" ? "📷 Cash Photo" : "📸 Payment Screenshot"}
                          </Text>
                          <TouchableOpacity
                            activeOpacity={0.85}
                            onPress={() => setFullImg(pay.screenshot)}
                          >
                            <Image
                              source={{ uri: pay.screenshot }}
                              style={styles.payScreenshotImg}
                              resizeMode="cover"
                            />
                            <Text style={{ fontSize: 10, fontFamily: "Inter_400Regular", color: "#3E7B27", textAlign: "center", marginTop: 4 }}>Tap to view full</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  ))
                )}
              </View>

              {/* Booking ID */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Booking Reference</Text>
                <DetailRow icon="barcode-outline" label="Booking ID" value={`DH-${detailAppt._id.slice(-8).toUpperCase()}`} last />
              </View>

              {/* Invoice Button */}
              {(detailAppt.status === "completed" || detailAppt.paymentStatus === "paid") && (
                <TouchableOpacity
                  style={[styles.invoiceBtn, { marginTop: 8 }]}
                  onPress={() => { setDetailAppt(null); setTimeout(() => openInvoice(detailAppt), 300); }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="document-text-outline" size={16} color="#3E7B27" />
                  <Text style={styles.invoiceBtnText}>View Invoice</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          )}

          {/* Full Image Viewer — inside detail modal so it renders on top */}
          {fullImg && (
            <TouchableOpacity
              style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.95)", justifyContent: "center", alignItems: "center", zIndex: 999 }}
              activeOpacity={1}
              onPress={() => setFullImg(null)}
            >
              <Image source={{ uri: fullImg }} style={{ width: "95%", height: "75%", borderRadius: 12 }} resizeMode="contain" />
              <Text style={{ color: "#aaa", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 16 }}>Tap anywhere to close</Text>
            </TouchableOpacity>
          )}
        </SafeAreaView>
      </Modal>

      {/* ── Invoice Modal ── */}
      <Modal
        visible={!!invoiceAppt}
        animationType="slide"
        onRequestClose={() => setInvoiceAppt(null)}
      >
        <SafeAreaView style={styles.modalContainer} edges={["top"]}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setInvoiceAppt(null)} style={styles.modalClose}>
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Invoice</Text>
            <Text style={styles.modalSub}>
              {invoiceAppt ? `DH-${invoiceAppt._id.slice(-8).toUpperCase()}` : ""}
            </Text>
          </View>

          {invoiceAppt && (
            invoiceHTML ? (
              <View style={{ flex: 1, backgroundColor: "#fff" }}>
                <WebView
                  style={{ flex: 1 }}
                  originWhitelist={["*"]}
                  source={{ html: invoiceHTML }}
                  showsVerticalScrollIndicator={false}
                />
              </View>
            ) : (
              <ActivityIndicator size="large" color="#0B3D2E" style={{ flex: 1 }} />
            )
          )}

          {/* Download Button */}
          <View style={[styles.modalFooter, { backgroundColor: "#fff" }]}>
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
    flexDirection: "row", alignItems: "center",
  },
  backBtn: { width: 36, height: 36, justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 20, fontFamily: "Poppins_700Bold", color: "#fff", textAlign: "center" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerCount: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#A8D96C" },
  filterIconBtn: { position: "relative", padding: 8, backgroundColor: "rgba(168,217,108,0.15)", borderRadius: 12 },
  filterIconBtnActive: { backgroundColor: "#A8D96C" },
  filterDot: { position: "absolute", top: 5, right: 5, width: 7, height: 7, borderRadius: 4, backgroundColor: "#F59E0B", borderWidth: 1, borderColor: "#0B3D2E" },

  dateBar: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: "#D4EDD4",
  },
  datePickerBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#F0F7F0", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9,
    borderWidth: 1, borderColor: "#D4EDD4",
  },
  datePickerTxt: { flex: 1, fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  activeFilterBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
  },
  activeFilterBadgeTxt: { fontSize: 12, fontFamily: "Poppins_700Bold" },
  filterOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  filterSheet: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
  filterHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#D4EDD4", alignSelf: "center", marginBottom: 16 },
  filterSheetTitle: { fontSize: 16, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 14 },
  filterOption: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13, paddingHorizontal: 14, borderRadius: 12, marginBottom: 6, backgroundColor: "#F0F7F0" },
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

  // Detail Modal
  detailSection: {
    backgroundColor: "#fff", borderRadius: 16, paddingHorizontal: 14,
    marginBottom: 14, elevation: 2, borderWidth: 1, borderColor: "#D4EDD4",
  },
  detailSectionTitle: {
    fontSize: 12, fontFamily: "Poppins_700Bold", color: "#3E7B27",
    paddingTop: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: "#F0F7F0",
    marginBottom: 4,
  },
  detailRowItem: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: "#F0F7F0",
  },
  detailRowIconBox: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: "#E8F5E8", justifyContent: "center", alignItems: "center",
  },
  detailRowLabel: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#666", flex: 1 },
  detailRowValue: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#0B3D2E", flex: 2, textAlign: "right" },

  invoiceBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    marginTop: 10, paddingVertical: 9, borderRadius: 10,
    backgroundColor: "#F0F7F0", borderWidth: 1, borderColor: "#A8D96C",
  },
  invoiceBtnText: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#3E7B27" },

  emptyBox: { alignItems: "center", paddingVertical: 60 },
  emptyText: { fontSize: 16, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginTop: 12 },

  // Modal
  modalContainer: { flex: 1, backgroundColor: "#0B3D2E" },
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

  // Payment History
  payHistoryCard: {
    backgroundColor: "#F8FFF8", borderRadius: 12,
    borderWidth: 1, borderColor: "#D4EDD4", padding: 12, marginTop: 8,
  },
  payHistoryTop: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  payModeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  payModeBadgeTxt: { fontSize: 11, fontFamily: "Poppins_700Bold" },
  payHistoryAmt: { fontSize: 16, fontFamily: "Poppins_700Bold", color: "#0B3D2E", flex: 1 },
  payHistoryTime: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#999" },
  payHistoryRow: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    paddingVertical: 6, borderTopWidth: 1, borderTopColor: "#E8F5E8",
  },
  payHistoryLabel: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#666", width: 90 },
  payHistoryValue: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#0B3D2E", flex: 1 },
  payScreenshotImg: {
    width: "100%", height: 180, borderRadius: 10,
    marginTop: 6, borderWidth: 1, borderColor: "#D4EDD4",
  },
});

function DetailRow({ icon, label, value, last }) {
  return (
    <View style={[styles.detailRowItem, last && { borderBottomWidth: 0 }]}>
      <View style={styles.detailRowIconBox}>
        <Ionicons name={icon} size={15} color="#3E7B27" />
      </View>
      <Text style={styles.detailRowLabel}>{label}</Text>
      <Text style={styles.detailRowValue} numberOfLines={2}>{value || "—"}</Text>
    </View>
  );
}
