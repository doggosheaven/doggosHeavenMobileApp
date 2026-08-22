import { useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Platform, StatusBar,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { getAuth } from "../../utils/authStorage";
import { BASE_URL } from "../../constants/api";
import { ErrorState, EmptyState } from "../../components/ScreenState";

const STATUS_BAR_HEIGHT = Platform.OS === "android" ? (StatusBar.currentHeight || 24) : 44;

const FILTERS = [
  { key: "all", label: "All" },
  { key: "credit", label: "Money in" },
  { key: "debit", label: "Money out" },
];

const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const dayLabel = (d) => {
  const date = new Date(d);
  const today = new Date();
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const timeLabel = (d) =>
  new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

/**
 * The full wallet ledger. Every transaction was already stored on the wallet and
 * sent with it; the wallet screen only ever showed the newest five.
 */
export default function WalletHistory() {
  const router = useRouter();
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState("all");

  const load = useCallback(async () => {
    try {
      const { token } = await getAuth();
      const res = await fetch(`${BASE_URL}/api/v1/wallet`, {
        headers: { Authorization: token || "" },
      });
      const data = await res.json();
      if (data.success) { setWallet(data.wallet); setError(false); }
      else setError(true);
    } catch (e) {
      __DEV__ && console.log(e);
      setError(true);
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const all = wallet?.transactions ? [...wallet.transactions].reverse() : [];
  const shown = filter === "all" ? all : all.filter((t) => t.type === filter);

  const totals = all.reduce(
    (acc, t) => {
      if (t.type === "credit") acc.in += t.amount || 0;
      else acc.out += t.amount || 0;
      return acc;
    },
    { in: 0, out: 0 }
  );

  // Group by day so a long ledger stays readable.
  const groups = [];
  shown.forEach((tx) => {
    const label = dayLabel(tx.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(tx);
    else groups.push({ label, items: [tx] });
  });

  return (
    <View style={s.container}>
      <View style={[s.header, { paddingTop: STATUS_BAR_HEIGHT + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Transaction History</Text>
          <Text style={s.headerSub}>Balance {money(wallet?.balance)}</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0B3D2E" style={{ flex: 1 }} />
      ) : error ? (
        <ErrorState
          message="Could not load your transactions. Check your connection."
          onRetry={() => { setLoading(true); setError(false); load(); }}
        />
      ) : (
        <>
          <View style={s.summaryRow}>
            <View style={s.summaryCard}>
              <View style={[s.summaryIcon, { backgroundColor: "#E8F5E8" }]}>
                <Ionicons name="arrow-down" size={15} color="#2E7D32" />
              </View>
              <View style={s.summaryText}>
                <Text style={[s.summaryVal, { color: "#2E7D32" }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                  {money(totals.in)}
                </Text>
                <Text style={s.summaryLabel}>Added</Text>
              </View>
            </View>
            <View style={s.summaryCard}>
              <View style={[s.summaryIcon, { backgroundColor: "#FFF0F0" }]}>
                <Ionicons name="arrow-up" size={15} color="#C62828" />
              </View>
              <View style={s.summaryText}>
                <Text style={[s.summaryVal, { color: "#C62828" }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                  {money(totals.out)}
                </Text>
                <Text style={s.summaryLabel}>Spent</Text>
              </View>
            </View>
          </View>

          <View style={s.chipRow}>
            {FILTERS.map((f) => (
              <TouchableOpacity
                key={f.key}
                style={[s.chip, filter === f.key && s.chipActive]}
                onPress={() => setFilter(f.key)}
                activeOpacity={0.8}
              >
                <Text style={[s.chipTxt, filter === f.key && s.chipTxtActive]}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView
            contentContainerStyle={s.scroll}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#0B3D2E" />
            }
          >
            {shown.length === 0 ? (
              <EmptyState
                icon="receipt-outline"
                title={filter === "all" ? "No transactions yet" : "Nothing here"}
                subtitle={
                  filter === "all"
                    ? "Recharges and boarding charges will show up here."
                    : "Try a different filter."
                }
                actionLabel={filter === "all" ? "Add money" : "Show all"}
                actionIcon={filter === "all" ? "add-circle-outline" : "list-outline"}
                onAction={() => (filter === "all" ? router.back() : setFilter("all"))}
              />
            ) : (
              groups.map((g) => (
                <View key={g.label} style={s.group}>
                  <Text style={s.groupLabel}>{g.label}</Text>
                  <View style={s.groupCard}>
                    {g.items.map((tx, i) => (
                      <View
                        key={`${g.label}-${i}`}
                        style={[s.txRow, i === g.items.length - 1 && { borderBottomWidth: 0 }]}
                      >
                        <View style={[s.txIcon, { backgroundColor: tx.type === "credit" ? "#E8F5E8" : "#FFF0F0" }]}>
                          <Ionicons
                            name={tx.type === "credit" ? "arrow-down" : "arrow-up"}
                            size={15}
                            color={tx.type === "credit" ? "#2E7D32" : "#C62828"}
                          />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={s.txDesc} numberOfLines={2}>{tx.description}</Text>
                          <Text style={s.txTime}>{timeLabel(tx.createdAt)}</Text>
                        </View>
                        <View style={{ alignItems: "flex-end" }}>
                          <Text
                            style={[s.txAmt, { color: tx.type === "credit" ? "#2E7D32" : "#C62828" }]}
                            numberOfLines={1}
                          >
                            {tx.type === "credit" ? "+" : "−"}{money(tx.amount)}
                          </Text>
                          <Text style={s.txBal}>bal {money(tx.balanceAfter)}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              ))
            )}
            <View style={{ height: 30 }} />
          </ScrollView>
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F7F0" },
  header: {
    backgroundColor: "#0B3D2E", paddingHorizontal: 16, paddingBottom: 16,
    flexDirection: "row", alignItems: "center", gap: 10,
  },
  backBtn: { width: 34, height: 34, justifyContent: "center" },
  headerTitle: { fontSize: 19, fontFamily: "Poppins_700Bold", color: "#fff" },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#A8D96C" },

  summaryRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingTop: 14 },
  summaryCard: {
    flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#fff", borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: "#D4EDD4",
  },
  summaryIcon: {
    width: 32, height: 32, borderRadius: 10,
    justifyContent: "center", alignItems: "center",
  },
  summaryText: { flex: 1, minWidth: 0 },
  summaryVal: { fontSize: 15, fontFamily: "Poppins_700Bold" },
  summaryLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#8A9A8A" },

  chipRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  chip: {
    backgroundColor: "#fff", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7,
    borderWidth: 1, borderColor: "#D4EDD4",
  },
  chipActive: { backgroundColor: "#0B3D2E", borderColor: "#0B3D2E" },
  chipTxt: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#8A9A8A" },
  chipTxtActive: { color: "#A8D96C" },

  scroll: { paddingHorizontal: 16, paddingBottom: 20 },
  group: { marginBottom: 14 },
  groupLabel: {
    fontSize: 11, fontFamily: "Poppins_700Bold", color: "#8A9A8A",
    letterSpacing: 0.8, marginBottom: 6, marginLeft: 2,
  },
  groupCard: {
    backgroundColor: "#fff", borderRadius: 14, paddingHorizontal: 12,
    borderWidth: 1, borderColor: "#D4EDD4",
  },
  txRow: {
    flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: "#E8F5E8",
  },
  txIcon: { width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  txDesc: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#1A1A1A" },
  txTime: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#8A9A8A", marginTop: 1 },
  txAmt: { fontSize: 14, fontFamily: "Poppins_700Bold" },
  txBal: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#8A9A8A" },
});
