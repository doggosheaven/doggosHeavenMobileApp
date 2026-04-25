import { useState, useEffect } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getAuth } from "../../utils/authStorage";
import { BASE_URL } from "../../constants/api";
import { useApp } from "../../context/AppContext";

let RazorpayCheckout = null;
try { RazorpayCheckout = require("react-native-razorpay").default; } catch {}

const SUBSCRIPTION_AMOUNT = 11500;

export default function WalletScreen() {
  const router = useRouter();
  const [paying, setPaying] = useState(false);
  const [auth, setAuth] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const { wallet, loadWallet } = useApp();

  useEffect(() => {
    loadWallet();
    getAuth().then(({ user, token }) => setAuth({ user, token }));
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadWallet(true);
    setRefreshing(false);
  };

  const loading = !wallet && !refreshing;

  const handleAddMoney = async () => {
    if (!RazorpayCheckout) {
      Alert.alert("Not Supported", "Online payment requires a development build.");
      return;
    }

    setPaying(true);
    try {
      const orderRes = await fetch(`${BASE_URL}/api/v1/wallet/recharge/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: auth.token || "" },
        body: JSON.stringify({ amount: SUBSCRIPTION_AMOUNT }),
      });
      const orderData = await orderRes.json();
      if (!orderData.success) throw new Error(orderData.message);

      const paymentData = await RazorpayCheckout.open({
        key: orderData.key,
        order_id: orderData.order.id,
        amount: SUBSCRIPTION_AMOUNT * 100,
        currency: "INR",
        name: "Doggos Heaven",
        description: "15-Day Boarding Plan — Wallet Recharge",
        prefill: { name: auth.user?.fullName || "", email: auth.user?.email || "" },
        theme: { color: "#0B3D2E" },
      });

      const verifyRes = await fetch(`${BASE_URL}/api/v1/wallet/recharge/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: auth.token || "" },
        body: JSON.stringify({ ...paymentData, amount: SUBSCRIPTION_AMOUNT }),
      });
      const verifyData = await verifyRes.json();
      if (verifyData.success) {
        Alert.alert("✅ Money Added!", `₹${SUBSCRIPTION_AMOUNT.toLocaleString()} added to your wallet.`);
        loadWallet(true);
      } else {
        Alert.alert("Failed", verifyData.message);
      }
    } catch (e) {
      if (e?.code !== 0) Alert.alert("Error", e.message || "Payment failed");
    } finally {
      setPaying(false);
    }
  };

  const formatDate = (d) => {
    const date = new Date(d);
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) +
      " · " + date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  };

  if (loading)
    return <View style={s.center}><ActivityIndicator size="large" color="#0B3D2E" /></View>;

  const balance = wallet?.balance || 0;

  const recentTx = wallet?.transactions ? [...wallet.transactions].reverse().slice(0, 5) : [];

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.8}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>My Wallet</Text>
        <View style={{ width: 36 }} />
      </View>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0B3D2E" />}
      >

        {/* Balance Card */}
        <View style={s.balanceCard}>
          <View style={s.balanceTop}>
            <View>
              <Text style={s.balanceLabel}>Doggos Heaven Wallet</Text>
              <Text style={s.balanceAmount}>₹{balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</Text>
            </View>
            <View style={s.walletIconBox}>
              <Ionicons name="wallet" size={28} color="#A8D96C" />
            </View>
          </View>
          <View style={s.balanceDivider} />
          <View style={s.balanceBottom}>
            <Ionicons name="shield-checkmark-outline" size={13} color="#A8D96C" />
            <Text style={s.balanceSecure}>Secured · Instant deduction for boarding</Text>
          </View>
        </View>

        {/* Add Money — Fixed 11500 only */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Add Money to Wallet</Text>

          <View style={s.planCard}>
            <View style={s.planBadge}>
              <Text style={s.planBadgeTxt}>🐾 15-DAY BOARDING PLAN</Text>
            </View>
            <View style={s.planRow}>
              <View>
                <Text style={s.planAmount}>₹11,500</Text>
                <Text style={s.planSub}>₹766/day per pet</Text>
              </View>
              <View style={s.planFeatures}>
                <View style={s.planFeatureRow}>
                  <Ionicons name="checkmark-circle" size={13} color="#3E7B27" />
                  <Text style={s.planFeatureTxt}>Daily auto-deduction</Text>
                </View>
                <View style={s.planFeatureRow}>
                  <Ionicons name="checkmark-circle" size={13} color="#3E7B27" />
                  <Text style={s.planFeatureTxt}>Multi-pet support</Text>
                </View>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[s.addMoneyBtn, paying && s.addMoneyBtnDisabled]}
            onPress={handleAddMoney}
            disabled={paying}
            activeOpacity={0.85}
          >
            {paying ? (
              <ActivityIndicator size="small" color="#0B3D2E" />
            ) : (
              <>
                <Ionicons name="add-circle" size={20} color="#0B3D2E" />
                <Text style={s.addMoneyBtnText}>Add ₹11,500 to Wallet</Text>
              </>
            )}
          </TouchableOpacity>
          <Text style={s.payNote}>Powered by Razorpay · UPI, Cards, Net Banking</Text>
        </View>

        {/* Recent Transactions */}
        {recentTx.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHeaderRow}>
              <Text style={s.sectionTitle}>Recent Transactions</Text>
            </View>
            {recentTx.map((tx, i) => (
              <View key={i} style={[s.txRow, i === recentTx.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={[s.txIconBox, { backgroundColor: tx.type === "credit" ? "#E8F5E8" : "#FFF0F0" }]}>
                  <Ionicons
                    name={tx.type === "credit" ? "arrow-down" : "arrow-up"}
                    size={16}
                    color={tx.type === "credit" ? "#2E7D32" : "#C62828"}
                  />
                </View>
                <View style={s.txInfo}>
                  <Text style={s.txDesc} numberOfLines={1}>{tx.description}</Text>
                  <Text style={s.txDate}>{formatDate(tx.createdAt)}</Text>
                </View>
                <View style={s.txRight}>
                  <Text style={[s.txAmount, { color: tx.type === "credit" ? "#2E7D32" : "#C62828" }]}>
                    {tx.type === "credit" ? "+" : "−"}₹{tx.amount.toFixed(0)}
                  </Text>
                  <Text style={s.txBal}>₹{tx.balanceAfter.toFixed(0)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {recentTx.length === 0 && (
          <View style={s.emptyTx}>
            <Ionicons name="receipt-outline" size={36} color="#D4EDD4" />
            <Text style={s.emptyTxText}>No transactions yet</Text>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F7F0" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: { padding: 16, paddingBottom: 48 },

  header: {
    backgroundColor: "#0B3D2E", paddingHorizontal: 16,
    paddingTop: 12, paddingBottom: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  backBtn: { width: 36, height: 36, justifyContent: "center" },
  headerTitle: { fontSize: 18, fontFamily: "Poppins_700Bold", color: "#fff", flex: 1, textAlign: "center" },

  balanceCard: {
    backgroundColor: "#0B3D2E", borderRadius: 20, padding: 20,
    marginBottom: 14, elevation: 4,
  },
  balanceTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  balanceLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#A8D96C", marginBottom: 6 },
  balanceAmount: { fontSize: 36, fontFamily: "Poppins_700Bold", color: "#fff" },
  walletIconBox: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: "rgba(168,217,108,0.15)",
    justifyContent: "center", alignItems: "center",
  },
  balanceDivider: { height: 1, backgroundColor: "rgba(168,217,108,0.2)", marginBottom: 12 },
  balanceBottom: { flexDirection: "row", alignItems: "center", gap: 6 },
  balanceSecure: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(168,217,108,0.8)" },

  section: {
    backgroundColor: "#fff", borderRadius: 18, padding: 16,
    marginBottom: 14, elevation: 2, borderWidth: 1, borderColor: "#E8F5E8",
  },
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  sectionTitle: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 14 },

  planCard: {
    backgroundColor: "#F0F7F0", borderRadius: 14, padding: 14,
    borderWidth: 1.5, borderColor: "#A8D96C", marginBottom: 16,
  },
  planBadge: {
    backgroundColor: "#E8F5E8", alignSelf: "flex-start",
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginBottom: 10,
  },
  planBadgeTxt: { fontSize: 10, fontFamily: "Poppins_700Bold", color: "#3E7B27" },
  planRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  planAmount: { fontSize: 28, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  planSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#3E7B27", marginTop: 2 },
  planFeatures: { gap: 6 },
  planFeatureRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  planFeatureTxt: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#444" },

  addMoneyBtn: {
    backgroundColor: "#A8D96C", borderRadius: 14, height: 52,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, elevation: 2,
  },
  addMoneyBtnDisabled: { opacity: 0.5 },
  addMoneyBtnText: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  payNote: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#aaa", textAlign: "center", marginTop: 8 },

  txRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F5FFF5",
  },
  txIconBox: { width: 38, height: 38, borderRadius: 19, justifyContent: "center", alignItems: "center" },
  txInfo: { flex: 1 },
  txDesc: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#1A1A1A", marginBottom: 2 },
  txDate: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#aaa" },
  txRight: { alignItems: "flex-end" },
  txAmount: { fontSize: 14, fontFamily: "Poppins_700Bold" },
  txBal: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#bbb", marginTop: 2 },

  emptyTx: { alignItems: "center", paddingVertical: 24, gap: 8 },
  emptyTxText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#bbb" },
});
