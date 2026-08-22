import { useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput, Modal,
  KeyboardAvoidingView, Platform, Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { getAuth } from "../../utils/authStorage";
import { BASE_URL } from "../../constants/api";
import { ErrorState } from "../../components/ScreenState";
import { registerCacheReset } from "../../utils/sessionCache";

const TABS = ["All Items", "Alert List"];
const ITEM_TYPES = ["disposable", "injection", "medicine", "vaccine"];
const STOCK_UNITS = ["ml", "item", "tablet", "mg"];

const emptyForm = () => ({
  itemName: "", itemType: "medicine", stock: "", stockUnit: "item",
  unitCostPrice: "", unitMinRetailPriceNGO: "", unitMaxRetailPriceCustomer: "",
  supplierName: "", supplierContact: "", supplierEmail: "",
  volumeML: "", alertThreshold: "",
});

let _cachedInventory = null;
let _cachedAlertList = null;
let _cachedInvToken = "";

registerCacheReset(() => { _cachedInventory = null; _cachedAlertList = null; _cachedInvToken = ""; });

export default function StaffInventory() {
  const router = useRouter();
  const [tab, setTab] = useState("All Items");
  const [inventory, setInventory] = useState(_cachedInventory || []);
  const [alertList, setAlertList] = useState(_cachedAlertList || []);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(!_cachedInventory);
  const [loadError, setLoadError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [token, setToken] = useState(_cachedInvToken);

  const [addModal, setAddModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [viewModal, setViewModal] = useState(false);
  const [viewItem, setViewItem] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  const loadInventory = useCallback(async () => {
    try {
      const { token: t } = await getAuth();
      setToken(t || "");
      const [invRes, alertRes] = await Promise.all([
        fetch(`${BASE_URL}/api/v1/inventory/getallinventory`, { headers: { Authorization: t || "" } }),
        fetch(`${BASE_URL}/api/v1/inventory/getalertlist`, { headers: { Authorization: t || "" } }),
      ]);
      const invJson = await invRes.json();
      const alertJson = await alertRes.json();
      if (invJson.success) setInventory(invJson.items || []);
      if (alertJson.success) setAlertList(alertJson.items || alertJson.alertList || []);
    } catch (e) { if (__DEV__) console.log(e); setLoadError(true); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { loadInventory(); }, []));

  const handleAdd = async () => {
    if (!form.itemName.trim()) return Alert.alert("Error", "Item name is required.");
    if (!form.stock) return Alert.alert("Error", "Stock quantity is required.");
    setSaving(true);
    try {
      const res = await fetch(`${BASE_URL}/api/v1/inventory/addinventory`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token },
        body: JSON.stringify({
          ...form,
          stock: Number(form.stock),
          unitCostPrice: Number(form.unitCostPrice) || 0,
          unitMinRetailPriceNGO: Number(form.unitMinRetailPriceNGO) || 0,
          unitMaxRetailPriceCustomer: Number(form.unitMaxRetailPriceCustomer) || 0,
          volumeML: Number(form.volumeML) || 0,
          alertThreshold: Number(form.alertThreshold) || 0,
          supplier: { name: form.supplierName, contact: form.supplierContact, email: form.supplierEmail },
        }),
      });
      const json = await res.json();
      if (json.success) {
        setAddModal(false);
        setForm(emptyForm());
        loadInventory();
        Alert.alert("✅ Added", "Inventory item added successfully.");
      } else Alert.alert("Error", json.message);
    } catch { Alert.alert("Error", "Network error"); }
    finally { setSaving(false); }
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({
      itemName: item.itemName || "",
      itemType: item.itemType || "medicine",
      stock: String(item.stock ?? ""),
      stockUnit: item.stockUnit || "item",
      unitCostPrice: String(item.unitCostPrice ?? ""),
      unitMinRetailPriceNGO: String(item.unitMinRetailPriceNGO ?? ""),
      unitMaxRetailPriceCustomer: String(item.unitMaxRetailPriceCustomer ?? ""),
      supplierName: typeof item.supplier === "object" ? (item.supplier?.name || "") : "",
      supplierContact: typeof item.supplier === "object" ? (item.supplier?.contact || "") : "",
      supplierEmail: typeof item.supplier === "object" ? (item.supplier?.email || "") : "",
      volumeML: String(item.volumeML ?? ""),
      alertThreshold: String(item.alertThreshold ?? ""),
    });
    setAddModal(true);
  };

  const handleEdit = async () => {
    if (!form.itemName.trim()) return Alert.alert("Error", "Item name is required.");
    setSaving(true);
    try {
      const res = await fetch(`${BASE_URL}/api/v1/inventory/editinventory`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token },
        body: JSON.stringify({
          _id: editItem._id,
          itemName: form.itemName,
          itemType: form.itemType,
          stock: Number(form.stock) || 0,
          stockUnit: form.stockUnit,
          unitCostPrice: Number(form.unitCostPrice) || 0,
          unitMinRetailPriceNGO: Number(form.unitMinRetailPriceNGO) || 0,
          unitMaxRetailPriceCustomer: Number(form.unitMaxRetailPriceCustomer) || 0,
          volumeML: Number(form.volumeML) || 0,
          alertThreshold: Number(form.alertThreshold) || 0,
          supplier: { name: form.supplierName, contact: form.supplierContact, email: form.supplierEmail },
        }),
      });
      const json = await res.json();
      if (json.success) {
        setAddModal(false);
        setEditItem(null);
        setForm(emptyForm());
        loadInventory();
        Alert.alert("✅ Updated", "Inventory item updated successfully.");
      } else Alert.alert("Error", json.message);
    } catch { Alert.alert("Error", "Network error"); }
    finally { setSaving(false); }
  };

  const handleDelete = (id, name) => {
    Alert.alert("Delete Item", `Delete "${name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          try {
            const res = await fetch(`${BASE_URL}/api/v1/inventory/deleteinventory/${id}`, {
              method: "DELETE", headers: { Authorization: token },
            });
            const json = await res.json();
            if (json.success) {
              setInventory((prev) => prev.filter((i) => i._id !== id));
            } else Alert.alert("Error", json.message);
          } catch { Alert.alert("Error", "Network error"); }
        },
      },
    ]);
  };

  const displayList = tab === "Alert List" ? alertList
    : inventory.filter((i) => i.itemName?.toLowerCase().includes(search.toLowerCase()));

  const f = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.8}>
          <Ionicons name="close" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Inventory</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => { setForm(emptyForm()); setAddModal(true); }} activeOpacity={0.8}>
          <Ionicons name="add" size={18} color="#0B3D2E" />
          <Text style={s.addBtnTxt}>Add Item</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={s.tabRow}>
        {TABS.map((t) => (
          <TouchableOpacity key={t} style={[s.tab, tab === t && s.tabActive]} onPress={() => setTab(t)}>
            <Text style={[s.tabTxt, tab === t && s.tabTxtActive]}>{t}</Text>
            {t === "Alert List" && alertList.length > 0 && (
              <View style={s.badge}><Text style={s.badgeTxt}>{alertList.length}</Text></View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Search (All Items only) */}
      {tab === "All Items" && (
        <View style={s.searchBar}>
          <Ionicons name="search-outline" size={18} color="#999" style={{ marginRight: 8 }} />
          <TextInput
            style={s.searchInput} placeholder="Search inventory..." placeholderTextColor="#aaa"
            value={search} onChangeText={setSearch}
          />
          {search.length > 0 && <TouchableOpacity onPress={() => setSearch("")}><Ionicons name="close-circle" size={18} color="#ccc" /></TouchableOpacity>}
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color="#0B3D2E" style={{ flex: 1 }} />
      ) : loadError ? (
        <ErrorState
          message="Could not load this. Check your connection."
          onRetry={() => { setLoadError(false); setLoading(true); loadInventory(); }}
        />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadInventory(); }} tintColor="#0B3D2E" />}
        >
          {/* Summary */}
          {tab === "All Items" && (
            <View style={s.summaryRow}>
              <View style={s.summaryBox}>
                <Ionicons name="cube-outline" size={18} color="#0B3D2E" />
                <Text style={s.summaryVal}>{inventory.length}</Text>
                <Text style={s.summaryLabel}>Total Items</Text>
              </View>
              <View style={[s.summaryBox, { borderColor: "#C62828" }]}>
                <Ionicons name="warning-outline" size={18} color="#C62828" />
                <Text style={[s.summaryVal, { color: "#C62828" }]}>{alertList.length}</Text>
                <Text style={s.summaryLabel}>Low Stock</Text>
              </View>
            </View>
          )}

          {tab === "Alert List" && alertList.length > 0 && (
            <View style={s.alertBanner}>
              <Ionicons name="warning" size={16} color="#C62828" />
              <Text style={s.alertBannerTxt}>{alertList.length} items are running low on stock</Text>
            </View>
          )}

          {displayList.length === 0 ? (
            <View style={s.emptyBox}>
              <Ionicons name="cube-outline" size={52} color="#A8D96C" />
              <Text style={s.emptyTitle}>{tab === "Alert List" ? "No Low Stock Items" : "No Items Found"}</Text>
            </View>
          ) : (
            displayList.map((item) => (
              <TouchableOpacity key={item._id} style={s.card} onPress={() => { setViewItem(item); setViewModal(true); }} activeOpacity={0.85}>
                <View style={s.cardLeft}>
                  <View style={[s.typeIcon, { backgroundColor: tab === "Alert List" ? "#FFEBEE" : "#E8F5E8" }]}>
                    <Ionicons name="cube-outline" size={20} color={tab === "Alert List" ? "#C62828" : "#0B3D2E"} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.itemName}>{item.itemName}</Text>
                    <Text style={s.itemType}>{item.itemType}</Text>
                    <View style={s.stockRow}>
                      <Text style={[s.stockTxt, (item.stock <= (item.alertThreshold || 5)) && { color: "#C62828" }]}>
                        Stock: {item.stock} {item.stockUnit}
                      </Text>
                      {item.stock <= (item.alertThreshold || 5) && (
                        <View style={s.lowBadge}><Text style={s.lowBadgeTxt}>Low</Text></View>
                      )}
                    </View>
                  </View>
                </View>
                <View style={s.cardRight}>
                  <Text style={s.priceNGO}>NGO: ₹{item.unitMinRetailPriceNGO || 0}</Text>
                  <Text style={s.priceCust}>Cust: ₹{item.unitMaxRetailPriceCustomer || 0}</Text>
                  <View style={{ flexDirection: "row", gap: 10, marginTop: 6 }}>
                    <TouchableOpacity onPress={() => openEdit(item)}>
                      <Ionicons name="create-outline" size={16} color="#3E7B27" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(item._id, item.itemName)}>
                      <Ionicons name="trash-outline" size={16} color="#C62828" />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
          <View style={{ height: 30 }} />
        </ScrollView>
      )}

      {/* View Item Modal */}
      <Modal visible={viewModal} transparent animationType="slide" onRequestClose={() => setViewModal(false)}>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>{viewItem?.itemName}</Text>
              <TouchableOpacity onPress={() => setViewModal(false)}><Ionicons name="close" size={22} color="#0B3D2E" /></TouchableOpacity>
            </View>
            <ScrollView>
              {viewItem && [
                { label: "Item Type",       value: viewItem.itemType },
                { label: "Stock",           value: `${viewItem.stock} ${viewItem.stockUnit}` },
                { label: "Cost Price",      value: `₹${viewItem.unitCostPrice || 0}` },
                { label: "NGO Price",       value: `₹${viewItem.unitMinRetailPriceNGO || 0}` },
                { label: "Customer Price",  value: `₹${viewItem.unitMaxRetailPriceCustomer || 0}` },
                { label: "Volume (mL)",     value: viewItem.volumeML?.toString() || "—" },
                { label: "Alert Threshold", value: viewItem.alertThreshold?.toString() || "—" },
                { label: "Supplier",        value: typeof viewItem.supplier === "object" ? viewItem.supplier?.name : viewItem.supplier || "—" },
                { label: "Supplier Phone",  value: typeof viewItem.supplier === "object" ? viewItem.supplier?.contact || "—" : "—" },
              ].map((row, i, arr) => (
                <View key={row.label} style={[s.detailRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
                  <Text style={s.detailLabel}>{row.label}</Text>
                  <Text style={s.detailValue}>{row.value}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add / Edit Item Modal */}
      <Modal visible={addModal} transparent animationType="slide" onRequestClose={() => { setAddModal(false); setEditItem(null); }}>
        <KeyboardAvoidingView
          style={s.overlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
        >
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => {}} />
          <View style={[s.sheet, { maxHeight: "92%" }]}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>{editItem ? "Edit Item" : "Add Inventory Item"}</Text>
              <TouchableOpacity onPress={() => { setAddModal(false); setEditItem(null); }}><Ionicons name="close" size={22} color="#0B3D2E" /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {[
                { label: "Item Name *", key: "itemName", placeholder: "e.g. Rabies Vaccine" },
                { label: "Stock Qty *", key: "stock", placeholder: "e.g. 50", keyboard: "numeric" },
                { label: "Cost Price (₹)", key: "unitCostPrice", placeholder: "0", keyboard: "numeric" },
                { label: "NGO Price (₹)", key: "unitMinRetailPriceNGO", placeholder: "0", keyboard: "numeric" },
                { label: "Customer Price (₹)", key: "unitMaxRetailPriceCustomer", placeholder: "0", keyboard: "numeric" },
                { label: "Volume per unit (mL)", key: "volumeML", placeholder: "0", keyboard: "numeric" },
                { label: "Alert Threshold", key: "alertThreshold", placeholder: "5", keyboard: "numeric" },
                { label: "Supplier Name", key: "supplierName", placeholder: "Supplier company" },
                { label: "Supplier Phone", key: "supplierContact", placeholder: "Contact number", keyboard: "number-pad" },
                { label: "Supplier Email", key: "supplierEmail", placeholder: "Email", keyboard: "email-address" },
              ].map(({ label, key, placeholder, keyboard }) => (
                <View key={key} style={s.formField}>
                  <Text style={s.formLabel}>{label}</Text>
                  <TextInput
                    style={s.formInput} placeholder={placeholder} placeholderTextColor="#aaa"
                    value={form[key]} onChangeText={(v) => f(key, v)}
                    keyboardType={keyboard || "default"} autoCapitalize="none"
                  />
                </View>
              ))}

              {/* Stock Unit */}
              <View style={s.formField}>
                <Text style={s.formLabel}>Stock Unit</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {STOCK_UNITS.map((u) => (
                      <TouchableOpacity key={u} style={[s.typeChip, form.stockUnit === u && s.typeChipActive]} onPress={() => f("stockUnit", u)}>
                        <Text style={[s.typeChipTxt, form.stockUnit === u && s.typeChipTxtActive]}>{u}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* Item Type */}
              <View style={s.formField}>
                <Text style={s.formLabel}>Item Type</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {ITEM_TYPES.map((t) => (
                      <TouchableOpacity key={t} style={[s.typeChip, form.itemType === t && s.typeChipActive]} onPress={() => f("itemType", t)}>
                        <Text style={[s.typeChipTxt, form.itemType === t && s.typeChipTxtActive]}>{t}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              <TouchableOpacity style={s.saveBtn} onPress={editItem ? handleEdit : handleAdd} disabled={saving} activeOpacity={0.85}>
                {saving ? <ActivityIndicator color="#A8D96C" /> : (
                  <><Ionicons name="checkmark-circle-outline" size={20} color="#A8D96C" /><Text style={s.saveBtnTxt}>{editItem ? "Update Item" : "Add Item"}</Text></>
                )}
              </TouchableOpacity>
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
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
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#A8D96C", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  addBtnTxt: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },

  tabRow: { flexDirection: "row", backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#D4EDD4" },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: "#0B3D2E" },
  tabTxt: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#999" },
  tabTxtActive: { fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  badge: { backgroundColor: "#C62828", borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
  badgeTxt: { fontSize: 10, fontFamily: "Poppins_700Bold", color: "#fff" },

  searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#D4EDD4" },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: "#1A1A1A" },

  scroll: { padding: 16, paddingBottom: 40 },

  summaryRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  summaryBox: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fff", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#D4EDD4", elevation: 1 },
  summaryVal: { fontSize: 18, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  summaryLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#666" },

  alertBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FFEBEE", borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: "#FFCDD2" },
  alertBannerTxt: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#C62828" },

  card: { backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 10, elevation: 2, borderWidth: 1, borderColor: "#D4EDD4", flexDirection: "row", alignItems: "center" },
  cardLeft: { flex: 1, flexDirection: "row", alignItems: "flex-start", gap: 10 },
  typeIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  itemName: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 2 },
  itemType: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#666", marginBottom: 4 },
  stockRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  stockTxt: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#3E7B27" },
  lowBadge: { backgroundColor: "#FFEBEE", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  lowBadgeTxt: { fontSize: 10, fontFamily: "Poppins_700Bold", color: "#C62828" },
  cardRight: { alignItems: "flex-end" },
  priceNGO: { fontSize: 11, fontFamily: "Poppins_700Bold", color: "#3E7B27" },
  priceCust: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#666" },

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  sheetTitle: { fontSize: 18, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  detailRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F0F7F0" },
  detailLabel: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#666" },
  detailValue: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#0B3D2E", textAlign: "right", flex: 1, marginLeft: 8 },

  formField: { marginBottom: 12 },
  formLabel: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 5 },
  formInput: { borderWidth: 1, borderColor: "#D4EDD4", borderRadius: 10, backgroundColor: "#F0F7F0", paddingHorizontal: 12, height: 44, fontSize: 14, fontFamily: "Inter_400Regular", color: "#1A1A1A" },
  typeChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: "#F0F7F0", borderWidth: 1, borderColor: "#D4EDD4" },
  typeChipActive: { backgroundColor: "#0B3D2E", borderColor: "#0B3D2E" },
  typeChipTxt: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#3E7B27" },
  typeChipTxtActive: { color: "#A8D96C", fontFamily: "Poppins_700Bold" },
  saveBtn: { backgroundColor: "#0B3D2E", borderRadius: 14, height: 52, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 8 },
  saveBtnTxt: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#A8D96C" },

  emptyBox: { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 16, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
});
