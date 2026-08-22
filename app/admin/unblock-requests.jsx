import { useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, TextInput, Modal,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { getAuth } from "../../utils/authStorage";
import { BASE_URL } from "../../constants/api";
import { ErrorState } from "../../components/ScreenState";

const STATUS_CONFIG = {
  pending:  { label: "Pending",  bg: "#FFF9E6", color: "#B8860B", icon: "time" },
  approved: { label: "Approved", bg: "#E8F5E8", color: "#2E7D32", icon: "checkmark-circle" },
  rejected: { label: "Rejected", bg: "#FFEBEE", color: "#C62828", icon: "close-circle" },
};

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export default function UnblockRequests() {
  const router = useRouter();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [token, setToken] = useState("");
  const [filter, setFilter] = useState("pending");
  const [resolveModal, setResolveModal] = useState(null); // request object
  const [adminNote, setAdminNote] = useState("");
  const [resolving, setResolving] = useState(false);

  const load = useCallback(async () => {
    try {
      const { token: t } = await getAuth();
      setToken(t || "");
      const res = await fetch(`${BASE_URL}/api/v1/pet/unblock-requests`, {
        headers: { Authorization: t || "" },
      });
      const json = await res.json();
      if (json.success) setRequests(json.requests || []);
    } catch (e) { if (__DEV__) console.log(e); setLoadError(true); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleResolve = async (action) => {
    setResolving(true);
    try {
      const res = await fetch(`${BASE_URL}/api/v1/pet/unblock-requests/${resolveModal._id}/resolve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: token },
        body: JSON.stringify({ action, adminNote: adminNote.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        setRequests((prev) =>
          prev.map((r) => r._id === resolveModal._id ? { ...r, status: action, adminNote: adminNote.trim() } : r)
        );
        setResolveModal(null);
        setAdminNote("");
        Alert.alert(
          action === "approved" ? "✅ Approved" : "❌ Rejected",
          action === "approved" ? "Pet has been unblocked and customer notified." : "Request rejected and customer notified."
        );
      } else {
        Alert.alert("Error", json.message);
      }
    } catch { Alert.alert("Error", "Network error."); }
    finally { setResolving(false); }
  };

  const filtered = requests.filter((r) => filter === "all" || r.status === filter);
  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="close" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Unblock Requests</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Filter Tabs */}
      <View style={s.tabRow}>
        {[
          { key: "pending", label: "Pending" },
          { key: "approved", label: "Approved" },
          { key: "rejected", label: "Rejected" },
          { key: "all", label: "All" },
        ].map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[s.tab, filter === t.key && s.tabActive]}
            onPress={() => setFilter(t.key)}
          >
            <Text style={[s.tabTxt, filter === t.key && s.tabTxtActive]}>{t.label}</Text>
            {t.key === "pending" && pendingCount > 0 && (
              <View style={s.badge}><Text style={s.badgeTxt}>{pendingCount}</Text></View>
            )}
          </TouchableOpacity>
        ))}
      </View>

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
          {filtered.length === 0 ? (
            <View style={s.emptyBox}>
              <Ionicons name="checkmark-circle" size={52} color="#A8D96C" />
              <Text style={s.emptyTitle}>No {filter !== "all" ? filter : ""} requests</Text>
            </View>
          ) : (
            filtered.map((req) => {
              const sc = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending;
              return (
                <View key={req._id} style={s.card}>
                  {/* Header */}
                  <View style={s.cardHeader}>
                    <View style={s.petAvatar}>
                      <Text style={s.petAvatarTxt}>{req.pet?.name?.slice(0, 2).toUpperCase() || "??"}</Text>
                    </View>
                    <View style={s.cardInfo}>
                      <Text style={s.petName}>{req.pet?.name || "Unknown Pet"}</Text>
                      <Text style={s.petBreed}>{req.pet?.breed || req.pet?.species || "—"}</Text>
                    </View>
                    <View style={[s.statusBadge, { backgroundColor: sc.bg }]}>
                      <Ionicons name={sc.icon} size={12} color={sc.color} />
                      <Text style={[s.statusTxt, { color: sc.color }]}>{sc.label}</Text>
                    </View>
                  </View>

                  <View style={s.divider} />

                  {/* Blacklist reason */}
                  {req.pet?.blacklistReason ? (
                    <View style={s.blacklistReasonBox}>
                      <Text style={s.blacklistReasonLabel}>Blacklist Reason:</Text>
                      <Text style={s.blacklistReasonTxt}>{req.pet.blacklistReason}</Text>
                    </View>
                  ) : null}

                  {/* Customer request reason */}
                  <View style={s.reasonBox}>
                    <Text style={s.reasonLabel}>Customer's Reason:</Text>
                    <Text style={s.reasonTxt}>{req.reason}</Text>
                  </View>

                  {/* Owner info */}
                  {req.owner && (
                    <View style={s.ownerRow}>
                      <Ionicons name="person-outline" size={13} color="#3E7B27" />
                      <Text style={s.ownerTxt}>{req.owner.name}</Text>
                      {req.owner.phone && (
                        <>
                          <Text style={s.dot}>•</Text>
                          <Ionicons name="call-outline" size={13} color="#3E7B27" />
                          <Text style={s.ownerTxt}>{req.owner.phone}</Text>
                        </>
                      )}
                    </View>
                  )}

                  <Text style={s.dateTxt}>Submitted: {fmtDate(req.createdAt)}</Text>

                  {/* Admin note if resolved */}
                  {req.adminNote ? (
                    <View style={s.adminNoteBox}>
                      <Text style={s.adminNoteLabel}>Admin Note:</Text>
                      <Text style={s.adminNoteTxt}>{req.adminNote}</Text>
                    </View>
                  ) : null}

                  {/* Action buttons — only for pending */}
                  {req.status === "pending" && (
                    <TouchableOpacity
                      style={s.reviewBtn}
                      onPress={() => { setResolveModal(req); setAdminNote(""); }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="eye-outline" size={16} color="#fff" />
                      <Text style={s.reviewBtnTxt}>Review Request</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* Resolve Modal */}
      <Modal visible={!!resolveModal} transparent animationType="slide" onRequestClose={() => setResolveModal(null)}>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Review Request</Text>
              <TouchableOpacity onPress={() => setResolveModal(null)}>
                <Ionicons name="close" size={22} color="#0B3D2E" />
              </TouchableOpacity>
            </View>

            <Text style={s.sheetPetName}>Pet: {resolveModal?.pet?.name}</Text>

            <View style={s.reasonBox}>
              <Text style={s.reasonLabel}>Customer's Reason:</Text>
              <Text style={s.reasonTxt}>{resolveModal?.reason}</Text>
            </View>

            <Text style={s.fieldLabel}>Admin Note (optional)</Text>
            <TextInput
              style={s.noteInput}
              placeholder="Add a note for the customer..."
              placeholderTextColor="#aaa"
              value={adminNote}
              onChangeText={setAdminNote}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            {resolving ? (
              <ActivityIndicator size="large" color="#0B3D2E" style={{ marginVertical: 16 }} />
            ) : (
              <View style={s.actionRow}>
                <TouchableOpacity
                  style={s.rejectBtn}
                  onPress={() => Alert.alert("Reject", "Reject this unblock request?", [
                    { text: "Cancel", style: "cancel" },
                    { text: "Reject", style: "destructive", onPress: () => handleResolve("rejected") },
                  ])}
                  activeOpacity={0.8}
                >
                  <Ionicons name="close-circle-outline" size={18} color="#C62828" />
                  <Text style={s.rejectBtnTxt}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.approveBtn}
                  onPress={() => Alert.alert("Approve & Unblock", "Approve this request and unblock the pet?", [
                    { text: "Cancel", style: "cancel" },
                    { text: "Approve", onPress: () => handleResolve("approved") },
                  ])}
                  activeOpacity={0.8}
                >
                  <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                  <Text style={s.approveBtnTxt}>Approve & Unblock</Text>
                </TouchableOpacity>
              </View>
            )}
            <View style={{ height: 20 }} />
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
    flexDirection: "row", alignItems: "center",
  },
  backBtn: { width: 36, height: 36, justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: "Poppins_700Bold", color: "#fff", textAlign: "center" },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#A8D96C", marginTop: 2 },

  tabRow: { flexDirection: "row", backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#D4EDD4" },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 4 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: "#0B3D2E" },
  tabTxt: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#999" },
  tabTxtActive: { fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  badge: { backgroundColor: "#C62828", borderRadius: 10, paddingHorizontal: 5, paddingVertical: 1 },
  badgeTxt: { fontSize: 9, fontFamily: "Poppins_700Bold", color: "#fff" },

  scroll: { padding: 16, paddingBottom: 40 },

  emptyBox: { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 16, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },

  card: {
    backgroundColor: "#fff", borderRadius: 16, padding: 14,
    marginBottom: 12, elevation: 2, borderWidth: 1, borderColor: "#D4EDD4",
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  petAvatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: "#0B3D2E", justifyContent: "center", alignItems: "center",
  },
  petAvatarTxt: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#A8D96C" },
  cardInfo: { flex: 1 },
  petName: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 2 },
  petBreed: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#666" },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  statusTxt: { fontSize: 11, fontFamily: "Poppins_700Bold" },

  divider: { height: 1, backgroundColor: "#F0F7F0", marginBottom: 10 },

  blacklistReasonBox: { backgroundColor: "#FFEBEE", borderRadius: 10, padding: 10, marginBottom: 8 },
  blacklistReasonLabel: { fontSize: 11, fontFamily: "Poppins_700Bold", color: "#C62828", marginBottom: 2 },
  blacklistReasonTxt: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#C62828" },

  reasonBox: { backgroundColor: "#F0F7F0", borderRadius: 10, padding: 10, marginBottom: 8 },
  reasonLabel: { fontSize: 11, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 2 },
  reasonTxt: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#333" },

  ownerRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 6 },
  ownerTxt: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#3E7B27" },
  dot: { fontSize: 11, color: "#ccc" },
  dateTxt: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#999", marginBottom: 10 },

  adminNoteBox: { backgroundColor: "#E8F5E8", borderRadius: 10, padding: 10, marginBottom: 10 },
  adminNoteLabel: { fontSize: 11, fontFamily: "Poppins_700Bold", color: "#3E7B27", marginBottom: 2 },
  adminNoteTxt: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#0B3D2E" },

  reviewBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#0B3D2E", borderRadius: 12, paddingVertical: 11,
  },
  reviewBtnTxt: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#fff" },

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "80%" },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sheetTitle: { fontSize: 17, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  sheetPetName: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#C62828", marginBottom: 12 },
  fieldLabel: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 8 },
  noteInput: {
    backgroundColor: "#F0F7F0", borderRadius: 12, padding: 12,
    fontSize: 13, fontFamily: "Inter_400Regular", color: "#1A1A1A",
    borderWidth: 1, borderColor: "#D4EDD4", minHeight: 80, marginBottom: 16,
  },
  actionRow: { flexDirection: "row", gap: 10 },
  rejectBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    borderWidth: 1.5, borderColor: "#C62828", borderRadius: 12, paddingVertical: 12, backgroundColor: "#FFEBEE",
  },
  rejectBtnTxt: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#C62828" },
  approveBtn: {
    flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    backgroundColor: "#0B3D2E", borderRadius: 12, paddingVertical: 12,
  },
  approveBtnTxt: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#A8D96C" },
});
