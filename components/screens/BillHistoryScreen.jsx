import { useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, Modal, ActivityIndicator, TextInput, RefreshControl,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import { useRouter } from "expo-router";
import { getAuth } from "../../utils/authStorage";
import { BASE_URL } from "../../constants/api";
import { buildWalkInInvoiceHTML, downloadWalkInInvoicePDF } from "../../utils/walkInInvoice";

const PM_COLOR = { Cash: "#3E7B27", Card: "#1565C0", UPI: "#6A1B9A" };
const PM_BG    = { Cash: "#E8F5E8", Card: "#E3F2FD", UPI: "#F3E5F5" };

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

/**
 * Shared by /staff/billhistory and /admin/billhistory. The copies differed only
 * in the root wrapper and the order the helpers were declared in.
 */
export default function BillHistoryScreen({ avoidKeyboard = true }) {
  const Root = avoidKeyboard ? KeyboardAvoidingView : View;
  const rootProps = avoidKeyboard ? { behavior: Platform.OS === "ios" ? "padding" : "height" } : {};
  const router = useRouter();
  const [bills, setBills] = useState([]);
  const [search, setSearch] = useState("");
  const [pmFilter, setPmFilter] = useState("All");
  const [refreshing, setRefreshing] = useState(false);
  const [viewBill, setViewBill] = useState(null);
  const [invoiceHtml, setInvoiceHtml] = useState("");
  const [htmlLoading, setHtmlLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const openBill = async (bill) => {
    setViewBill(bill);
    setHtmlLoading(true);
    try {
      const html = await buildWalkInInvoiceHTML(bill);
      setInvoiceHtml(html);
    } catch (e) { console.log(e); setInvoiceHtml("<html><body><p>Error loading invoice</p></body></html>"); }
    finally { setHtmlLoading(false); }
  };

  const load = useCallback(async () => {
    try {
      const { token } = await getAuth();
      const res = await fetch(`${BASE_URL}/api/v1/bills/list`, {
        headers: { Authorization: token || "" },
      });
      const data = await res.json();
      if (data.success) setBills(data.bills || []);
    } catch (e) { console.log(e); }
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleDelete = (bill) => {
    Alert.alert("Delete Bill", `Delete bill ${bill.billNo}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          const { token } = await getAuth();
          await fetch(`${BASE_URL}/api/v1/bills/${bill._id}`, {
            method: "DELETE",
            headers: { Authorization: token || "" },
          });
          setBills((prev) => prev.filter((b) => b._id !== bill._id));
        },
      },
    ]);
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadWalkInInvoicePDF(viewBill);
    } catch {
      Alert.alert("Error", "Could not download invoice.");
    } finally {
      setDownloading(false);
    }
  };

  const closeModal = () => { setViewBill(null); setInvoiceHtml(""); };

  const filtered = bills.filter((b) => {
    const matchSearch =
      b.customerName?.toLowerCase().includes(search.toLowerCase()) ||
      b.billNo?.toLowerCase().includes(search.toLowerCase()) ||
      b.petName?.toLowerCase().includes(search.toLowerCase());
    const matchPm = pmFilter === "All" || b.paymentMethod === pmFilter;
    return matchSearch && matchPm;
  });

  const totalRevenue = bills.reduce((sum, b) => sum + (b.total || 0), 0);

  return (
    <Root style={s.container} {...rootProps}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="close" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Bill History</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Summary */}
      <View style={s.summaryRow}>
        <View style={s.summaryBox}>
          <Ionicons name="receipt-outline" size={18} color="#0B3D2E" />
          <Text style={s.summaryVal}>{bills.length}</Text>
          <Text style={s.summaryLabel}>Total Bills</Text>
        </View>
        <View style={[s.summaryBox, { borderColor: "#A8D96C" }]}>
          <Ionicons name="cash-outline" size={18} color="#3E7B27" />
          <Text style={[s.summaryVal, { color: "#3E7B27" }]}>₹{totalRevenue.toLocaleString("en-IN")}</Text>
          <Text style={s.summaryLabel}>Total Revenue</Text>
        </View>
      </View>

      {/* Search */}
      <View style={s.searchBar}>
        <Ionicons name="search-outline" size={18} color="#999" style={{ marginRight: 8 }} />
        <TextInput
          style={s.searchInput} placeholder="Search by name, bill no, pet..."
          placeholderTextColor="#aaa" value={search} onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={18} color="#ccc" />
          </TouchableOpacity>
        )}
      </View>

      {/* Payment Filter */}
      <View style={s.filterRow}>
        {["All", "Cash", "Card", "Online"].map((f) => (
          <TouchableOpacity
            key={f}
            style={[s.filterChip, pmFilter === f && s.filterChipActive]}
            onPress={() => setPmFilter(f)}
            activeOpacity={0.8}
          >
            <Text style={[s.filterChipTxt, pmFilter === f && s.filterChipTxtActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#0B3D2E" />}
      >
        {filtered.length === 0 ? (
          <View style={s.emptyBox}>
            <Ionicons name="receipt-outline" size={52} color="#A8D96C" />
            <Text style={s.emptyTitle}>{bills.length === 0 ? "No Bills Yet" : "No Results Found"}</Text>
            <Text style={s.emptySub}>{bills.length === 0 ? "Generated bills will appear here" : "Try a different search"}</Text>
          </View>
        ) : (
          filtered.map((bill) => (
            <TouchableOpacity key={bill.billNo} style={s.card} onPress={() => openBill(bill)} activeOpacity={0.85}>
              <View style={s.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={s.customerName}>{bill.customerName}</Text>
                  {bill.petName ? <Text style={s.petName}>🐾 {bill.petName}</Text> : null}
                  {bill.phone ? <Text style={s.phone}>📞 {bill.phone}</Text> : null}
                </View>
                <View style={s.cardRight}>
                  <Text style={s.amount}>₹{(bill.total || 0).toLocaleString("en-IN")}</Text>
                  <View style={[s.pmBadge, { backgroundColor: PM_BG[bill.paymentMethod] || "#F0F7F0" }]}>
                    <Text style={[s.pmTxt, { color: PM_COLOR[bill.paymentMethod] || "#0B3D2E" }]}>{bill.paymentMethod}</Text>
                  </View>
                </View>
              </View>

              <View style={s.divider} />

              <View style={s.cardBottom}>
                <View style={s.metaItem}>
                  <Ionicons name="calendar-outline" size={12} color="#999" />
                  <Text style={s.metaTxt}>{fmtDate(bill.date)}</Text>
                </View>
                <View style={s.metaItem}>
                  <Ionicons name="barcode-outline" size={12} color="#999" />
                  <Text style={s.metaTxt}>{bill.billNo}</Text>
                </View>
                <View style={s.metaItem}>
                  <Ionicons name="list-outline" size={12} color="#999" />
                  <Text style={s.metaTxt}>{bill.services?.filter(sv => sv.name).length || 0} service(s)</Text>
                </View>
              </View>

              <View style={s.cardActions}>
                <TouchableOpacity style={s.viewBtn} onPress={() => openBill(bill)}>
                  <Ionicons name="eye-outline" size={14} color="#3E7B27" />
                  <Text style={s.viewBtnTxt}>View</Text>
                </TouchableOpacity>
                {bill.paymentMethod !== "Cash" && (
                  <TouchableOpacity style={s.invoiceBtn} onPress={() => openBill(bill)}>
                    <Ionicons name="document-text-outline" size={14} color="#1565C0" />
                    <Text style={s.invoiceBtnTxt}>Invoice</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={s.deleteBtn} onPress={() => handleDelete(bill)}>
                  <Ionicons name="trash-outline" size={14} color="#C62828" />
                  <Text style={s.deleteBtnTxt}>Delete</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}
        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Invoice Preview Modal */}
      <Modal visible={!!viewBill} animationType="slide" onRequestClose={closeModal}>
        <View style={s.modalContainer}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={closeModal} style={s.modalBack}>
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={s.modalTitle}>Bill Preview</Text>
            <Text style={s.modalSub}>{viewBill?.billNo}</Text>
          </View>

          {htmlLoading ? (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
              <ActivityIndicator size="large" color="#0B3D2E" />
              <Text style={{ marginTop: 12, fontFamily: "Inter_400Regular", color: "#666", fontSize: 13 }}>Loading invoice...</Text>
            </View>
          ) : (
            <WebView
              style={{ flex: 1 }}
              originWhitelist={["*"]}
              source={{ html: invoiceHtml }}
              showsVerticalScrollIndicator={false}
            />
          )}

          <View style={s.modalFooter}>
            {viewBill?.paymentMethod !== "Cash" && (
              <TouchableOpacity style={s.downloadBtn} onPress={handleDownload} disabled={downloading} activeOpacity={0.85}>
                {downloading ? <ActivityIndicator color="#A8D96C" /> : (
                  <>
                    <Ionicons name="download-outline" size={20} color="#A8D96C" />
                    <Text style={s.downloadBtnTxt}>Download PDF</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </Root>
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
  headerTitle: { flex: 1, fontSize: 20, fontFamily: "Poppins_700Bold", color: "#fff", textAlign: "center" },
  headerSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#A8D96C", marginTop: 1 },

  summaryRow: { flexDirection: "row", gap: 10, padding: 16, paddingBottom: 0 },
  summaryBox: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#fff", borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: "#D4EDD4", elevation: 1,
  },
  summaryVal: { fontSize: 16, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  summaryLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#666" },

  filterRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingBottom: 8, paddingTop: 4 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, backgroundColor: "#fff", borderWidth: 1, borderColor: "#D4EDD4" },
  filterChipActive: { backgroundColor: "#0B3D2E", borderColor: "#0B3D2E" },
  filterChipTxt: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  filterChipTxtActive: { color: "#A8D96C" },

  invoiceBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 5, paddingVertical: 8, borderRadius: 10,
    backgroundColor: "#E3F2FD", borderWidth: 1, borderColor: "#BBDEFB",
  },
  invoiceBtnTxt: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#1565C0" },

  searchBar: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#fff",
    paddingHorizontal: 16, paddingVertical: 10, margin: 16, marginBottom: 8,
    borderRadius: 12, borderWidth: 1, borderColor: "#D4EDD4",
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: "#1A1A1A" },

  scroll: { padding: 16, paddingTop: 8, paddingBottom: 40 },

  card: {
    backgroundColor: "#fff", borderRadius: 16, padding: 14,
    marginBottom: 12, elevation: 2, borderWidth: 1, borderColor: "#D4EDD4",
  },
  cardTop: { flexDirection: "row", alignItems: "flex-start", marginBottom: 10 },
  customerName: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 2 },
  petName: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#666", marginBottom: 1 },
  phone: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#999" },
  cardRight: { alignItems: "flex-end", gap: 6 },
  amount: { fontSize: 18, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  pmBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  pmTxt: { fontSize: 11, fontFamily: "Poppins_700Bold" },

  divider: { height: 1, backgroundColor: "#F0F7F0", marginBottom: 10 },

  cardBottom: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 10 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaTxt: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#999" },

  cardActions: { flexDirection: "row", gap: 8 },
  viewBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 5, paddingVertical: 8, borderRadius: 10,
    backgroundColor: "#F0F7F0", borderWidth: 1, borderColor: "#A8D96C",
  },
  viewBtnTxt: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#3E7B27" },
  deleteBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 5, paddingVertical: 8, borderRadius: 10,
    backgroundColor: "#FFF0F0", borderWidth: 1, borderColor: "#FFCDD2",
  },
  deleteBtnTxt: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#C62828" },

  emptyBox: { alignItems: "center", paddingVertical: 80, gap: 10 },
  emptyTitle: { fontSize: 16, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  emptySub: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#999" },

  modalContainer: { flex: 1, backgroundColor: "#fff" },
  modalHeader: {
    backgroundColor: "#0B3D2E", paddingHorizontal: 20,
    paddingTop: 52, paddingBottom: 16,
    flexDirection: "row", alignItems: "center", gap: 12,
  },
  modalBack: { width: 36, height: 44, justifyContent: "center" },
  modalTitle: { fontSize: 18, fontFamily: "Poppins_700Bold", color: "#fff", flex: 1 },
  modalSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#A8D96C" },
  modalFooter: { padding: 16, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#D4EDD4" },
  downloadBtn: {
    backgroundColor: "#0B3D2E", borderRadius: 14, height: 52,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  downloadBtnTxt: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#A8D96C" },
});
