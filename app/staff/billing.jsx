import { useState, useEffect } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Modal, KeyboardAvoidingView, Platform, Alert,
  ActivityIndicator, FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import { useRouter } from "expo-router";
import { getAuth } from "../../utils/authStorage";
import { BASE_URL } from "../../constants/api";

const RZP_KEY = process.env.EXPO_PUBLIC_RAZORPAY_KEY;

const PAYMENT_METHODS = ["Cash", "Card", "UPI"];

const emptyForm = () => ({
  customerName: "",
  petName: "",
  phone: "",
  services: [{ name: "", amount: "" }],
  paymentMethod: "Cash",
  notes: "",
  upiId: "",
  upiMode: "scanner", // "scanner" | "id"
  cardNumber: "",
  cardExpiry: "",
  cardCvv: "",
});

export default function StaffBilling() {
  const router = useRouter();
  const [form, setForm] = useState(emptyForm());
  const [generating, setGenerating] = useState(false);
  const [visitTypes, setVisitTypes] = useState([]);
  const [showServicePicker, setShowServicePicker] = useState(false);
  const [pickerIndex, setPickerIndex] = useState(null);
  const [rzpModal, setRzpModal] = useState(null); // { orderId, method, upiId }

  useEffect(() => {
    getAuth().then(({ token }) => {
      fetch(`${BASE_URL}/api/v1/visit/getallvisittypes`, {
        headers: { Authorization: token || "" },
      })
        .then(r => r.json())
        .then(j => { if (j.success) setVisitTypes(j.visitTypes || []); })
        .catch(() => {});
    });
  }, []);

  const f = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  const updateService = (index, key, val) => {
    const updated = [...form.services];
    updated[index] = { ...updated[index], [key]: val };
    setForm((p) => ({ ...p, services: updated }));
  };

  const addService = () =>
    setForm((p) => ({ ...p, services: [...p.services, { name: "", amount: "" }] }));

  const removeService = (index) => {
    if (form.services.length === 1) return;
    setForm((p) => ({ ...p, services: p.services.filter((_, i) => i !== index) }));
  };

  const openServicePicker = (index) => {
    setPickerIndex(index);
    setShowServicePicker(true);
  };

  const selectService = (item) => {
    const updated = [...form.services];
    updated[pickerIndex] = {
      name: item.purpose,
      amount: item.price ? String(item.price) : updated[pickerIndex].amount,
    };
    setForm((p) => ({ ...p, services: updated }));
    setShowServicePicker(false);
    setPickerIndex(null);
  };

  const total = form.services.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);

  const buildBillData = () => ({
    ...form,
    total,
    billNo: `WI-${Date.now().toString().slice(-8)}`,
    date: new Date().toISOString(),
  });

  const validate = () => {
    if (!form.customerName.trim()) { Alert.alert("Error", "Customer name is required."); return false; }
    if (!form.services[0].name.trim()) { Alert.alert("Error", "At least one service is required."); return false; }
    if (total <= 0) { Alert.alert("Error", "Enter a valid amount for services."); return false; }
    return true;
  };

  const saveBillToBackend = async (data) => {
    try {
      const { token } = await getAuth();
      await fetch(`${BASE_URL}/api/v1/bills/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token || "" },
        body: JSON.stringify(data),
      });
    } catch { }
  };

  // ── CASH ──────────────────────────────────────────────────────────────────
  const handleCash = async () => {
    if (!validate()) return;
    setGenerating(true);
    const data = buildBillData();
    await saveBillToBackend(data);
    setGenerating(false);
    Alert.alert(
      "Bill Saved ✅",
      `Cash payment of ₹${total.toLocaleString("en-IN")} recorded.\nBill No: ${data.billNo}`,
      [{ text: "OK", onPress: () => { setForm(emptyForm()); router.push("/staff/billhistory"); } }]
    );
  };

  // ── CARD / UPI via Razorpay WebView ──────────────────────────────────────
  const handleOnlinePayment = async (upiIdOverride) => {
    if (!validate()) return;
    setGenerating(true);
    try {
      const { token } = await getAuth();
      const orderRes = await fetch(`${BASE_URL}/api/v1/payments/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token || "" },
        body: JSON.stringify({
          amount: total,
          receipt: `walkin_${Date.now()}`,
          notes: { customerName: form.customerName, petName: form.petName },
        }),
      });
      const orderData = await orderRes.json();
      if (!orderData.success) throw new Error(orderData.message || "Could not create payment order");
      setGenerating(false);
      setRzpModal({
        orderId: orderData.order.id,
        method: form.paymentMethod,
        upiId: upiIdOverride || form.upiId || "",
      });
    } catch (e) {
      setGenerating(false);
      Alert.alert("Error", e.message || "Could not initiate payment");
    }
  };

  const onRzpMessage = async (event) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === "cancel") { setRzpModal(null); return; }
      if (msg.type === "success") {
        setRzpModal(null);
        setGenerating(true);
        const { token } = await getAuth();
        const verifyRes = await fetch(`${BASE_URL}/api/v1/payments/verify-payment2`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: token || "" },
          body: JSON.stringify({ razorpay_payment_id: msg.razorpay_payment_id }),
        });
        const verifyData = await verifyRes.json();
        setGenerating(false);
        if (verifyData.success) {
          const data = buildBillData();
          data.razorpayPaymentId = msg.razorpay_payment_id;
          await saveBillToBackend(data);
          setForm(emptyForm());
          router.push("/staff/billhistory");
        } else {
          Alert.alert("Verification Failed", verifyData.message || "Contact support");
        }
      }
      if (msg.type === "error") {
        setRzpModal(null);
        Alert.alert("Payment Failed", msg.description || "Something went wrong");
      }
    } catch (_) {}
  };

  const buildRzpHtml = (orderId, method, upiId) => {
    const prefillObj = {
      name: form.customerName || "",
      contact: form.phone || "9999999999",
    };
    if (method === "UPI" && upiId) prefillObj.vpa = upiId;

    const optsObj = {
      key: RZP_KEY,
      order_id: orderId,
      amount: total * 100,
      currency: "INR",
      name: "Doggos Heaven",
      description: form.services.map(s => s.name).filter(Boolean).join(", ") || "Service",
      prefill: prefillObj,
      theme: { color: "#0B3D2E" },
    };

    // For UPI scanner: force only UPI QR method
    if (method === "UPI") {
      optsObj.method = { upi: true, card: false, netbanking: false, wallet: false, emi: false };
      optsObj.config = {
        display: {
          blocks: { upi: { name: "Pay via UPI", instruments: [{ method: "upi", flow: "qr" }] } },
          sequence: ["block.upi"],
          preferences: { show_default_blocks: false },
        },
      };
    }

    // For Card: force only card method
    if (method === "Card") {
      optsObj.method = { card: true, upi: false, netbanking: false, wallet: false, emi: false };
      optsObj.config = {
        display: {
          blocks: { card: { name: "Pay by Card", instruments: [{ method: "card" }] } },
          sequence: ["block.card"],
          preferences: { show_default_blocks: false },
        },
      };
    }

    const optsJson = JSON.stringify(optsObj);

    return [
      '<!DOCTYPE html><html><head>',
      '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">',
      '<style>*{box-sizing:border-box;}body{margin:0;padding:0;background:#fff;}</style>',
      '</head><body>',
      '<script src="https://checkout.razorpay.com/v1/checkout.js"><\/script>',
      '<script>',
      'window.onload = function() {',
      '  var opts = ' + optsJson + ';',
      '  opts.handler = function(res) {',
      '    window.ReactNativeWebView.postMessage(JSON.stringify({',
      '      type: "success",',
      '      razorpay_payment_id: res.razorpay_payment_id,',
      '      razorpay_order_id: res.razorpay_order_id,',
      '      razorpay_signature: res.razorpay_signature',
      '    }));',
      '  };',
      '  opts.modal = {',
      '    ondismiss: function() {',
      '      window.ReactNativeWebView.postMessage(JSON.stringify({ type: "cancel" }));',
      '    },',
      '    confirm_close: false,',
      '    escape: false',
      '  };',
      '  var rzp = new Razorpay(opts);',
      '  rzp.on("payment.failed", function(r) {',
      '    window.ReactNativeWebView.postMessage(JSON.stringify({',
      '      type: "error",',
      '      description: r.error ? r.error.description : "Payment failed"',
      '    }));',
      '  });',
      '  rzp.open();',
      '};',
      '<\/script>',
      '</body></html>',
    ].join('\n');
  };

  const handleGenerateBill = () => {
    if (form.paymentMethod === "Cash") return handleCash();
    if (form.paymentMethod === "UPI") {
      if (form.upiMode === "id") {
        if (!form.upiId?.trim()) { Alert.alert("Error", "Please enter UPI ID"); return; }
        return handleOnlinePayment(form.upiId.trim());
      }
      return handleOnlinePayment(); // scanner mode
    }
    handleOnlinePayment();
  };

  const btnLabel = form.paymentMethod === "Cash" ? "Complete Bill" : "Pay ₹" + total.toLocaleString("en-IN");

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Walk-in Billing</Text>
        <TouchableOpacity onPress={() => router.push("/staff/billhistory")} style={s.historyBtn}>
          <Ionicons name="time-outline" size={20} color="#A8D96C" />
          <Text style={s.historyBtnTxt}>History</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Customer Info */}
          <Text style={s.sectionLabel}>Customer Details</Text>
          <View style={s.card}>
            <View style={s.formField}>
              <Text style={s.formLabel}>Customer Name *</Text>
              <TextInput style={s.input} placeholder="e.g. Deepak Gupta" placeholderTextColor="#aaa"
                value={form.customerName} onChangeText={(v) => f("customerName", v)} />
            </View>
            <View style={s.formField}>
              <Text style={s.formLabel}>Pet Name</Text>
              <TextInput style={s.input} placeholder="e.g. Bruno" placeholderTextColor="#aaa"
                value={form.petName} onChangeText={(v) => f("petName", v)} />
            </View>
            <View style={s.formField}>
              <Text style={s.formLabel}>Phone</Text>
              <TextInput
                style={s.input} placeholder="10-digit number" placeholderTextColor="#aaa"
                value={form.phone} onChangeText={(v) => f("phone", v.replace(/\D/g, "").slice(0, 10))}
                keyboardType="number-pad" maxLength={10}
              />
              {form.phone.length > 0 && form.phone.length < 10 && (
                <Text style={s.phoneHint}>{10 - form.phone.length} more digit{10 - form.phone.length !== 1 ? "s" : ""} required</Text>
              )}
            </View>
          </View>

          {/* Services */}
          <View style={s.sectionRow}>
            <Text style={s.sectionLabel}>Services</Text>
            <TouchableOpacity onPress={addService} style={s.addServiceBtn}>
              <Ionicons name="add-circle-outline" size={18} color="#0B3D2E" />
              <Text style={s.addServiceTxt}>Add</Text>
            </TouchableOpacity>
          </View>

          {form.services.map((svc, i) => (
            <View key={i} style={s.serviceRow}>
              <TouchableOpacity
                style={[s.input, s.serviceSelector, { flex: 2, marginRight: 8 }]}
                onPress={() => openServicePicker(i)} activeOpacity={0.8}
              >
                <Text style={svc.name ? s.serviceSelectorTxt : s.serviceSelectorPlaceholder} numberOfLines={1}>
                  {svc.name || "Select service"}
                </Text>
                <Ionicons name="chevron-down" size={14} color="#999" />
              </TouchableOpacity>
              <TextInput
                style={[s.input, { flex: 1, marginRight: 8 }]}
                placeholder="₹ Amount" placeholderTextColor="#aaa"
                value={svc.amount} onChangeText={(v) => updateService(i, "amount", v)}
                keyboardType="numeric"
              />
              <TouchableOpacity onPress={() => removeService(i)} disabled={form.services.length === 1}>
                <Ionicons name="close-circle" size={22} color={form.services.length === 1 ? "#ddd" : "#C62828"} />
              </TouchableOpacity>
            </View>
          ))}

          {/* Total */}
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Total Amount</Text>
            <Text style={s.totalAmt}>₹{total.toLocaleString("en-IN")}</Text>
          </View>

          {/* Payment Method */}
          <Text style={s.sectionLabel}>Payment Method</Text>
          <View style={s.chipRow}>
            {PAYMENT_METHODS.map((m) => (
              <TouchableOpacity key={m} style={[s.chip, form.paymentMethod === m && s.chipActive]}
                onPress={() => f("paymentMethod", m)}>
                <Text style={[s.chipTxt, form.paymentMethod === m && s.chipTxtActive]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Cash info */}
          {form.paymentMethod === "Cash" && (
            <View style={s.infoBanner}>
              <Ionicons name="cash-outline" size={16} color="#3E7B27" />
              <Text style={s.infoBannerTxt}>
                Cash payment — bill will be saved to history. No invoice will be generated.
              </Text>
            </View>
          )}

          {/* Card extra fields */}
          {form.paymentMethod === "Card" && (
            <View style={s.cardInputBox}>
              <View style={s.cardInputRow}>
                <Ionicons name="card-outline" size={18} color="#1565C0" />
                <Text style={s.cardInputLabel}>Card Number</Text>
              </View>
              <TextInput
                style={[s.input, { marginBottom: 10 }]}
                placeholder="1234 5678 9012 3456"
                placeholderTextColor="#aaa"
                keyboardType="number-pad"
                maxLength={19}
                value={form.cardNumber || ""}
                onChangeText={(v) => {
                  const digits = v.replace(/\D/g, "").slice(0, 16);
                  const formatted = digits.replace(/(\d{4})(?=\d)/g, "$1 ");
                  f("cardNumber", formatted);
                }}
              />
              <View style={{ flexDirection: "row", gap: 10 }}>
                <TextInput
                  style={[s.input, { flex: 1 }]}
                  placeholder="MM/YY"
                  placeholderTextColor="#aaa"
                  keyboardType="number-pad"
                  maxLength={5}
                  value={form.cardExpiry || ""}
                  onChangeText={(v) => {
                    const digits = v.replace(/\D/g, "").slice(0, 4);
                    const formatted = digits.length > 2 ? digits.slice(0, 2) + "/" + digits.slice(2) : digits;
                    f("cardExpiry", formatted);
                  }}
                />
                <TextInput
                  style={[s.input, { flex: 1 }]}
                  placeholder="CVV"
                  placeholderTextColor="#aaa"
                  keyboardType="number-pad"
                  maxLength={4}
                  secureTextEntry
                  value={form.cardCvv || ""}
                  onChangeText={(v) => f("cardCvv", v.replace(/\D/g, "").slice(0, 4))}
                />
              </View>
              <Text style={s.cardHint}>Card details are entered securely in Razorpay checkout. Fields above are for reference only.</Text>
            </View>
          )}

          {/* UPI inline options */}
          {form.paymentMethod === "UPI" && (
            <View style={s.cardInputBox}>
              <View style={s.cardInputRow}>
                <Ionicons name="qr-code-outline" size={18} color="#6A1B9A" />
                <Text style={[s.cardInputLabel, { color: "#6A1B9A" }]}>UPI Payment</Text>
              </View>
              <TouchableOpacity
                style={s.upiScanBtn}
                onPress={() => { f("upiMode", "scanner"); }}
                activeOpacity={0.8}
              >
                <Ionicons name={form.upiMode === "scanner" ? "radio-button-on" : "radio-button-off"} size={18} color="#6A1B9A" />
                <Ionicons name="scan-outline" size={20} color="#6A1B9A" style={{ marginLeft: 8 }} />
                <Text style={s.upiScanTxt}>Scan QR Code (Razorpay)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.upiScanBtn, { marginTop: 8 }]}
                onPress={() => { f("upiMode", "id"); }}
                activeOpacity={0.8}
              >
                <Ionicons name={form.upiMode === "id" ? "radio-button-on" : "radio-button-off"} size={18} color="#6A1B9A" />
                <Ionicons name="at-outline" size={20} color="#6A1B9A" style={{ marginLeft: 8 }} />
                <Text style={s.upiScanTxt}>Enter UPI ID</Text>
              </TouchableOpacity>
              {form.upiMode === "id" && (
                <TextInput
                  style={[s.input, { marginTop: 10 }]}
                  placeholder="e.g. name@upi or 9876543210@paytm"
                  placeholderTextColor="#aaa"
                  value={form.upiId}
                  onChangeText={(v) => f("upiId", v)}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              )}
            </View>
          )}

          {/* Notes */}
          <Text style={s.sectionLabel}>Notes (optional)</Text>
          <TextInput
            style={[s.input, { height: 72, textAlignVertical: "top", paddingTop: 10 }]}
            placeholder="Any remarks..." placeholderTextColor="#aaa"
            value={form.notes} onChangeText={(v) => f("notes", v)} multiline
          />

          <TouchableOpacity style={[s.generateBtn, form.paymentMethod === "Cash" && s.cashBtn]}
            onPress={handleGenerateBill} disabled={generating} activeOpacity={0.85}>
            {generating
              ? <ActivityIndicator color="#A8D96C" />
              : <>
                  <Ionicons
                    name={form.paymentMethod === "Cash" ? "checkmark-circle-outline" : "card-outline"}
                    size={20} color="#A8D96C"
                  />
                  <Text style={s.generateBtnTxt}>{btnLabel}</Text>
                </>
            }
          </TouchableOpacity>

          <View style={{ height: 30 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Razorpay WebView Modal */}
      <Modal visible={!!rzpModal} animationType="slide" onRequestClose={() => setRzpModal(null)}>
        <View style={{ flex: 1, backgroundColor: "#000" }}>
          <TouchableOpacity
            onPress={() => setRzpModal(null)}
            style={{ paddingTop: 52, paddingHorizontal: 16, paddingBottom: 10, backgroundColor: "#0B3D2E" }}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          {rzpModal && (
            <WebView
              source={{ html: buildRzpHtml(rzpModal.orderId, rzpModal.method, rzpModal.upiId) }}
              onMessage={onRzpMessage}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              originWhitelist={["*"]}
              mixedContentMode="always"
              allowsInlineMediaPlayback={true}
              style={{ flex: 1, backgroundColor: "#fff" }}
            />
          )}
        </View>
      </Modal>

      {/* Service Picker Modal */}
      <Modal visible={showServicePicker} transparent animationType="slide" onRequestClose={() => setShowServicePicker(false)}>
        <TouchableOpacity style={s.pickerOverlay} activeOpacity={1} onPress={() => setShowServicePicker(false)}>
          <TouchableOpacity activeOpacity={1} style={s.pickerSheet}>
            <View style={s.pickerHandle} />
            <Text style={s.pickerTitle}>Select Service</Text>
            <FlatList
              data={visitTypes}
              keyExtractor={(item) => item._id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[s.pickerItem, form.services[pickerIndex]?.name === item.purpose && s.pickerItemActive]}
                  onPress={() => selectService(item)} activeOpacity={0.8}
                >
                  <Text style={s.pickerItemEmoji}>{item.emoji || "🐾"}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.pickerItemTxt, form.services[pickerIndex]?.name === item.purpose && s.pickerItemTxtActive]}>
                      {item.purpose}
                    </Text>
                    {item.price ? <Text style={s.pickerItemPrice}>₹{item.price}</Text> : null}
                  </View>
                  {form.services[pickerIndex]?.name === item.purpose && (
                    <Ionicons name="checkmark-circle" size={18} color="#3E7B27" />
                  )}
                </TouchableOpacity>
              )}
            />
          </TouchableOpacity>
        </TouchableOpacity>
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
  backBtn: { width: 36, height: 36, justifyContent: "center" },
  headerTitle: { fontSize: 20, fontFamily: "Poppins_700Bold", color: "#fff", flex: 1 },
  historyBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(168,217,108,0.15)", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 },
  historyBtnTxt: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#A8D96C" },

  scroll: { padding: 16, paddingBottom: 40 },
  sectionLabel: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 8, marginTop: 16 },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 16, marginBottom: 8 },
  addServiceBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  addServiceTxt: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },

  card: { backgroundColor: "#fff", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#D4EDD4", elevation: 1 },
  formField: { marginBottom: 10 },
  formLabel: { fontSize: 11, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 5 },
  input: {
    borderWidth: 1, borderColor: "#D4EDD4", borderRadius: 10,
    backgroundColor: "#fff", paddingHorizontal: 12, height: 44,
    fontSize: 14, fontFamily: "Inter_400Regular", color: "#1A1A1A",
  },
  phoneHint: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#B45309", marginTop: 4 },

  serviceRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  serviceSelector: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12 },
  serviceSelectorTxt: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#1A1A1A", flex: 1 },
  serviceSelectorPlaceholder: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#aaa", flex: 1 },

  totalRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: "#0B3D2E", borderRadius: 12, padding: 14, marginTop: 8,
  },
  totalLabel: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#A8D96C" },
  totalAmt: { fontSize: 22, fontFamily: "Poppins_700Bold", color: "#fff" },

  chipRow: { flexDirection: "row", gap: 10, marginBottom: 4 },
  chip: { paddingHorizontal: 20, paddingVertical: 9, borderRadius: 20, backgroundColor: "#fff", borderWidth: 1, borderColor: "#D4EDD4" },
  chipActive: { backgroundColor: "#0B3D2E", borderColor: "#0B3D2E" },
  chipTxt: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#3E7B27" },
  chipTxtActive: { color: "#A8D96C", fontFamily: "Poppins_700Bold" },

  infoBanner: {
    flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 10,
    backgroundColor: "#E8F5E8", borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: "#A8D96C",
  },
  infoBannerTxt: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: "#3E7B27", lineHeight: 18 },

  generateBtn: {
    backgroundColor: "#0B3D2E", borderRadius: 14, height: 54,
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, marginTop: 20, elevation: 3,
  },
  cashBtn: { backgroundColor: "#3E7B27" },
  generateBtnTxt: { fontSize: 16, fontFamily: "Poppins_700Bold", color: "#A8D96C" },

  // Service Picker
  pickerOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  pickerSheet: {
    backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 36, maxHeight: "75%",
  },
  pickerHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#D4EDD4", alignSelf: "center", marginBottom: 14 },
  pickerTitle: { fontSize: 16, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 14 },
  pickerItem: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 13, paddingHorizontal: 12, borderRadius: 12,
    marginBottom: 6, backgroundColor: "#F0F7F0",
  },
  pickerItemActive: { backgroundColor: "#E8F5E8", borderWidth: 1, borderColor: "#A8D96C" },
  pickerItemEmoji: { fontSize: 20 },
  pickerItemTxt: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#0B3D2E" },
  pickerItemTxtActive: { fontFamily: "Poppins_700Bold" },
  pickerItemPrice: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#3E7B27", marginTop: 2 },

  // Card & UPI inline
  cardInputBox: {
    marginTop: 10, backgroundColor: "#F0F4FF", borderRadius: 12,
    padding: 14, borderWidth: 1, borderColor: "#BBDEFB",
  },
  cardInputRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  cardInputLabel: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#1565C0" },
  cardHint: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#999", marginTop: 8, lineHeight: 14 },
  upiScanBtn: {
    flexDirection: "row", alignItems: "center", padding: 12,
    backgroundColor: "#fff", borderRadius: 10, borderWidth: 1, borderColor: "#CE93D8",
  },
  upiScanTxt: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#4A148C", marginLeft: 8 },
});
