import { useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import RazorpayCheckout from "react-native-razorpay";
import Header from "../../components/Header";
import { getAuth } from "../../utils/authStorage";
import { BASE_URL } from "../../constants/api";

const QUICK_AMOUNTS = [100, 500, 1000, 2000, 5000, 11500];

export default function WalletScreen() {
  const router = useRouter();
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [customAmount, setCustomAmount] = useState("");
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [paying, setPaying] = useState(false);
  const [auth, setAuth] = useState({});

  const load = useCallback(async () => {
    const { user, token } = await getAuth();
    setAuth({ user, token });
    try {
      const res = await fetch(`${BASE_URL}/api/v1/wallet`, {
        headers: { Authorization: token || "" },
      });
      const data = await res.json();
      if (data.success) setWallet(data.wallet);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const getFinalAmount = () => {
    if (customAmount) return parseFloat(customAmount);
    return selectedAmount;
  };

  const handleAddMoney = async () => {
    const amount = getFinalAmount();
    if (!amount || amount < 1)
      return Alert.alert("Invalid Amount", "Please select or enter an amount.");

    setPaying(true);
    try {
      const orderRes = await fetch(`${BASE_URL}/api/v1/wallet/recharge/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: auth.token || "" },
        body: JSON.stringify({ amount }),
      });
      const orderData = await orderRes.json();
      if (!orderData.success) throw new Error(orderData.message);

      const paymentData = await RazorpayCheckout.open({
        key: orderData.key,
        order_id: orderData.order.id,
        amount: amount * 100,
        currency: "INR",
        name: "Doggos Heaven",
        description: "Wallet Recharge",
        prefill: { name: auth.user?.fullName || "", email: auth.user?.email || "" },
        theme: { color: "#0B3D2E" },
      });

      const verifyRes = await fetch(`${BASE_URL}/api/v1/wallet/recharge/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: auth.token || "" },
        body: JSON.stringify({ ...paymentData, amount }),
      });
      const verifyData = await verifyRes.json();
      if (verifyData.success) {
        Alert.alert("✅ Money Added!", `₹${amount} added to your wallet.`);
        setCustomAmount("");
        setSelectedAmount(null);
        load();
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

  const recentTx = wallet?.transactions ? [...wallet.transactions].reverse().slice(0, 5) : [];

  if (loading)
    return <View style={styles.center}><ActivityIndicator size="large" color="#0B3D2E" /></View>;

  const balance = wallet?.balance || 0;

  return (
    <View style={styles.container}>
      <Header title="My Wallet" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceTop}>
            <View>
              <Text style={styles.balanceLabel}>Doggos Heaven Wallet</Text>
              <Text style={styles.balanceAmount}>₹{balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</Text>
            </View>
            <View style={styles.walletIconBox}>
              <Ionicons name="wallet" size={28} color="#A8D96C" />
            </View>
          </View>
          <View style={styles.balanceDivider} />
          <View style={styles.balanceBottom}>
            <Ionicons name="shield-checkmark-outline" size={13} color="#A8D96C" />
            <Text style={styles.balanceSecure}>Secured · Instant deduction for boarding</Text>
          </View>
        </View>

        {/* Boarding Subscribe Card */}
        <TouchableOpacity
          style={styles.subscribeCard}
          onPress={() => router.push("/screens/subscriptiondetail")}
          activeOpacity={0.88}
        >
          <View style={styles.subscribeLeft}>
            <View style={styles.subscribeBadge}>
              <Text style={styles.subscribeBadgeText}>🐾 SUBSCRIPTION</Text>
            </View>
            <Text style={styles.subscribeTitle}>15-Day Boarding Plan</Text>
            <Text style={styles.subscribePrice}>₹11,500 <Text style={styles.subscribePriceSub}>per pet · ₹766/day</Text></Text>
            <View style={styles.subscribeFeatures}>
              <View style={styles.subscribeFeatureRow}>
                <Ionicons name="checkmark-circle" size={13} color="#A8D96C" />
                <Text style={styles.subscribeFeatureText}>Daily auto-deduction from wallet</Text>
              </View>
              <View style={styles.subscribeFeatureRow}>
                <Ionicons name="checkmark-circle" size={13} color="#A8D96C" />
                <Text style={styles.subscribeFeatureText}>Multi-pet support</Text>
              </View>
            </View>
          </View>
          <View style={styles.subscribeRight}>
            <Text style={styles.subscribeArrow}>→</Text>
            <Text style={styles.subscribeBtn}>Subscribe</Text>
          </View>
        </TouchableOpacity>

        {/* Add Money Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add Money</Text>

          {/* Quick amount chips */}
          <View style={styles.quickGrid}>
            {QUICK_AMOUNTS.map((a) => (
              <TouchableOpacity
                key={a}
                style={[styles.quickChip, selectedAmount === a && !customAmount && styles.quickChipActive]}
                onPress={() => { setSelectedAmount(a); setCustomAmount(""); }}
                activeOpacity={0.8}
              >
                <Text style={[styles.quickChipText, selectedAmount === a && !customAmount && styles.quickChipTextActive]}>
                  ₹{a.toLocaleString()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Custom amount input */}
          <View style={styles.inputRow}>
            <View style={styles.inputBox}>
              <Text style={styles.inputPrefix}>₹</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter amount"
                placeholderTextColor="#bbb"
                keyboardType="numeric"
                value={customAmount}
                onChangeText={(v) => { setCustomAmount(v); setSelectedAmount(null); }}
              />
              {customAmount ? (
                <TouchableOpacity onPress={() => setCustomAmount("")}>
                  <Ionicons name="close-circle" size={18} color="#ccc" />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {/* Selected amount preview */}
          {(getFinalAmount() > 0) && (
            <View style={styles.amountPreview}>
              <Text style={styles.amountPreviewText}>Adding </Text>
              <Text style={styles.amountPreviewVal}>₹{getFinalAmount()?.toLocaleString()}</Text>
              <Text style={styles.amountPreviewText}> to wallet</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.addMoneyBtn, (paying || !getFinalAmount()) && styles.addMoneyBtnDisabled]}
            onPress={handleAddMoney}
            disabled={paying || !getFinalAmount()}
            activeOpacity={0.85}
          >
            {paying ? (
              <ActivityIndicator size="small" color="#0B3D2E" />
            ) : (
              <>
                <Ionicons name="add-circle" size={20} color="#0B3D2E" />
                <Text style={styles.addMoneyBtnText}>
                  {getFinalAmount() ? `Add ₹${getFinalAmount()?.toLocaleString()}` : "Add Money"}
                </Text>
              </>
            )}
          </TouchableOpacity>
          <Text style={styles.payNote}>Powered by Razorpay · UPI, Cards, Net Banking</Text>
        </View>

        {/* Recent Transactions */}
        {recentTx.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Recent Transactions</Text>
              {wallet?.transactions?.length > 5 && (
                <TouchableOpacity>
                  <Text style={styles.viewAllLink}>View All</Text>
                </TouchableOpacity>
              )}
            </View>
            {recentTx.map((tx, i) => (
              <View key={i} style={[styles.txRow, i === recentTx.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={[styles.txIconBox, { backgroundColor: tx.type === "credit" ? "#E8F5E8" : "#FFF0F0" }]}>
                  <Ionicons
                    name={tx.type === "credit" ? "arrow-down" : "arrow-up"}
                    size={16}
                    color={tx.type === "credit" ? "#2E7D32" : "#C62828"}
                  />
                </View>
                <View style={styles.txInfo}>
                  <Text style={styles.txDesc} numberOfLines={1}>{tx.description}</Text>
                  <Text style={styles.txDate}>{formatDate(tx.createdAt)}</Text>
                </View>
                <View style={styles.txRight}>
                  <Text style={[styles.txAmount, { color: tx.type === "credit" ? "#2E7D32" : "#C62828" }]}>
                    {tx.type === "credit" ? "+" : "−"}₹{tx.amount.toFixed(0)}
                  </Text>
                  <Text style={styles.txBal}>₹{tx.balanceAfter.toFixed(0)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {recentTx.length === 0 && (
          <View style={styles.emptyTx}>
            <Ionicons name="receipt-outline" size={36} color="#D4EDD4" />
            <Text style={styles.emptyTxText}>No transactions yet</Text>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F7F0" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: { padding: 16, paddingBottom: 48 },

  // Balance Card
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

  // Subscribe Card
  subscribeCard: {
    backgroundColor: "#1A5C3A", borderRadius: 18, padding: 18,
    flexDirection: "row", alignItems: "center",
    marginBottom: 14, elevation: 3,
    borderWidth: 1.5, borderColor: "#A8D96C",
  },
  subscribeLeft: { flex: 1 },
  subscribeBadge: {
    backgroundColor: "rgba(168,217,108,0.2)", alignSelf: "flex-start",
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, marginBottom: 8,
  },
  subscribeBadgeText: { fontSize: 10, fontFamily: "Poppins_700Bold", color: "#A8D96C" },
  subscribeTitle: { fontSize: 17, fontFamily: "Poppins_700Bold", color: "#fff", marginBottom: 4 },
  subscribePrice: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#A8D96C", marginBottom: 10 },
  subscribePriceSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(168,217,108,0.7)" },
  subscribeFeatures: { gap: 4 },
  subscribeFeatureRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  subscribeFeatureText: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)" },
  subscribeRight: { alignItems: "center", gap: 6, marginLeft: 12 },
  subscribeArrow: { fontSize: 22, color: "#A8D96C", fontFamily: "Poppins_700Bold" },
  subscribeBtn: {
    fontSize: 11, fontFamily: "Poppins_700Bold", color: "#0B3D2E",
    backgroundColor: "#A8D96C", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
  },

  // Section
  section: {
    backgroundColor: "#fff", borderRadius: 18, padding: 16,
    marginBottom: 14, elevation: 2, borderWidth: 1, borderColor: "#E8F5E8",
  },
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  sectionTitle: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 14 },
  viewAllLink: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#3E7B27" },

  // Quick chips
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  quickChip: {
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 24,
    borderWidth: 1.5, borderColor: "#D4EDD4", backgroundColor: "#F0F7F0",
  },
  quickChipActive: { backgroundColor: "#0B3D2E", borderColor: "#0B3D2E" },
  quickChipText: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  quickChipTextActive: { color: "#A8D96C" },

  // Input
  inputRow: { marginBottom: 12 },
  inputBox: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#F0F7F0", borderRadius: 14, paddingHorizontal: 14, height: 52,
    borderWidth: 1.5, borderColor: "#D4EDD4",
  },
  inputPrefix: { fontSize: 18, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginRight: 6 },
  input: { flex: 1, fontSize: 16, fontFamily: "Poppins_700Bold", color: "#1A1A1A" },

  amountPreview: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    marginBottom: 12,
  },
  amountPreviewText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#666" },
  amountPreviewVal: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },

  addMoneyBtn: {
    backgroundColor: "#A8D96C", borderRadius: 14, height: 52,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, elevation: 2,
  },
  addMoneyBtnDisabled: { opacity: 0.5 },
  addMoneyBtnText: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  payNote: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#aaa", textAlign: "center", marginTop: 8 },

  // Transactions
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
