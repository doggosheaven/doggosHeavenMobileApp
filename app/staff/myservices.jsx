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

const emptyForm = () => ({ purpose: "", emoji: "🐾", description: "", customFields: [], priceTiers: [] });
const emptyField = () => ({ label: "", value: "" });
const emptyTier = () => ({ label: "", price: "" });

const EMOJI_CATEGORIES = [
  {
    label: "Animals",
    emojis: ["🐶","🐱","🐇","🐹","🐾","🐺","🐈","🐔","🐦","🐢","🐠","🐍","🦜","🦝","🦚","🦛"],
  },
  {
    label: "Medical",
    emojis: ["🏥","💉","💊","🩺","⚕️","🩹","🪠","🔬","🩸","🪡","📊","📋"],
  },
  {
    label: "Services",
    emojis: ["✂️","🛁","🧴","🧹","🛍️","🏠","🌟","⭐","🏆","🎁","🔑","💼"],
  },
  {
    label: "Food & Care",
    emojis: ["🥨","🐾","🍖","🥩","🌿","🌾","🧄","🥛","🍎","🥕","🌻","🌼"],
  },
  {
    label: "Activities",
    emojis: ["🎾","⚽","🏃","🚶","🏊","🛶","🏋️","🧘","🎯","🎸","🎵","🌈"],
  },
];

export default function StaffMyServices() {
  const router = useRouter();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [token, setToken] = useState("");
  const [search, setSearch] = useState("");

  const [addModal, setAddModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

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

  const handleAdd = async () => {
    if (!form.purpose.trim()) return Alert.alert("Error", "Service name is required.");
    setSaving(true);
    try {
      const res = await fetch(`${BASE_URL}/api/v1/visit/addvisittype`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token },
        body: JSON.stringify({
          purpose: form.purpose.trim(),
          emoji: form.emoji.trim() || "🐾",
          price: null,
          description: form.description.trim(),
          customFields: form.customFields.filter((f) => f.label.trim()),
          priceTiers: form.priceTiers.filter((t) => t.label.trim() && Number(t.price) > 0).map((t) => ({ label: t.label.trim(), price: Number(t.price) })),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setAddModal(false);
        setForm(emptyForm());
        load();
        Alert.alert("✅ Added", "Service added successfully.");
      } else Alert.alert("Error", json.message);
    } catch { Alert.alert("Error", "Network error"); }
    finally { setSaving(false); }
  };

  const handleEdit = async () => {
    if (!form.purpose.trim()) return Alert.alert("Error", "Service name is required.");
    setSaving(true);
    try {
      const res = await fetch(`${BASE_URL}/api/v1/visit/updatevisittype/${editItem._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: token },
        body: JSON.stringify({
          purpose: form.purpose.trim(),
          emoji: form.emoji.trim() || "🐾",
          price: null,
          description: form.description.trim(),
          customFields: form.customFields.filter((f) => f.label.trim()),
          priceTiers: form.priceTiers.filter((t) => t.label.trim() && Number(t.price) > 0).map((t) => ({ label: t.label.trim(), price: Number(t.price) })),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setEditModal(false);
        setEditItem(null);
        setForm(emptyForm());
        load();
        Alert.alert("✅ Updated", "Service updated successfully.");
      } else Alert.alert("Error", json.message);
    } catch { Alert.alert("Error", "Network error"); }
    finally { setSaving(false); }
  };

  const handleDelete = (item) => {
    Alert.alert("Delete Service", `Delete "${item.purpose}"? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          try {
            const res = await fetch(`${BASE_URL}/api/v1/visit/deletevisittype/${item._id}`, {
              method: "DELETE",
              headers: { Authorization: token },
            });
            const json = await res.json();
            if (json.success) {
              setServices((prev) => prev.filter((s) => s._id !== item._id));
              Alert.alert("✅ Deleted", "Service deleted successfully.");
            } else Alert.alert("Error", json.message);
          } catch { Alert.alert("Error", "Network error"); }
        },
      },
    ]);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({
      purpose: item.purpose || "",
      emoji: item.emoji || "🐾",
      description: item.description || "",
      customFields: item.customFields?.length ? item.customFields.map((f) => ({ label: f.label, value: f.value || "" })) : [],
      priceTiers: item.priceTiers?.length ? item.priceTiers.map((t) => ({ label: t.label, price: String(t.price) })) : [],
    });
    setEditModal(true);
  };

  const filtered = services.filter((s) =>
    s.purpose?.toLowerCase().includes(search.toLowerCase())
  );

  const f = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.8}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>My Services</Text>
        <TouchableOpacity
          style={s.addBtn}
          onPress={() => { setForm(emptyForm()); setAddModal(true); }}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={18} color="#0B3D2E" />
          <Text style={s.addBtnTxt}>Add</Text>
        </TouchableOpacity>
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
              <Text style={s.emptySubtitle}>Tap "Add" to create a new service</Text>
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
                  <View style={s.cardActions}>
                    <TouchableOpacity style={s.editBtn} onPress={() => openEdit(item)} activeOpacity={0.8}>
                      <Ionicons name="pencil-outline" size={15} color="#3E7B27" />
                    </TouchableOpacity>
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

      {/* Add Modal */}
      <Modal visible={addModal} transparent animationType="slide" onRequestClose={() => setAddModal(false)}>
        <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setAddModal(false)} />
          <View style={s.sheet}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Add New Service</Text>
              <TouchableOpacity onPress={() => setAddModal(false)}>
                <Ionicons name="close" size={22} color="#0B3D2E" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <ServiceForm form={form} f={f} />
              <TouchableOpacity style={s.saveBtn} onPress={handleAdd} disabled={saving} activeOpacity={0.85}>
                {saving ? <ActivityIndicator color="#A8D96C" /> : (
                  <><Ionicons name="checkmark-circle-outline" size={20} color="#A8D96C" /><Text style={s.saveBtnTxt}>Add Service</Text></>
                )}
              </TouchableOpacity>
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={editModal} transparent animationType="slide" onRequestClose={() => setEditModal(false)}>
        <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setEditModal(false)} />
          <View style={s.sheet}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Edit Service</Text>
              <TouchableOpacity onPress={() => setEditModal(false)}>
                <Ionicons name="close" size={22} color="#0B3D2E" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <ServiceForm form={form} f={f} />
              <TouchableOpacity style={s.saveBtn} onPress={handleEdit} disabled={saving} activeOpacity={0.85}>
                {saving ? <ActivityIndicator color="#A8D96C" /> : (
                  <><Ionicons name="checkmark-circle-outline" size={20} color="#A8D96C" /><Text style={s.saveBtnTxt}>Save Changes</Text></>
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

function ServiceForm({ form, f }) {
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(0);

  const addField = () => {
    if (form.customFields.length >= 10) return;
    f("customFields", [...form.customFields, emptyField()]);
  };
  const updateField = (i, key, val) => {
    f("customFields", form.customFields.map((cf, idx) => idx === i ? { ...cf, [key]: val } : cf));
  };
  const removeField = (i) => {
    f("customFields", form.customFields.filter((_, idx) => idx !== i));
  };

  const addTier = () => {
    if ((form.priceTiers || []).length >= 8) return;
    f("priceTiers", [...(form.priceTiers || []), emptyTier()]);
  };
  const updateTier = (i, key, val) => {
    f("priceTiers", (form.priceTiers || []).map((t, idx) => idx === i ? { ...t, [key]: val } : t));
  };
  const removeTier = (i) => {
    f("priceTiers", (form.priceTiers || []).filter((_, idx) => idx !== i));
  };

  return (
    <>
      {/* Service Name */}
      <View style={s.formField}>
        <Text style={s.formLabel}>Service Name *</Text>
        <TextInput
          style={s.formInput}
          placeholder="e.g. Grooming, Veterinary"
          placeholderTextColor="#aaa"
          value={form.purpose}
          onChangeText={(v) => f("purpose", v)}
          autoCapitalize="words"
        />
      </View>

      {/* Emoji Picker */}
      <View style={s.formField}>
        <Text style={s.formLabel}>Emoji</Text>
        <TouchableOpacity
          style={s.emojiPickerBtn}
          onPress={() => setEmojiPickerOpen((p) => !p)}
          activeOpacity={0.8}
        >
          <Text style={s.emojiPickerSelected}>{form.emoji || "🐾"}</Text>
          <Text style={s.emojiPickerBtnTxt}>Tap to change emoji</Text>
          <Ionicons
            name={emojiPickerOpen ? "chevron-up" : "chevron-down"}
            size={16}
            color="#666"
          />
        </TouchableOpacity>

        {emojiPickerOpen && (
          <View style={s.emojiPanel}>
            {/* Category tabs */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={s.emojiCatBar}
              contentContainerStyle={{ gap: 6, paddingHorizontal: 4 }}
            >
              {EMOJI_CATEGORIES.map((cat, i) => (
                <TouchableOpacity
                  key={i}
                  style={[s.emojiCatChip, activeCategory === i && s.emojiCatChipActive]}
                  onPress={() => setActiveCategory(i)}
                  activeOpacity={0.8}
                >
                  <Text style={[s.emojiCatTxt, activeCategory === i && s.emojiCatTxtActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Emoji grid */}
            <View style={s.emojiGrid}>
              {EMOJI_CATEGORIES[activeCategory].emojis.map((em) => (
                <TouchableOpacity
                  key={em}
                  style={[s.emojiItem, form.emoji === em && s.emojiItemActive]}
                  onPress={() => { f("emoji", em); setEmojiPickerOpen(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={s.emojiItemTxt}>{em}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Description */}
      <View style={s.formField}>
        <Text style={s.formLabel}>Description</Text>
        <TextInput
          style={s.formInput}
          placeholder="Short description (optional)"
          placeholderTextColor="#aaa"
          value={form.description}
          onChangeText={(v) => f("description", v)}
          autoCapitalize="none"
        />
      </View>

      {/* Price Tiers Section */}
      <View style={s.customSection}>
        <View style={s.customSectionHeader}>
          <View style={s.customSectionLeft}>
            <Ionicons name="pricetag-outline" size={16} color="#0B3D2E" />
            <Text style={s.customSectionTitle}>Price Options</Text>
          </View>
          <TouchableOpacity
            style={[s.addFieldBtn, (form.priceTiers || []).length >= 8 && { opacity: 0.4 }]}
            onPress={addTier}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={14} color="#0B3D2E" />
            <Text style={s.addFieldBtnTxt}>Add Option</Text>
          </TouchableOpacity>
        </View>

        {(form.priceTiers || []).length === 0 ? (
          <TouchableOpacity style={s.emptyFieldBox} onPress={addTier} activeOpacity={0.8}>
            <Ionicons name="add-circle-outline" size={22} color="#A8D96C" />
            <Text style={s.emptyFieldTxt}>Tap to add price options</Text>
            <Text style={s.emptyFieldSub}>e.g. Full Day: 2000, Half Day: 1200</Text>
          </TouchableOpacity>
        ) : (
          (form.priceTiers || []).map((t, i) => (
            <View key={i} style={s.customFieldRow}>
              <View style={s.customFieldNum}>
                <Text style={s.customFieldNumTxt}>{i + 1}</Text>
              </View>
              <View style={s.customFieldInputs}>
                <TextInput
                  style={[s.formInput, s.customFieldInput]}
                  placeholder="Option name (e.g. Full Day)"
                  placeholderTextColor="#aaa"
                  value={t.label}
                  onChangeText={(v) => updateTier(i, "label", v)}
                  autoCapitalize="words"
                />
                <TextInput
                  style={[s.formInput, s.customFieldInput, { marginTop: 6 }]}
                  placeholder="Price (e.g. 2000)"
                  placeholderTextColor="#aaa"
                  value={t.price}
                  onChangeText={(v) => updateTier(i, "price", v)}
                  keyboardType="numeric"
                />
              </View>
              <TouchableOpacity
                style={s.removeFieldBtn}
                onPress={() => removeTier(i)}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={16} color="#C62828" />
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      {/* Custom Fields Section */}
      <View style={s.customSection}>
        <View style={s.customSectionHeader}>
          <View style={s.customSectionLeft}>
            <Ionicons name="list-outline" size={16} color="#0B3D2E" />
            <Text style={s.customSectionTitle}>Additional Fields</Text>
          </View>
          <TouchableOpacity
            style={[s.addFieldBtn, form.customFields.length >= 10 && { opacity: 0.4 }]}
            onPress={addField}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={14} color="#0B3D2E" />
            <Text style={s.addFieldBtnTxt}>Add Field</Text>
          </TouchableOpacity>
        </View>

        {form.customFields.length === 0 ? (
          <TouchableOpacity style={s.emptyFieldBox} onPress={addField} activeOpacity={0.8}>
            <Ionicons name="add-circle-outline" size={22} color="#A8D96C" />
            <Text style={s.emptyFieldTxt}>Tap to add custom fields</Text>
            <Text style={s.emptyFieldSub}>e.g. Duration: 1 hour, Breed: All</Text>
          </TouchableOpacity>
        ) : (
          form.customFields.map((cf, i) => (
            <View key={i} style={s.customFieldRow}>
              <View style={s.customFieldNum}>
                <Text style={s.customFieldNumTxt}>{i + 1}</Text>
              </View>
              <View style={s.customFieldInputs}>
                <TextInput
                  style={[s.formInput, s.customFieldInput]}
                  placeholder="Field name (e.g. Duration)"
                  placeholderTextColor="#aaa"
                  value={cf.label}
                  onChangeText={(v) => updateField(i, "label", v)}
                  autoCapitalize="words"
                />
                <TextInput
                  style={[s.formInput, s.customFieldInput, { marginTop: 6 }]}
                  placeholder="Value (e.g. 1 hour)"
                  placeholderTextColor="#aaa"
                  value={cf.value}
                  onChangeText={(v) => updateField(i, "value", v)}
                  autoCapitalize="none"
                />
              </View>
              <TouchableOpacity
                style={s.removeFieldBtn}
                onPress={() => removeField(i)}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={16} color="#C62828" />
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
    </>
  );
}

const s = StyleSheet.create({
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
