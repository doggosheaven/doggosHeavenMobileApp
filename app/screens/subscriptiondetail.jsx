import { useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import RazorpayCheckout from "react-native-razorpay";
import Header from "../../components/Header";
import { getAuth } from "../../utils/authStorage";
import { BASE_URL } from "../../constants/api";

const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 11500];

export default function SubscriptionDetailScreen() {
  const [auth, setAuth] = useState({});
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [customAmount, setCustomAmount] = useState("");
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [paying, setPaying] = useState(false);

  const load = useCallback(async () => {
    const { user, token } = await getAuth();
    setAuth({ user, token });
    try {
      const res = await fetch(`${BASE_URL}/api/v1/wallet`, {
        headers: { Authorization: token || "" },
      });
      const data = await res.json();
      if (data.success) setWallet(data.wallet);
    } catch (e) { console.log(e); }
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const getFinalAmount = () => customAmount ? parseFloat(customAmount) : selectedAmount;

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

      if (!RazorpayCheckout || !RazorpayCheckout.open) {
        Alert.alert("Not Supported", "Payment is only available in the production build, not Expo Go.");
        setPaying(false);
        return;
      }

      const paymentData = await RazorpayCheckout.open({
        key: orderData.key,
        order_id: orderData.order.id,
        amount: amount * 100,
        currency: "INR",
        name: "Doggos Heaven",
        description: "Wallet Recharge - 15 Day Boarding Plan",
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
      if (e?.code !== 0) Alert.alert("Payment Failed", e.message || "Something went wrong");
    } finally {
      setPaying(false);
    }
  };

  if (loading)
    return <View style={s.center}><ActivityIndicator size="large" color="#0B3D2E" /></View>;

  const balance = wallet?.balance || 0;

  return (
    <View style={s.container}>
      <Header title="Boarding Subscription" />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero Plan Card */}
        <View style={s.hero}>
          <Text style={s.heroEmoji}>🏠</Text>
          <Text style={s.heroTitle}>15-Day Boarding Plan</Text>
          <Text style={s.heroPrice}>₹11,500</Text>
          <Text style={s.heroSub}>per pet · ₹766/day · 15 days</Text>
          <View style={s.heroBadge}>
            <Ionicons name="shield-checkmark" size={13} color="#0B3D2E" />
            <Text style={s.heroBadgeText}>Wallet-based daily deduction</Text>
          </View>
        </View>

        {/* Plan Features */}
        <View style={s.card}>
          <Text style={s.cardTitle}>What's Included</Text>
          {[
            { icon: "home-outline", text: "15 days premium boarding" },
            { icon: "wallet-outline", text: "Daily ₹766/pet auto-deducted from wallet" },
            { icon: "paw-outline", text: "Multi-pet support" },
            { icon: "notifications-outline", text: "Low balance alerts" },
            { icon: "close-circle-outline", text: "Deboard anytime from app" },
          ].map((f) => (
            <View key={f.text} style={s.featureRow}>
              <View style={s.featureIcon}>
                <Ionicons name={f.icon} size={16} color="#0B3D2E" />
              </View>
              <Text style={s.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>

        {/* How it works */}
        <View style={s.card}>
          <Text style={s.cardTitle}>How It Works</Text>
          {[
            { step: "1", text: "Add money to your wallet below" },
            { step: "2", text: "Go to Boarding section & select your pets" },
            { step: "3", text: "₹766/day per pet auto-deducted daily" },
            { step: "4", text: "Deboard anytime from the Boarding screen" },
          ].map((item) => (
            <View key={item.step} style={s.stepRow}>
              <View style={s.stepNum}><Text style={s.stepNumText}>{item.step}</Text></View>
              <Text style={s.stepText}>{item.text}</Text>
            </View>
          ))}
        </View>

        {/* Wallet Balance */}
        <View style={s.walletBox}>
          <View style={s.walletBoxLeft}>
            <Ionicons name="wallet" size={22} color="#0B3D2E" />
            <View>
              <Text style={s.walletBoxLabel}>Current Wallet Balance</Text>
              <Text style={s.walletBoxVal}>₹{balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</Text>
            </View>
          </View>
          {balance < 11500 && (
            <View style={s.lowBadge}>
              <Text style={s.lowBadgeText}>Low</Text>
            </View>
          )}
        </View>

        {/* Add Money */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Add Money to Wallet</Text>
          <Text style={s.cardSub}>Minimum ₹11,500 recommended for 1 pet (15 days)</Text>

          <View style={s.quickGrid}>
            {QUICK_AMOUNTS.map((a) => (
              <TouchableOpacity
                key={a}
                style={[s.chip, selectedAmount === a && !customAmount && s.chipActive]}
                onPress={() => { setSelectedAmount(a); setCustomAmount(""); }}
                activeOpacity={0.8}
              >
                <Text style={[s.chipText, selectedAmount === a && !customAmount && s.chipTextActive]}>
                  ₹{a.toLocaleString()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={s.inputBox}>
            <Text style={s.inputPrefix}>₹</Text>
            <TextInput
              style={s.input}
              placeholder="Enter custom amount"
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

          {getFinalAmount() > 0 && (
            <View style={s.previewRow}>
              <Text style={s.previewText}>Adding to wallet:</Text>
              <Text style={s.previewAmt}>₹{getFinalAmount()?.toLocaleString()}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[s.payBtn, (paying || !getFinalAmount()) && s.payBtnDis]}
            onPress={handleAddMoney}
            disabled={paying || !getFinalAmount()}
            activeOpacity={0.85}
          >
            {paying ? (
              <ActivityIndicator size="small" color="#0B3D2E" />
            ) : (
              <>
                <Ionicons name="card-outline" size={20} color="#0B3D2E" />
                <Text style={s.payBtnText}>
                  {getFinalAmount() ? `Add ₹${getFinalAmount()?.toLocaleString()} to Wallet` : "Add Money to Wallet"}
                </Text>
              </>
            )}
          </TouchableOpacity>
          <Text style={s.payNote}>Secured by Razorpay · UPI, Cards, Net Banking</Text>
        </View>

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F7F0" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: { padding: 16, paddingBottom: 48 },

  hero: {
    backgroundColor: "#0B3D2E", borderRadius: 20, padding: 28,
    alignItems: "center", marginBottom: 14, elevation: 4,
  },
  heroEmoji: { fontSize: 48, marginBottom: 10 },
  heroTitle: { fontSize: 20, fontFamily: "Poppins_700Bold", color: "#fff", marginBottom: 6 },
  heroPrice: { fontSize: 40, fontFamily: "Poppins_700Bold", color: "#A8D96C", marginBottom: 4 },
  heroSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(168,217,108,0.8)", marginBottom: 14 },
  heroBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#A8D96C", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
  },
  heroBadgeText: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },

  card: {
    backgroundColor: "#fff", borderRadius: 16, padding: 16,
    marginBottom: 12, elevation: 2, borderWidth: 1, borderColor: "#E8F5E8",
  },
  cardTitle: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 4 },
  cardSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#888", marginBottom: 14 },

  featureRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#F0F7F0" },
  featureIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: "#E8F5E8", justifyContent: "center", alignItems: "center" },
  featureText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#333", flex: 1 },

  stepRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 },
  stepNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#0B3D2E", justifyContent: "center", alignItems: "center" },
  stepNumText: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#A8D96C" },
  stepText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#333", flex: 1 },

  walletBox: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#fff", borderRadius: 14, padding: 16,
    marginBottom: 12, elevation: 2, borderWidth: 1, borderColor: "#D4EDD4",
  },
  walletBoxLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  walletBoxLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#888" },
  walletBoxVal: { fontSize: 20, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  lowBadge: { backgroundColor: "#FFEBEE", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  lowBadgeText: { fontSize: 11, fontFamily: "Poppins_700Bold", color: "#C62828" },

  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 24,
    borderWidth: 1.5, borderColor: "#D4EDD4", backgroundColor: "#F0F7F0",
  },
  chipActive: { backgroundColor: "#0B3D2E", borderColor: "#0B3D2E" },
  chipText: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  chipTextActive: { color: "#A8D96C" },

  inputBox: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#F0F7F0", borderRadius: 14, paddingHorizontal: 14, height: 52,
    borderWidth: 1.5, borderColor: "#D4EDD4", marginBottom: 12,
  },
  inputPrefix: { fontSize: 18, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginRight: 6 },
  input: { flex: 1, fontSize: 16, fontFamily: "Poppins_700Bold", color: "#1A1A1A" },

  previewRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: "#E8F5E8", borderRadius: 10, padding: 12, marginBottom: 12,
  },
  previewText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#0B3D2E" },
  previewAmt: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },

  payBtn: {
    backgroundColor: "#A8D96C", borderRadius: 14, height: 54,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, elevation: 2,
  },
  payBtnDis: { opacity: 0.5 },
  payBtnText: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  payNote: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#aaa", textAlign: "center", marginTop: 8 },
});
