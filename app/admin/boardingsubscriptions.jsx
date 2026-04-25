import { useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, TextInput, Modal, StatusBar,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getAuth } from "../../utils/authStorage";
import { BASE_URL } from "../../constants/api";

const STATUS_FILTERS = ["all", "pending", "active", "inactive", "rejected"];

export default function AdminBoardingSubscriptions() {
  const router = useRouter();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [token, setToken] = useState(null);
  const [actionModal, setActionModal] = useState(null); // { booking, action }
  const [adminNote, setAdminNote] = useState("");
  const [processing, setProcessing] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);

  const load = useCallback(async (status = filter) => {
    const { token: t } = await getAuth();
    setToken(t);
    try {
      const q = status === "all" ? "" : `?status=${status}`;
      const res = await fetch(`${BASE_URL}/api/v1/boarding-subscription/admin/list${q}`, {
        headers: { Authorization: t || "" },
      });
      const data = await res.json();
      if (data.success) setBookings(data.bookings || []);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useFocusEffect(useCallback(() => { load(filter); }, [filter]));

  const handleAction = async () => {
    if (!actionModal) return;
    setProcessing(true);
    try {
      const res = await fetch(
        `${BASE_URL}/api/v1/boarding-subscription/admin/${actionModal.booking._id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: token || "" },
          body: JSON.stringify({ action: actionModal.action, adminNote }),
        }
      );
      const data = await res.json();
      if (data.success) {
        Alert.alert("Done", `Booking ${actionModal.action}d successfully.`);
        setActionModal(null);
        setAdminNote("");
        load(filter);
      } else {
        Alert.alert("Error", data.message);
      }
    } catch (e) {
      Alert.alert("Error", "Network error");
    } finally {
      setProcessing(false);
    }
  };

  const statusColor = { pending: "#B8860B", active: "#0B3D2E", inactive: "#C62828", rejected: "#C62828", approved: "#2E7D32" };
  const statusBg = { pending: "#FFF9E6", active: "#E8F5E8", inactive: "#FFEBEE", rejected: "#FFEBEE", approved: "#E8F5E8" };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B3D2E" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="close" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Boarding Subscriptions</Text>
        <TouchableOpacity onPress={() => setShowFilterModal(true)} style={styles.filterIconBtn} activeOpacity={0.8}>
          <Ionicons name="options-outline" size={22} color="#A8D96C" />
          {filter !== "all" && <View style={styles.filterDot} />}
        </TouchableOpacity>
      </View>

      {/* Active filter badge */}
      {filter !== "all" && (
        <View style={styles.activeBadgeRow}>
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeTxt}>{filter.charAt(0).toUpperCase() + filter.slice(1)}</Text>
            <TouchableOpacity onPress={() => { setFilter("all"); setLoading(true); }} hitSlop={{top:6,bottom:6,left:6,right:6}}>
              <Ionicons name="close-circle" size={15} color="#0B3D2E" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Filter Bottom Sheet Modal */}
      <Modal visible={showFilterModal} transparent animationType="slide" onRequestClose={() => setShowFilterModal(false)}>
        <TouchableOpacity style={styles.filterOverlay} activeOpacity={1} onPress={() => setShowFilterModal(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.filterSheet}>
            <View style={styles.filterHandle} />
            <Text style={styles.filterSheetTitle}>Filter by Status</Text>
            {STATUS_FILTERS.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.filterOption, filter === s && styles.filterOptionActive]}
                onPress={() => { setFilter(s); setLoading(true); setShowFilterModal(false); }}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterOptionTxt, filter === s && styles.filterOptionTxtActive]}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </Text>
                {filter === s && <Ionicons name="checkmark-circle" size={20} color="#0B3D2E" />}
              </TouchableOpacity>
            ))}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#0B3D2E" /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {bookings.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>📭</Text>
              <Text style={styles.emptyText}>No {filter} bookings</Text>
            </View>
          ) : (
            bookings.map((b) => (
              <View key={b._id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderInfo}>
                    <Text style={styles.ownerName}>{b.userId?.fullName || "Unknown"}</Text>
                    <Text style={styles.ownerEmail}>{b.userId?.email}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusBg[b.status] }]}>
                    <Text style={[styles.statusText, { color: statusColor[b.status] }]}>
                      {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailsRow}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Pets</Text>
                    <Text style={styles.detailVal}>{b.numberOfPets}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Daily Charge</Text>
                    <Text style={styles.detailVal}>₹{b.dailyCharge}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Days Left</Text>
                    <Text style={styles.detailVal}>{b.daysRemaining}</Text>
                  </View>
                </View>

                <View style={styles.petsRow}>
                  {b.petIds?.map((p) => (
                    <View key={p._id} style={styles.petChip}>
                      <Text style={styles.petChipText}>🐾 {p.name} ({p.species || "Pet"})</Text>
                    </View>
                  ))}
                </View>

                {b.status === "active" && b.startDate && (
                  <View style={styles.datesRow}>
                    <View style={styles.dateItem}>
                      <Text style={styles.dateLabel}>Start</Text>
                      <Text style={styles.dateVal}>{new Date(b.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</Text>
                    </View>
                    <Ionicons name="arrow-forward" size={14} color="#aaa" />
                    <View style={styles.dateItem}>
                      <Text style={styles.dateLabel}>End</Text>
                      <Text style={styles.dateVal}>{new Date(b.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</Text>
                    </View>
                  </View>
                )}

                {b.adminNote ? (
                  <Text style={styles.noteText}>Note: {b.adminNote}</Text>
                ) : null}

                {b.status === "pending" && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={styles.approveBtn}
                      onPress={() => { setActionModal({ booking: b, action: "approve" }); setAdminNote(""); }}
                    >
                      <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                      <Text style={styles.approveBtnText}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.rejectBtn}
                      onPress={() => { setActionModal({ booking: b, action: "reject" }); setAdminNote(""); }}
                    >
                      <Ionicons name="close-circle-outline" size={16} color="#C62828" />
                      <Text style={styles.rejectBtnText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {b.status === "active" && (
                  <TouchableOpacity
                    style={styles.deboardBtn}
                    onPress={() => { setActionModal({ booking: b, action: "reject" }); setAdminNote(""); }}
                  >
                    <Ionicons name="exit-outline" size={16} color="#C62828" />
                    <Text style={styles.deboardBtnText}>Force Deboard</Text>
                  </TouchableOpacity>
                )}

                <Text style={styles.bookingId}>
                  {new Date(b.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  {" · "}ID: {b._id.slice(-6).toUpperCase()}
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Action Modal */}
      <Modal visible={!!actionModal} transparent animationType="slide" onRequestClose={() => setActionModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>
              {actionModal?.action === "approve" ? "✅ Approve Booking" : "❌ Reject Booking"}
            </Text>
            <Text style={styles.modalSub}>
              {actionModal?.booking?.userId?.fullName} · {actionModal?.booking?.numberOfPets} pet(s)
            </Text>
            <TextInput
              style={styles.noteInput}
              placeholder="Admin note (optional)"
              placeholderTextColor="#aaa"
              value={adminNote}
              onChangeText={setAdminNote}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setActionModal(null)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, actionModal?.action === "reject" && styles.modalConfirmBtnReject]}
                onPress={handleAction}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalConfirmText}>
                    {actionModal?.action === "approve" ? "Approve" : "Reject"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F7F0" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  header: {
    backgroundColor: "#0B3D2E", paddingHorizontal: 16,
    paddingTop: 52, paddingBottom: 14,
    flexDirection: "row", alignItems: "center",
  },
  backBtn: { width: 36, height: 36, justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: "Poppins_700Bold", color: "#fff", textAlign: "center" },

  filterIconBtn: { width: 36, height: 36, justifyContent: "center", alignItems: "center" },
  filterDot: { position: "absolute", top: 4, right: 4, width: 8, height: 8, borderRadius: 4, backgroundColor: "#A8D96C", borderWidth: 1.5, borderColor: "#0B3D2E" },

  activeBadgeRow: { backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#D4EDD4", flexDirection: "row" },
  activeBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#E8F5E8", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: "#A8D96C" },
  activeBadgeTxt: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },

  filterOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  filterSheet: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
  filterHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#D4EDD4", alignSelf: "center", marginBottom: 16 },
  filterSheetTitle: { fontSize: 16, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 14 },
  filterOption: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, paddingHorizontal: 12, borderRadius: 12, marginBottom: 6, backgroundColor: "#F0F7F0" },
  filterOptionActive: { backgroundColor: "#E8F5E8", borderWidth: 1, borderColor: "#A8D96C" },
  filterOptionTxt: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#0B3D2E" },
  filterOptionTxtActive: { fontFamily: "Poppins_700Bold" },

  scroll: { padding: 16, paddingBottom: 40 },
  emptyBox: { alignItems: "center", paddingVertical: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 10 },
  emptyText: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },

  card: {
    backgroundColor: "#fff", borderRadius: 16, padding: 16,
    marginBottom: 14, elevation: 2, borderWidth: 1, borderColor: "#D4EDD4",
  },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", marginBottom: 12 },
  cardHeaderInfo: { flex: 1 },
  ownerName: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  ownerEmail: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#888", marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontFamily: "Poppins_700Bold" },

  detailsRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  detailItem: {
    flex: 1, backgroundColor: "#F0F7F0", borderRadius: 10, padding: 10, alignItems: "center",
    borderWidth: 1, borderColor: "#D4EDD4",
  },
  detailLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#888", marginBottom: 2 },
  detailVal: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },

  petsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  petChip: {
    backgroundColor: "#E8F5E8", borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  petChipText: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#0B3D2E" },

  noteText: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#888", fontStyle: "italic", marginBottom: 8 },

  actionRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  approveBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    backgroundColor: "#0B3D2E", borderRadius: 12, paddingVertical: 12,
  },
  approveBtnText: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#fff" },
  rejectBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    borderWidth: 1.5, borderColor: "#C62828", borderRadius: 12, paddingVertical: 12,
  },
  rejectBtnText: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#C62828" },

  bookingId: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#bbb", textAlign: "right" },

  datesRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#F0F7F0", borderRadius: 10, padding: 10, marginBottom: 10,
  },
  dateItem: { flex: 1, alignItems: "center" },
  dateLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#888" },
  dateVal: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },

  deboardBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    borderWidth: 1.5, borderColor: "#C62828", borderRadius: 12, paddingVertical: 10,
    marginBottom: 10,
  },
  deboardBtnText: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#C62828" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalBox: {
    backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 36,
  },
  modalTitle: { fontSize: 18, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 4 },
  modalSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#666", marginBottom: 16 },
  noteInput: {
    backgroundColor: "#F0F7F0", borderRadius: 12, padding: 14,
    fontSize: 13, fontFamily: "Inter_400Regular", color: "#1A1A1A",
    borderWidth: 1, borderColor: "#D4EDD4", minHeight: 80,
    textAlignVertical: "top", marginBottom: 16,
  },
  modalActions: { flexDirection: "row", gap: 12 },
  modalCancelBtn: {
    flex: 1, borderWidth: 1.5, borderColor: "#D4EDD4", borderRadius: 14,
    paddingVertical: 14, alignItems: "center",
  },
  modalCancelText: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#666" },
  modalConfirmBtn: {
    flex: 1, backgroundColor: "#0B3D2E", borderRadius: 14,
    paddingVertical: 14, alignItems: "center",
  },
  modalConfirmBtnReject: { backgroundColor: "#C62828" },
  modalConfirmText: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#fff" },
});
