import { useState, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Header from "../../components/Header";
import { getAuth } from "../../utils/authStorage";
import { BASE_URL } from "../../constants/api";
import { initiatePayment } from "../../utils/paymentHelper";

const TYPE_CONFIG = {
  confirmed:        { icon: "checkmark-circle", color: "#3E7B27" },
  completed:        { icon: "ribbon",            color: "#0B3D2E" },
  cancelled:        { icon: "close-circle",      color: "#C62828" },
  pending:          { icon: "time",              color: "#F59E0B" },
  visit:            { icon: "paw",               color: "#1A5C3A" },
  prescription:     { icon: "medical",           color: "#7B2D8B" },
  blacklist:        { icon: "ban",               color: "#C62828" },
  unblocked:        { icon: "checkmark-circle",  color: "#3E7B27" },
  unblock_rejected: { icon: "close-circle",      color: "#C62828" },
};

const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [readIds, setReadIds] = useState(new Set());
  const [payingId, setPayingId] = useState(null);
  const [authData, setAuthData] = useState({ user: null, token: null });
  const [storageKey, setStorageKey] = useState(null);

  // Load persisted read IDs from AsyncStorage (user-specific)
  const loadReadIds = async (key) => {
    try {
      const stored = await AsyncStorage.getItem(key);
      if (stored) return new Set(JSON.parse(stored));
    } catch (_) {}
    return new Set();
  };

  // Save read IDs to AsyncStorage
  const saveReadIds = async (ids, key) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify([...ids]));
    } catch (_) {}
  };

  const fetchNotifications = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const { user, token } = await getAuth();
      setAuthData({ user, token });
      if (!user?.id) return;
      const key = `notif_read_ids_${user.id}`;
      setStorageKey(key);
      const [res, persistedIds] = await Promise.all([
        fetch(`${BASE_URL}/api/v1/customerappointment/notifications/${user.id}`, {
          headers: { Authorization: token || "" },
        }),
        loadReadIds(key),
      ]);
      const data = await res.json();
      if (data.success) {
        const notifs = data.notifications || [];
        setNotifications(notifs);
        // Mark visit notifications as read on server
        fetch(`${BASE_URL}/api/v1/customerappointment/notifications/${user.id}/markread`, {
          method: "PATCH",
          headers: { Authorization: token || "" },
        }).catch(() => {});
        // Merge: visit notifs (server read) + persisted appointment read IDs
        const visitReadIds = notifs
          .filter((n) => n.source === "visit" && n.read !== false)
          .map((n) => String(n.id));
        const merged = new Set([...persistedIds, ...visitReadIds]);
        setReadIds(merged);
      }
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchNotifications(); }, []);

  const markRead = (id) => {
    setReadIds((prev) => {
      const next = new Set([...prev, String(id)]);
      if (storageKey) saveReadIds(next, storageKey);
      return next;
    });
  };

  const markAllRead = () => {
    setReadIds((prev) => {
      const next = new Set(notifications.map((n) => String(n.id)));
      if (storageKey) saveReadIds(next, storageKey);
      return next;
    });
  };

  const isRead = (id) => readIds.has(String(id));
  const unreadCount = notifications.filter((n) => !isRead(n.id)).length;

  const handlePayNow = async (notif, apptId, amount) => {
    setPayingId(notif.id);
    try {
      const { token } = authData;
      const res = await fetch(`${BASE_URL}/api/v1/customerappointment/getaappointbyid/${apptId}`, {
        headers: { Authorization: token || "" },
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { throw new Error("Server error. Please try again."); }
      if (!data.success) throw new Error(data.message);
      const appt = data.data;
      if (appt.paymentStatus === "paid") {
        Alert.alert("Already Paid", "This appointment has already been paid.");
        return;
      }
      const finalAmount = appt.totalAmount || amount;
      if (!finalAmount || finalAmount <= 0) {
        Alert.alert("Error", "Payment amount not set. Please contact staff.");
        return;
      }
      await initiatePayment({
        appointmentId: appt._id,
        amount: finalAmount,
        serviceName: appt.serviceName,
        user: authData.user,
        token,
        onSuccess: () => fetchNotifications(true),
        onRefresh: () => fetchNotifications(true),
      });
    } catch (e) {
      Alert.alert("Error", e.message || "Something went wrong");
    } finally {
      setPayingId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="Notifications" showBack />
        <ActivityIndicator size="large" color="#0B3D2E" style={{ flex: 1 }} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Notifications" showBack />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchNotifications(true)} tintColor="#0B3D2E" />}
      >
        <View style={styles.topRow}>
          <Text style={styles.countText}>
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up!"}
          </Text>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={markAllRead}>
              <Text style={styles.markAllText}>Mark all as read</Text>
            </TouchableOpacity>
          )}
        </View>

        {notifications.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="notifications-off-outline" size={48} color="#A8D96C" />
            <Text style={styles.emptyTitle}>No Notifications</Text>
            <Text style={styles.emptySub}>Your booking updates will appear here</Text>
          </View>
        ) : (
          notifications.map((notif) => {
            const config = TYPE_CONFIG[notif.type] || TYPE_CONFIG.pending;
            const read = isRead(notif.id);

            // Case 1: Appointment confirmed (source=appointment, type=confirmed)
            const isApptConfirmed = notif.source === "appointment" &&
              notif.type === "confirmed" &&
              notif.paymentStatus !== "paid";

            // Case 2: set custom amount by staff (source=visit, purpose=confirmed)
            const isVisitConfirmed = notif.source === "visit" &&
              notif.purpose === "confirmed" &&
              !!notif.appointmentId;

            const showPayBtn = (isApptConfirmed || isVisitConfirmed) &&
              Number(notif.amount) > 0;

            const payAmount = Number(notif.amount) || 0;
            const payApptId = notif.source === "visit" ? notif.appointmentId : String(notif.id);
            return (
              <TouchableOpacity
                key={String(notif.id)}
                style={[styles.card, !read && styles.cardUnread]}
                onPress={() => {
                  markRead(notif.id);
                  if (notif.purpose === "prescription") {
                    router.push("/screens/myprescriptions");
                  } else if (notif.source === "visit" && notif.visitId) {
                    router.push({
                      pathname: "/screens/visitdetail",
                      params: { visitId: notif.visitId, purpose: notif.purpose, petName: notif.petName },
                    });
                  }
                }}
                activeOpacity={0.8}
              >
                <View style={[styles.iconBox, { backgroundColor: config.color }]}>
                  <Ionicons name={config.icon} size={20} color="#fff" />
                </View>
                <View style={styles.cardContent}>
                  <View style={styles.cardTop}>
                    <Text style={styles.cardTitle}>{notif.title}</Text>
                    {!read && <View style={styles.unreadDot} />}
                  </View>
                  <Text style={styles.cardBody}>{notif.body}</Text>
                  {notif.amount > 0 && notif.type === "confirmed" && (
                    <Text style={styles.amountText}>Amount: ₹{notif.amount}</Text>
                  )}
                  <Text style={styles.cardTime}>{timeAgo(notif.time)}</Text>

                  {showPayBtn && (
                    <TouchableOpacity
                      style={styles.payBtn}
                      onPress={() => handlePayNow(notif, payApptId, payAmount)}
                      activeOpacity={0.8}
                      disabled={payingId === notif.id}
                    >
                      {payingId === notif.id ? (
                        <ActivityIndicator size="small" color="#0B3D2E" />
                      ) : (
                        <>
                          <Ionicons name="card" size={15} color="#0B3D2E" />
                          <Text style={styles.payBtnText}>Pay Now ₹{payAmount}</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}

                  {notif.type === "confirmed" && notif.paymentStatus === "paid" && (
                    <View style={styles.paidBadge}>
                      <Ionicons name="checkmark-circle" size={13} color="#2E7D32" />
                      <Text style={styles.paidText}>Payment Done</Text>
                    </View>
                  )}

                  {notif.source === "visit" && notif.visitId && (
                    <View style={styles.viewDetailHint}>
                      <Ionicons name="eye-outline" size={13} color="#1A5C3A" />
                      <Text style={styles.viewDetailHintTxt}>Tap to view visit details</Text>
                    </View>
                  )}
                  {notif.purpose === "prescription" && (
                    <View style={styles.viewDetailHint}>
                      <Ionicons name="medical-outline" size={13} color="#7B2D8B" />
                      <Text style={[styles.viewDetailHintTxt, { color: "#7B2D8B" }]}>Tap to view prescriptions</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F7F0" },
  scroll: { padding: 16, paddingBottom: 40 },

  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  countText: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  markAllText: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#3E7B27" },

  emptyBox: { alignItems: "center", paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginTop: 12, marginBottom: 6 },
  emptySub: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#999" },

  card: {
    backgroundColor: "#fff", borderRadius: 16, padding: 14,
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    marginBottom: 10, elevation: 2,
    borderWidth: 1, borderColor: "#D4EDD4",
  },
  cardUnread: { borderColor: "#A8D96C", backgroundColor: "#F8FFF8" },
  iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  cardContent: { flex: 1 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  cardTitle: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#0B3D2E", flex: 1 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#3E7B27", marginLeft: 8 },
  cardBody: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#555", lineHeight: 18, marginBottom: 4 },
  amountText: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 4 },
  cardTime: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#999", marginBottom: 8 },

  payBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    backgroundColor: "#A8D96C", borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 16,
  },
  payBtnText: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },

  paidBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#E8F5E8", alignSelf: "flex-start",
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  paidText: { fontSize: 11, fontFamily: "Poppins_700Bold", color: "#2E7D32" },

  viewDetailHint: {
    flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6,
  },
  viewDetailHintTxt: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#1A5C3A" },
});
