import { useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { getAuth } from "../../utils/authStorage";
import { BASE_URL } from "../../constants/api";


export default function StaffMyServices() {
  const router = useRouter();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [token, setToken] = useState("");
  const [search, setSearch] = useState("");


  const load = useCallback(async () => {
    try {
      const { token: t } = await getAuth();
      setToken(t || "");
      const res = await fetch(`${BASE_URL}/api/v1/visit/getallvisittypes`, {
        headers: { Authorization: t || "" },
      });
      const json = await res.json();
      if (json.success) setServices(json.visitTypes || []);
    } catch { }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));


  const filtered = services.filter((s) =>
    s.purpose?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.8}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>My Services</Text>
        <View style={s.readOnlyBadge}>
          <Ionicons name="lock-closed" size={13} color="#0B3D2E" />
          <Text style={s.readOnlyTxt}>View only</Text>
        </View>
      </View>

      {/* Search */}
      <View style={s.searchBar}>
        <Ionicons name="search-outline" size={18} color="#999" style={{ marginRight: 8 }} />
        <TextInput
          style={s.searchInput}
          placeholder="Search services..."
          placeholderTextColor="#aaa"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={18} color="#ccc" />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0B3D2E" style={{ flex: 1 }} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#0B3D2E" />}
        >
          {/* Summary */}
          <View style={s.summaryRow}>
            <View style={s.summaryBox}>
              <Ionicons name="ribbon-outline" size={18} color="#0B3D2E" />
              <Text style={s.summaryVal}>{services.length}</Text>
              <Text style={s.summaryLabel}>Total Services</Text>
            </View>
            <View style={[s.summaryBox, { borderColor: "#3E7B27" }]}>
              <Ionicons name="cash-outline" size={18} color="#3E7B27" />
              <View style={{ flex: 1 }}>
                <Text style={[s.summaryVal, { color: "#3E7B27" }]} numberOfLines={1} adjustsFontSizeToFit>
                  {(() => {
                    const allPrices = services.flatMap(sv => (sv.priceTiers || []).map(t => Number(t.price) || 0)).filter(p => p > 0);
                    return allPrices.length > 0 ? `₹${Math.round(allPrices.reduce((a, b) => a + b, 0) / allPrices.length)}` : "—";
                  })()}
                </Text>
                <Text style={s.summaryLabel}>Avg Price</Text>
              </View>
            </View>
          </View>

          {filtered.length === 0 ? (
            <View style={s.emptyBox}>
              <Ionicons name="ribbon-outline" size={52} color="#A8D96C" />
              <Text style={s.emptyTitle}>No Services Found</Text>
              <Text style={s.emptySubtitle}>Services are managed by your admin</Text>
            </View>
          ) : (
            filtered.map((item) => (
              <View key={item._id} style={s.card}>
                {/* Top row: emoji + name + actions */}
                <View style={s.cardHeader}>
                  <View style={s.cardEmojiBox}>
                    <Text style={s.cardEmoji}>{item.emoji || "🐾"}</Text>
                  </View>
                  <View style={s.cardHeaderMid}>
                    <Text style={s.cardName}>{item.purpose}</Text>
                    {item.description ? (
                      <Text style={s.cardDesc}>{item.description}</Text>
                    ) : null}
                  </View>
                </View>

                <View style={s.divider} />

                {/* Price row */}
                <View style={s.priceRow}>
                  {item.priceTiers?.length > 0 ? item.priceTiers.map((t, i) => (
                    <View key={i} style={s.priceBadge}>
                      <Text style={s.priceText}>{t.label}: ₹{t.price}</Text>
                    </View>
                  )) : (
                    <View style={[s.priceBadge, { backgroundColor: "#E8F5E8" }]}>
                      <Text style={[s.priceText, { color: "#3E7B27" }]}>Free / On Request</Text>
                    </View>
                  )}
                </View>

                {/* Custom fields — all shown */}
                {item.customFields?.length > 0 && (
                  <View style={s.customFieldsList}>
                    {item.customFields.map((cf, i) => (
                      <View key={i} style={[s.customFieldItem, i === item.customFields.length - 1 && { borderBottomWidth: 0 }]}>
                        <Text style={s.customFieldLabel}>{cf.label}</Text>
                        {cf.value ? (
                          <Text style={s.customFieldValue}>{cf.value}</Text>
                        ) : null}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))
          )}
          <View style={{ height: 30 }} />
        </ScrollView>
      )}

    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  readOnlyBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#A8D96C", borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  readOnlyTxt: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  container: { flex: 1, backgroundColor: "#F0F7F0" },
  header: {
    backgroundColor: "#0B3D2E", paddingHorizontal: 20,
    paddingTop: 52, paddingBottom: 16,
    flexDirection: "row", alignItems: "center", gap: 12,
  },
  headerTitle: { fontSize: 20, fontFamily: "Poppins_700Bold", color: "#fff", flex: 1 },
  backBtn: { width: 36, height: 36, justifyContent: "center" },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#A8D96C", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  addBtnTxt: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },

  searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#D4EDD4" },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: "#1A1A1A" },

  scroll: { padding: 16, paddingBottom: 40 },

  summaryRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  summaryBox: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fff", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#D4EDD4", elevation: 1 },
  summaryVal: { fontSize: 18, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  summaryLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#666" },

  // Service cards — full width list
  card: {
    backgroundColor: "#fff", borderRadius: 16, padding: 16,
    marginBottom: 12, elevation: 2, borderWidth: 1, borderColor: "#D4EDD4",
  },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  cardEmojiBox: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: "#E8F5E8", justifyContent: "center", alignItems: "center",
    flexShrink: 0,
  },
  cardEmoji: { fontSize: 26 },
  cardHeaderMid: { flex: 1 },
  cardName: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 4 },
  cardDesc: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#666", lineHeight: 18 },
  cardActions: { flexDirection: "row", gap: 8, flexShrink: 0 },
  editBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: "#E8F5E8", justifyContent: "center", alignItems: "center" },
  deleteBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: "#FFEBEE", justifyContent: "center", alignItems: "center" },

  divider: { height: 1, backgroundColor: "#E8F5E8", marginVertical: 12 },

  priceRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  priceBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#E8F5E8", borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: "#D4EDD4",
  },
  priceText: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#3E7B27" },

  customFieldsList: {
    backgroundColor: "#F8FFF8", borderRadius: 12,
    borderWidth: 1, borderColor: "#D4EDD4", overflow: "hidden",
  },
  customFieldItem: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: "#E8F5E8",
  },
  customFieldLabel: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E", flex: 1 },
  customFieldValue: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#3E7B27", textAlign: "right", flex: 1 },

  emptyBox: { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 16, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  emptySubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#999" },

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "85%" },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  sheetTitle: { fontSize: 18, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },

  formField: { marginBottom: 14 },
  formLabel: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 5 },
  formInput: { borderWidth: 1, borderColor: "#D4EDD4", borderRadius: 10, backgroundColor: "#F0F7F0", paddingHorizontal: 12, height: 46, fontSize: 14, fontFamily: "Inter_400Regular", color: "#1A1A1A" },

  saveBtn: { backgroundColor: "#0B3D2E", borderRadius: 14, height: 52, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 4 },
  saveBtnTxt: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#A8D96C" },

  // Emoji picker
  emojiPickerBtn: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderWidth: 1, borderColor: "#D4EDD4", borderRadius: 10,
    backgroundColor: "#F0F7F0", paddingHorizontal: 12, height: 46,
  },
  emojiPickerSelected: { fontSize: 24 },
  emojiPickerBtnTxt: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: "#666" },

  emojiPanel: {
    marginTop: 8, borderWidth: 1, borderColor: "#D4EDD4",
    borderRadius: 14, backgroundColor: "#fff", overflow: "hidden",
  },
  emojiCatBar: { backgroundColor: "#F0F7F0", paddingVertical: 8, maxHeight: 44 },
  emojiCatChip: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#D4EDD4",
  },
  emojiCatChipActive: { backgroundColor: "#0B3D2E", borderColor: "#0B3D2E" },
  emojiCatTxt: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#3E7B27" },
  emojiCatTxtActive: { fontFamily: "Poppins_700Bold", color: "#A8D96C" },

  emojiGrid: {
    flexDirection: "row", flexWrap: "wrap",
    padding: 10, gap: 4,
  },
  emojiItem: {
    width: 44, height: 44, borderRadius: 10,
    justifyContent: "center", alignItems: "center",
    backgroundColor: "#F0F7F0",
  },
  emojiItemActive: { backgroundColor: "#A8D96C", borderWidth: 2, borderColor: "#0B3D2E" },
  emojiItemTxt: { fontSize: 22 },

  // Custom fields in form
  customSection: { marginTop: 4, marginBottom: 14, borderWidth: 1, borderColor: "#D4EDD4", borderRadius: 14, padding: 14, backgroundColor: "#F8FFF8" },
  customSectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  customSectionLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  customSectionTitle: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  addFieldBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#A8D96C", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  addFieldBtnTxt: { fontSize: 11, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },

  emptyFieldBox: { alignItems: "center", paddingVertical: 16, gap: 4 },
  emptyFieldTxt: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  emptyFieldSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#999" },

  customFieldRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 10 },
  customFieldNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#0B3D2E", justifyContent: "center", alignItems: "center", marginTop: 11 },
  customFieldNumTxt: { fontSize: 11, fontFamily: "Poppins_700Bold", color: "#A8D96C" },
  customFieldInputs: { flex: 1 },
  customFieldInput: { height: 42 },
  removeFieldBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: "#FFEBEE", justifyContent: "center", alignItems: "center", marginTop: 8 },
});
