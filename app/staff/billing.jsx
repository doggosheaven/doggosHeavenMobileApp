import { useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Modal, KeyboardAvoidingView, Platform, Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import { useRouter } from "expo-router";
import { buildWalkInInvoiceHTML, downloadWalkInInvoicePDF } from "../../utils/walkInInvoice";
import { saveBill } from "../../utils/billHistory";

const PAYMENT_METHODS = ["Cash", "Card", "UPI"];

const emptyForm = () => ({
  customerName: "",
  petName: "",
  phone: "",
  services: [{ name: "", amount: "" }],
  paymentMethod: "Cash",
  notes: "",
});

export default function StaffBilling() {
  const router = useRouter();
  const [form, setForm] = useState(emptyForm());
  const [invoiceData, setInvoiceData] = useState(null);
  const [downloading, setDownloading] = useState(false);

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

  const total = form.services.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);

  const [generating, setGenerating] = useState(false);
  const [billCreated, setBillCreated] = useState(false);

  const handleGenerateBill = async () => {
    if (!form.customerName.trim()) return Alert.alert("Error", "Customer name is required.");
    if (!form.services[0].name.trim()) return Alert.alert("Error", "At least one service is required.");
    if (total <= 0) return Alert.alert("Error", "Enter valid amount for services.");
    setGenerating(true);
    const data = {
      ...form,
      total,
      billNo: `WI-${Date.now().toString().slice(-8)}`,
      date: new Date().toISOString(),
    };
    await saveBill(data);
    setInvoiceData(data);
    setGenerating(false);
    setBillCreated(true);
    setTimeout(() => setBillCreated(false), 2000);
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadWalkInInvoicePDF(invoiceData);
    } catch {
      Alert.alert("Error", "Could not download invoice.");
    } finally {
      setDownloading(false);
    }
  };

  const handleNewBill = () => {
    setInvoiceData(null);
    setForm(emptyForm());
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
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
              <TextInput style={s.input} placeholder="e.g. Rahul Sharma" placeholderTextColor="#aaa"
                value={form.customerName} onChangeText={(v) => f("customerName", v)} />
            </View>
            <View style={s.formField}>
              <Text style={s.formLabel}>Pet Name</Text>
              <TextInput style={s.input} placeholder="e.g. Bruno" placeholderTextColor="#aaa"
                value={form.petName} onChangeText={(v) => f("petName", v)} />
            </View>
            <View style={s.formField}>
              <Text style={s.formLabel}>Phone</Text>
              <TextInput style={s.input} placeholder="Contact number" placeholderTextColor="#aaa"
                value={form.phone} onChangeText={(v) => f("phone", v)} keyboardType="number-pad" />
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
              <TextInput
                style={[s.input, { flex: 2, marginRight: 8 }]}
                placeholder="Service name"
                placeholderTextColor="#aaa"
                value={svc.name}
                onChangeText={(v) => updateService(i, "name", v)}
              />
              <TextInput
                style={[s.input, { flex: 1, marginRight: 8 }]}
                placeholder="₹ Amount"
                placeholderTextColor="#aaa"
                value={svc.amount}
                onChangeText={(v) => updateService(i, "amount", v)}
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
              <TouchableOpacity key={m} style={[s.chip, form.paymentMethod === m && s.chipActive]} onPress={() => f("paymentMethod", m)}>
                <Text style={[s.chipTxt, form.paymentMethod === m && s.chipTxtActive]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Notes */}
          <Text style={s.sectionLabel}>Notes (optional)</Text>
          <TextInput
            style={[s.input, { height: 72, textAlignVertical: "top", paddingTop: 10 }]}
            placeholder="Any remarks..."
            placeholderTextColor="#aaa"
            value={form.notes}
            onChangeText={(v) => f("notes", v)}
            multiline
          />

          <TouchableOpacity style={s.generateBtn} onPress={handleGenerateBill} disabled={generating} activeOpacity={0.85}>
            {generating
              ? <ActivityIndicator color="#A8D96C" />
              : <><Ionicons name="receipt-outline" size={20} color="#A8D96C" /><Text style={s.generateBtnTxt}>Generate Bill</Text></>
            }
          </TouchableOpacity>

          {billCreated && (
            <View style={s.successBanner}>
              <Ionicons name="checkmark-circle" size={18} color="#3E7B27" />
              <Text style={s.successTxt}>Bill created! Opening preview...</Text>
            </View>
          )}

          <View style={{ height: 30 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Invoice Preview Modal */}
      <Modal visible={!!invoiceData} animationType="slide" onRequestClose={() => setInvoiceData(null)}>
        <SafeAreaView style={s.modalContainer}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => setInvoiceData(null)} style={s.modalBack}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={s.modalTitle}>Bill Preview</Text>
            <Text style={s.modalSub}>{invoiceData?.billNo}</Text>
          </View>

          {invoiceData && (
            <WebView
              style={{ flex: 1 }}
              originWhitelist={["*"]}
              source={{ html: buildWalkInInvoiceHTML(invoiceData) }}
              showsVerticalScrollIndicator={false}
            />
          )}

          <View style={s.modalFooter}>
            <TouchableOpacity style={s.newBillBtn} onPress={handleNewBill} activeOpacity={0.85}>
              <Ionicons name="add-circle-outline" size={18} color="#0B3D2E" />
              <Text style={s.newBillTxt}>New Bill</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.downloadBtn} onPress={handleDownload} disabled={downloading} activeOpacity={0.85}>
              {downloading ? <ActivityIndicator color="#A8D96C" /> : (
                <>
                  <Ionicons name="download-outline" size={20} color="#A8D96C" />
                  <Text style={s.downloadBtnTxt}>Download PDF</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
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

  serviceRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },

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

  generateBtn: {
    backgroundColor: "#0B3D2E", borderRadius: 14, height: 54,
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, marginTop: 20, elevation: 3,
  },
  generateBtnTxt: { fontSize: 16, fontFamily: "Poppins_700Bold", color: "#A8D96C" },
  successBanner: {
    flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12,
    backgroundColor: "#E8F5E8", borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: "#A8D96C",
  },
  successTxt: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#3E7B27" },

  modalContainer: { flex: 1, backgroundColor: "#fff" },
  modalHeader: {
    backgroundColor: "#0B3D2E", paddingHorizontal: 20,
    paddingTop: 16, paddingBottom: 16,
    flexDirection: "row", alignItems: "center", gap: 12,
  },
  modalBack: { width: 36, height: 36, justifyContent: "center" },
  modalTitle: { fontSize: 18, fontFamily: "Poppins_700Bold", color: "#fff", flex: 1 },
  modalSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#A8D96C" },

  modalFooter: {
    flexDirection: "row", gap: 10, padding: 16,
    backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#D4EDD4",
  },
  newBillBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, borderRadius: 12, height: 50,
    backgroundColor: "#F0F7F0", borderWidth: 1, borderColor: "#A8D96C",
  },
  newBillTxt: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  downloadBtn: {
    flex: 2, backgroundColor: "#0B3D2E", borderRadius: 12, height: 50,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  downloadBtnTxt: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#A8D96C" },
});
