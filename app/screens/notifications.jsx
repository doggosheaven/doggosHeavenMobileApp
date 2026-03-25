import { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Header from "../../components/Header";
import { getAuth } from "../../utils/authStorage";
import { BASE_URL } from "../../constants/api";

const TYPE_CONFIG = {
  confirmed: { icon: "checkmark-circle", color: "#3E7B27" },
  completed: { icon: "ribbon", color: "#0B3D2E" },
  cancelled: { icon: "close-circle", color: "#C62828" },
  pending:   { icon: "time", color: "#F59E0B" },
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
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [readIds, setReadIds] = useState(new Set());

  const fetchNotifications = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const { user, token } = await getAuth();
      if (!user?.id) return;
      const res = await fetch(`${BASE_URL}/api/v1/customerappointment/notifications/${user.id}`, {
        headers: { Authorization: token || "" },
      });
      const data = await res.json();
      if (data.success) setNotifications(data.notifications || []);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchNotifications(); }, []);

  const markRead = (id) => setReadIds((prev) => new Set([...prev, id]));
  const markAllRead = () => setReadIds(new Set(notifications.map((n) => n.id)));

  const isRead = (id) => readIds.has(String(id));
  const unreadCount = notifications.filter((n) => !isRead(n.id)).length;

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
            return (
              <TouchableOpacity
                key={String(notif.id)}
                style={[styles.card, !read && styles.cardUnread]}
                onPress={() => markRead(notif.id)}
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
                  <Text style={styles.cardTime}>{timeAgo(notif.time)}</Text>
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
  cardBody: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#555", lineHeight: 18, marginBottom: 6 },
  cardTime: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#999" },
});
