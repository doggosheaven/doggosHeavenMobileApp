import { useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, Modal,
  TextInput, KeyboardAvoidingView, Platform, Switch,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { getAuth } from "../../utils/authStorage";
import { BASE_URL } from "../../constants/api";

const EMOJI_OPTIONS = [
  "✂️", "🏠", "🎓", "🌞", "🎮", "🩺", "🌳", "🛁", "💆", "💳",
  "🐾", "🐕", "🐩", "🦮", "🐈", "🏋️", "🎯", "🧴", "💉", "🍖",
];

const FALLBACK_SERVICES = [
  { _id: "1", purpose: "Boarding", price: 900, halfdayprice: null, emoji: "🏠", description: "Overnight stay with meals & care" },
  { _id: "2", purpose: "Day Boarding", price: 600, halfdayprice: null, emoji: "🌞", description: "Full day supervised care & play" },
  { _id: "3", purpose: "Boarding Wallet (15 days)", price: 11500, halfdayprice: null, emoji: "💳", description: "15-day boarding package at a great value" },
  { _id: "4", purpose: "Day School (26 days)", price: 13650, halfdayprice: null, emoji: "🎓", description: "26-day training & socializing program" },
  { _id: "5", purpose: "Play School (26 days)", price: 9650, halfdayprice: null, emoji: "🎮", description: "26-day fun activities & early training" },
  { _id: "6", purpose: "Grooming (small breed)", price: 800, halfdayprice: null, emoji: "✂️", description: "Bath, trim & nail clipping for small breeds" },
  { _id: "7", purpose: "Grooming (large breed)", price: 900, halfdayprice: null, emoji: "✂️", description: "Bath, trim & nail clipping for large breeds" },
  { _id: "8", purpose: "Full Grooming (small breed)", price: 1500, halfdayprice: null, emoji: "🛁", description: "Complete grooming package for small breeds" },
  { _id: "9", purpose: "Full Grooming (large breed)", price: 1600, halfdayprice: null, emoji: "🛁", description: "Complete grooming package for large breeds" },
  { _id: "10", purpose: "Oil Massage", price: 250, halfdayprice: null, emoji: "💆", description: "Relaxing oil massage for your pet" },
];

const emptyForm = () => ({
  purpose: "", emoji: "🐾", description: "",
  price: "", halfdayprice: "", consultationPricePvt: "",
  isSubscriptionAvailable: false, subscriptionPrice: "",
  customFields: [],
});

export default function AdminServices() {
  const router = useRouter();
  const [services, setServices] = useState(FALLBACK_SERVICES);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [token, setToken] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [emojiPickerVisible, setEmojiPickerVisible] = useState(false);

  const loadServices = useCallback(async () => {
    try {
      const { token: t } = await getAuth();
      setToken(t || "");
      const res = await fetch(`${BASE_URL}/api/v1/visit/getallvisittypes`, {
        headers: { Authorization: t || "" },
      });
      const data = await res.json();
      if (data.success && data.visitTypes.length > 0) setServices(data.visitTypes);
    } catch (e) { console.log(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { loadServices(); }, [loadServices]));

  const openAdd = () => { setForm(emptyForm()); setEditingId(null); setEmojiPickerVisible(false); setModalVisible(true); };
  const openEdit = (s) => {
    setForm({
      purpose: s.purpose || "",
      emoji: s.emoji || "🐾",
      description: s.description || "",
      price: s.price != null ? String(s.price) : "",
      halfdayprice: s.halfdayprice != null ? String(s.halfdayprice) : "",
      consultationPricePvt: s.consultationPricePvt != null ? String(s.consultationPricePvt) : "",
      isSubscriptionAvailable: s.isSubscriptionAvailable || false,
      subscriptionPrice: s.subscriptionPrice != null ? String(s.subscriptionPrice) : "",
      customFields: s.customFields || [],
    });
    setEditingId(s._id);
    setEmojiPickerVisible(false);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.purpose.trim()) return Alert.alert("Error", "Service name is required.");
    setSaving(true);
    try {
      const body = {
        purpose: form.purpose.trim(),
        emoji: form.emoji,
        description: form.description.trim(),
        price: form.price ? Number(form.price) : null,
        halfdayprice: form.halfdayprice ? Number(form.halfdayprice) : null,
        consultationPricePvt: form.consultationPricePvt ? Number(form.consultationPricePvt) : null,
        isSubscriptionAvailable: form.isSubscriptionAvailable,
        subscriptionPrice: form.subscriptionPrice ? Number(form.subscriptionPrice) : null,
        customFields: form.customFields.filter(f => f.label.trim()),
      };
      const url = editingId
        ? `${BASE_URL}/api/v1/visit/updatevisittype/${editingId}`
        : `${BASE_URL}/api/v1/visit/addvisittype`;
      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", Authorization: token },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setModalVisible(false);
        loadServices();
        Alert.alert("Success", editingId ? "Service updated!" : "Service created!");
      } else Alert.alert("Error", data.message);
    } catch { Alert.alert("Error", "Network error"); }
    finally { setSaving(false); }
  };

  const handleDelete = (id, name) => {
    Alert.alert("Delete Service", `Delete "${name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          try {
            const res = await fetch(`${BASE_URL}/api/v1/visit/deletevisittype/${id}`, {
              method: "DELETE", headers: { Authorization: token },
            });
            const data = await res.json();
            if (data.success) setServices(prev => prev.filter(s => s._id !== id));
            else Alert.alert("Error", data.message);
          } catch { Alert.alert("Error", "Network error"); }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="close" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Services</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd} activeOpacity={0.8}>
          <Ionicons name="add" size={20} color="#0B3D2E" />
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0B3D2E" style={{ flex: 1 }} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadServices(); }} tintColor="#0B3D2E" />}
        >
          {services.map((s) => (
            <View key={s._id} style={styles.card}>
              {/* Top */}
              <View style={styles.cardTop}>
                <View style={styles.emojiBox}>
                  <Text style={styles.emojiText}>{s.emoji || "🐾"}</Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.serviceName}>{s.purpose}</Text>
                  {s.description ? <Text style={styles.serviceDesc} numberOfLines={2}>{s.description}</Text> : null}
                </View>
              </View>

              {/* Price chips */}
              <View style={styles.priceRow}>
                {s.price != null && (
                  <View style={styles.priceTag}>
                    <Ionicons name="sunny-outline" size={11} color="#3E7B27" />
                    <Text style={styles.priceTagText}>Full ₹{s.price}</Text>
                  </View>
                )}
                {s.halfdayprice != null && (
                  <View style={styles.priceTag}>
                    <Ionicons name="time-outline" size={11} color="#3E7B27" />
                    <Text style={styles.priceTagText}>Half ₹{s.halfdayprice}</Text>
                  </View>
                )}
                {s.consultationPricePvt != null && (
                  <View style={styles.priceTag}>
                    <Ionicons name="medkit-outline" size={11} color="#3E7B27" />
                    <Text style={styles.priceTagText}>Consult ₹{s.consultationPricePvt}</Text>
                  </View>
                )}
                {s.isSubscriptionAvailable && s.subscriptionPrice != null && (
                  <View style={[styles.priceTag, { backgroundColor: "#E8F5E8" }]}>
                    <Ionicons name="checkmark-circle" size={11} color="#0B3D2E" />
                    <Text style={[styles.priceTagText, { color: "#0B3D2E" }]}>Sub ₹{s.subscriptionPrice}/day</Text>
                  </View>
                )}
              </View>

              <View style={styles.divider} />
              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(s)} activeOpacity={0.8}>
                  <Ionicons name="pencil-outline" size={15} color="#0B3D2E" />
                  <Text style={styles.editBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(s._id, s.purpose)} activeOpacity={0.8}>
                  <Ionicons name="trash-outline" size={15} color="#C62828" />
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingId ? "Edit Service" : "Add Service"}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color="#0B3D2E" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              {/* Emoji Picker */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Icon</Text>
                <TouchableOpacity style={styles.emojiSelector} onPress={() => setEmojiPickerVisible(!emojiPickerVisible)} activeOpacity={0.8}>
                  <Text style={styles.selectedEmoji}>{form.emoji}</Text>
                  <Text style={styles.emojiSelectorText}>Tap to change icon</Text>
                  <Ionicons name={emojiPickerVisible ? "chevron-up" : "chevron-down"} size={16} color="#666" />
                </TouchableOpacity>
                {emojiPickerVisible && (
                  <View style={styles.emojiGrid}>
                    {EMOJI_OPTIONS.map((e) => (
                      <TouchableOpacity
                        key={e}
                        style={[styles.emojiOption, form.emoji === e && styles.emojiOptionActive]}
                        onPress={() => { setForm(p => ({ ...p, emoji: e })); setEmojiPickerVisible(false); }}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.emojiOptionText}>{e}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Service Name */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Service Name *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. Full Grooming"
                  placeholderTextColor="#aaa"
                  value={form.purpose}
                  onChangeText={(v) => setForm(p => ({ ...p, purpose: v }))}
                />
              </View>

              {/* Description */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Description</Text>
                <TextInput
                  style={[styles.formInput, styles.textArea]}
                  placeholder="e.g. Bath, trim & nail clipping for your pet"
                  placeholderTextColor="#aaa"
                  value={form.description}
                  onChangeText={(v) => setForm(p => ({ ...p, description: v }))}
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Prices */}
              <View style={styles.rowGroup}>
                <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.formLabel}>Full Day Price (₹)</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. 900"
                    placeholderTextColor="#aaa"
                    value={form.price}
                    onChangeText={(v) => setForm(p => ({ ...p, price: v }))}
                    keyboardType="numeric"
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Half Day Price (₹)</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. 500"
                    placeholderTextColor="#aaa"
                    value={form.halfdayprice}
                    onChangeText={(v) => setForm(p => ({ ...p, halfdayprice: v }))}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Consultation Price */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Consultation Price (₹) — for Vet</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. 400 (optional)"
                  placeholderTextColor="#aaa"
                  value={form.consultationPricePvt}
                  onChangeText={(v) => setForm(p => ({ ...p, consultationPricePvt: v }))}
                  keyboardType="numeric"
                />
              </View>

              {/* Subscription Toggle */}
              <View style={styles.switchRow}>
                <View>
                  <Text style={styles.formLabel}>Subscription Available</Text>
                  <Text style={styles.switchSub}>Show subscription badge on customer app</Text>
                </View>
                <Switch
                  value={form.isSubscriptionAvailable}
                  onValueChange={(v) => setForm(p => ({ ...p, isSubscriptionAvailable: v }))}
                  trackColor={{ false: "#D4EDD4", true: "#A8D96C" }}
                  thumbColor={form.isSubscriptionAvailable ? "#0B3D2E" : "#fff"}
                />
              </View>

              {/* Subscription Price — only if toggle on */}
              {form.isSubscriptionAvailable && (
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Subscription Price (₹/day)</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. 820"
                    placeholderTextColor="#aaa"
                    value={form.subscriptionPrice}
                    onChangeText={(v) => setForm(p => ({ ...p, subscriptionPrice: v }))}
                    keyboardType="numeric"
                  />
                </View>
              )}

              {/* Custom Fields */}
              <View style={styles.formGroup}>
                <View style={styles.customFieldsHeader}>
                  <Text style={styles.formLabel}>Additional Fields</Text>
                  <TouchableOpacity
                    style={styles.addFieldBtn}
                    onPress={() => setForm(p => ({ ...p, customFields: [...p.customFields, { label: "", value: "" }] }))}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add-circle-outline" size={16} color="#0B3D2E" />
                    <Text style={styles.addFieldBtnText}>Add Field</Text>
                  </TouchableOpacity>
                </View>
                {form.customFields.map((field, idx) => (
                  <View key={idx} style={styles.customFieldRow}>
                    <TextInput
                      style={[styles.formInput, { flex: 1, marginRight: 6 }]}
                      placeholder="Field name"
                      placeholderTextColor="#aaa"
                      value={field.label}
                      onChangeText={(v) => setForm(p => {
                        const updated = [...p.customFields];
                        updated[idx] = { ...updated[idx], label: v };
                        return { ...p, customFields: updated };
                      })}
                    />
                    <TextInput
                      style={[styles.formInput, { flex: 1, marginRight: 6 }]}
                      placeholder="Value"
                      placeholderTextColor="#aaa"
                      value={field.value}
                      onChangeText={(v) => setForm(p => {
                        const updated = [...p.customFields];
                        updated[idx] = { ...updated[idx], value: v };
                        return { ...p, customFields: updated };
                      })}
                    />
                    <TouchableOpacity
                      onPress={() => setForm(p => ({ ...p, customFields: p.customFields.filter((_, i) => i !== idx) }))}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="close-circle" size={22} color="#C62828" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
                {saving ? <ActivityIndicator color="#A8D96C" /> : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#A8D96C" />
                    <Text style={styles.saveBtnText}>{editingId ? "Update Service" : "Create Service"}</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F7F0" },
  header: {
    backgroundColor: "#0B3D2E", paddingHorizontal: 20,
    paddingTop: 52, paddingBottom: 16,
    flexDirection: "row", alignItems: "center",
  },
  backBtn: { width: 36, height: 36, justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 20, fontFamily: "Poppins_700Bold", color: "#fff", textAlign: "center" },
  addBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#A8D96C", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
  },
  addBtnText: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },

  scroll: { padding: 16, paddingBottom: 40 },

  card: {
    backgroundColor: "#fff", borderRadius: 16, padding: 14,
    marginBottom: 12, elevation: 2, borderWidth: 1, borderColor: "#D4EDD4",
  },
  cardTop: { flexDirection: "row", alignItems: "flex-start", marginBottom: 10 },
  emojiBox: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: "#E8F5E8", justifyContent: "center", alignItems: "center", marginRight: 12,
  },
  emojiText: { fontSize: 26 },
  cardInfo: { flex: 1 },
  serviceName: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 4 },
  serviceDesc: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#666" },
  priceRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  priceTag: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#F0F7F0", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
  },
  priceTagText: { fontSize: 11, fontFamily: "Poppins_700Bold", color: "#3E7B27" },
  divider: { height: 1, backgroundColor: "#E8F5E8", marginBottom: 10 },
  actionRow: { flexDirection: "row", gap: 8 },
  editBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, backgroundColor: "#E8F5E8", borderRadius: 10, paddingVertical: 8,
  },
  editBtnText: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  deleteBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, backgroundColor: "#FFF0F0", borderRadius: 10, paddingVertical: 8,
  },
  deleteBtnText: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#C62828" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalBox: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "90%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 18, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },

  formGroup: { marginBottom: 14 },
  formLabel: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 6 },
  formInput: {
    borderWidth: 1, borderColor: "#D4EDD4", borderRadius: 12,
    backgroundColor: "#F0F7F0", paddingHorizontal: 14, height: 48,
    fontSize: 14, fontFamily: "Inter_400Regular", color: "#1A1A1A",
  },
  textArea: { height: 80, paddingTop: 12, textAlignVertical: "top" },
  rowGroup: { flexDirection: "row" },

  switchRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#F0F7F0", borderRadius: 12, padding: 14, marginBottom: 14,
  },
  switchSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#999", marginTop: 2 },

  emojiSelector: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderWidth: 1, borderColor: "#D4EDD4", borderRadius: 12,
    backgroundColor: "#F0F7F0", paddingHorizontal: 14, height: 52,
  },
  selectedEmoji: { fontSize: 26 },
  emojiSelectorText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: "#666" },
  emojiGrid: {
    flexDirection: "row", flexWrap: "wrap", gap: 8,
    backgroundColor: "#F0F7F0", borderRadius: 12, padding: 12, marginTop: 8,
  },
  emojiOption: {
    width: 44, height: 44, borderRadius: 10,
    backgroundColor: "#fff", justifyContent: "center", alignItems: "center",
    borderWidth: 1, borderColor: "#D4EDD4",
  },
  emojiOptionActive: { borderColor: "#0B3D2E", backgroundColor: "#E8F5E8", borderWidth: 2 },
  emojiOptionText: { fontSize: 22 },

  saveBtn: {
    backgroundColor: "#0B3D2E", borderRadius: 14, height: 52,
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, marginTop: 4, marginBottom: 20,
  },
  saveBtnText: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#A8D96C" },

  customFieldsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  addFieldBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#E8F5E8", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  addFieldBtnText: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  customFieldRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
});
