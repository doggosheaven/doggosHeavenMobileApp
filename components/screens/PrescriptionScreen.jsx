import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, Modal, FlatList,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { getAuth } from "../../utils/authStorage";
import DatePickerField, { dateToISO } from "../../components/DatePickerField";
import { BASE_URL } from "../../constants/api";

const UNIT_LABELS = { items: "Items", tablets: "Tablets", ml: "ML", mg: "MG" };

const UNIT_TABS = [
  { key: "items",   label: "Items",   unit: "item",   icon: "cube-outline" },
  { key: "tablets", label: "Tablets", unit: "tablet", icon: "medical-outline" },
  { key: "ml",      label: "ML",      unit: "ml",     icon: "water-outline" },
  { key: "mg",      label: "MG",      unit: "mg",     icon: "flask-outline" },
];

/**
 * Shared by /staff/prescription and /admin/prescription. Deleting a prescription
 * is the only capability that differs between the two.
 */
export default function PrescriptionScreen({ canDelete = false }) {
  // Prescriptions list
  const [prescriptions, setPrescriptions] = useState([]);
  const [presLoading, setPresLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [expandedPres, setExpandedPres] = useState(null);
  const router = useRouter();
  const [token, setToken] = useState("");

  // Pet selector
  const [allPets, setAllPets] = useState([]);
  const [petsLoading, setPetsLoading] = useState(false);
  const [selectedPet, setSelectedPet] = useState(null);
  const [petModalVisible, setPetModalVisible] = useState(false);
  const [petFilter, setPetFilter] = useState("");

  // Form
  const [customerType, setCustomerType] = useState("pvtltd");
  const [diagnosis, setDiagnosis] = useState("");
  const [followUpDate, setFollowUpDate] = useState(null);
  const [followUpTime, setFollowUpTime] = useState("");
  const [followUpPurpose, setFollowUpPurpose] = useState("");

  // Medicine selection (flat list, no tab filtering)
  const [selected, setSelected] = useState({ items: [], tablets: [], ml: [], mg: [] });

  // Inventory
  const [inventory, setInventory] = useState([]);
  const [invLoading, setInvLoading] = useState(false);

  // Medicine picker modal
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const formatDateInput = (val) => {
    const digits = val.replace(/\D/g, "").slice(0, 8);
    if (digits.length > 4) return `${digits.slice(0,2)}/${digits.slice(2,4)}/${digits.slice(4)}`;
    if (digits.length > 2) return `${digits.slice(0,2)}/${digits.slice(2)}`;
    return digits;
  };

  const parseDateToISO = (ddmmyyyy) => {
    const digits = ddmmyyyy.replace(/\D/g, "");
    if (digits.length < 8) return undefined;
    const dd = digits.slice(0,2), mm = digits.slice(2,4), yyyy = digits.slice(4,8);
    return `${yyyy}-${mm}-${dd}`;
  };

  useFocusEffect(useCallback(() => {
    const init = async () => {
      const { token: t } = await getAuth();
      setToken(t || "");
      loadInventory(t || "");
      loadAllPets(t || "");
      loadMyPrescriptions(t || "");
    };
    init();
  }, []));

  const loadMyPrescriptions = async (t) => {
    setPresLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/v1/prescription/myprescriptions`, {
        headers: { Authorization: t || token },
      });
      const json = await res.json();
      setPrescriptions(json.data || []);
    } catch { setPrescriptions([]); }
    finally { setPresLoading(false); }
  };

  const loadAllPets = async (t) => {
    setPetsLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/v1/pet/getfilteredpetsbynameandphone?name=&phone=`, {
        headers: { Authorization: t },
      });
      const json = await res.json();
      setAllPets(json.pets || json.list || []);
    } catch { }
    finally { setPetsLoading(false); }
  };

  const loadInventory = async (t) => {
    setInvLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/v1/inventory/getallinventory`, {
        headers: { Authorization: t },
      });
      const json = await res.json();
      const list = json.items || json.inventory || json.data || [];
      setInventory(list);
    } catch { }
    finally { setInvLoading(false); }
  };

  const selectPet = (pet) => {
    setSelectedPet(pet);
    setPetModalVisible(false);
    setPetFilter("");
  };

  const filteredPets = petFilter.trim()
    ? allPets.filter(p =>
        p.name?.toLowerCase().includes(petFilter.toLowerCase()) ||
        p.owner?.name?.toLowerCase().includes(petFilter.toLowerCase()) ||
        p.owner?.phone?.includes(petFilter)
      )
    : allPets;

  // Get tab key from stockUnit
  const getTabKey = (stockUnit) => {
    if (stockUnit === "tablet") return "tablets";
    if (stockUnit === "ml") return "ml";
    if (stockUnit === "mg") return "mg";
    return "items";
  };

  const getFilteredInv = () => {
    if (!pickerSearch.trim()) return inventory;
    return inventory.filter(i =>
      i.itemName?.toLowerCase().includes(pickerSearch.toLowerCase()) ||
      i.medicineName?.toLowerCase().includes(pickerSearch.toLowerCase())
    );
  };

  const toggleItem = (item) => {
    const tabKey = getTabKey(item.stockUnit);
    setSelected(prev => {
      const arr = prev[tabKey];
      const exists = arr.find(x => x.id === item._id);
      if (exists) return { ...prev, [tabKey]: arr.filter(x => x.id !== item._id) };
      return { ...prev, [tabKey]: [...arr, { id: item._id, quantity: 1, name: item.itemName, stockUnit: item.stockUnit }] };
    });
  };

  const isItemSelected = (item) => {
    const tabKey = getTabKey(item.stockUnit);
    return selected[tabKey].find(x => x.id === item._id);
  };

  const updateQty = (tabKey, id, qty) => {
    const n = parseInt(qty) || 1;
    setSelected(prev => ({
      ...prev,
      [tabKey]: prev[tabKey].map(x => x.id === id ? { ...x, quantity: Math.max(1, n) } : x),
    }));
  };

  const removeItem = (tabKey, id) => {
    setSelected(prev => ({ ...prev, [tabKey]: prev[tabKey].filter(x => x.id !== id) }));
  };

  const totalSelected = Object.values(selected).reduce((s, arr) => s + arr.length, 0);

  const handleSubmit = async () => {
    if (!selectedPet) return Alert.alert("Required", "Please select a pet.");
    if (!diagnosis.trim()) return Alert.alert("Required", "Please enter a diagnosis.");
    if (totalSelected === 0) return Alert.alert("Required", "Add at least one medicine.");

    const hasPartial = (followUpDate || followUpTime || followUpPurpose) &&
      !(followUpDate && followUpTime && followUpPurpose);
    if (hasPartial) return Alert.alert("Follow-up", "Fill all follow-up fields or leave all empty.");

    // Validate quantities
    for (const [key, arr] of Object.entries(selected)) {
      for (const item of arr) {
        if (!item.quantity || item.quantity <= 0)
          return Alert.alert("Invalid", `Set a valid quantity for all ${key}.`);
      }
    }

    setSubmitting(true);
    try {
      const body = {
        petId: selectedPet._id,
        customerType,
        diagnosis: diagnosis.trim(),
        items:   selected.items.map(x => ({ id: x.id, quantity: x.quantity })),
        tablets: selected.tablets.map(x => ({ id: x.id, quantity: x.quantity })),
        ml:      selected.ml.map(x => ({ id: x.id, quantity: x.quantity })),
        mg:      selected.mg.map(x => ({ id: x.id, quantity: x.quantity })),
        nextFollowUp:    followUpDate ? dateToISO(followUpDate) : undefined,
        followUpTime:    followUpTime || undefined,
        followUpPurpose: followUpPurpose || undefined,
      };
      const res = await fetch(`${BASE_URL}/api/v1/prescription/addprescription`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        Alert.alert("✅ Success", "Prescription saved successfully!", [
          { text: "OK", onPress: () => {
            setDiagnosis("");
            setFollowUpDate(null); setFollowUpTime(""); setFollowUpPurpose("");
            setSelected({ items: [], tablets: [], ml: [], mg: [] });
            setCustomerType("pvtltd");
            setShowForm(false);
            setSelectedPet(null);
            loadMyPrescriptions(token);
          }},
        ]);
      } else {
        Alert.alert("Error", json.message || "Failed to save prescription.");
      }
    } catch {
      Alert.alert("Error", "Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (pres) => {
    Alert.alert(
      "Delete Prescription",
      `Delete prescription for ${pres.petId?.name || "this pet"}? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete", style: "destructive", onPress: async () => {
            setDeletingId(pres._id);
            try {
              const res = await fetch(`${BASE_URL}/api/v1/prescription/delete/${pres._id}`, {
                method: "DELETE",
                headers: { Authorization: token },
              });
              const json = await res.json();
              if (json.success) {
                setPrescriptions(prev => prev.filter(p => p._id !== pres._id));
                Alert.alert("✅ Deleted", "Prescription deleted successfully.");
              } else Alert.alert("Error", json.message);
            } catch { Alert.alert("Error", "Network error"); }
            finally { setDeletingId(null); }
          },
        },
      ]
    );
  };

  const renderPrescriptionCard = (pres) => {
    const isExpanded = expandedPres === pres._id;
    const allMeds = [
      ...(pres.items || []).map(m => ({ name: m.id?.itemName || "Item", qty: m.quantity, unit: "item" })),
      ...(pres.tablets || []).map(m => ({ name: m.id?.itemName || "Tablet", qty: m.quantity, unit: "tablet" })),
      ...(pres.ml || []).map(m => ({ name: m.id?.itemName || "ML", qty: m.quantity, unit: "ml" })),
      ...(pres.mg || []).map(m => ({ name: m.id?.itemName || "MG", qty: m.quantity, unit: "mg" })),
    ];
    const petName = pres.petId?.name || "Unknown Pet";
    return (
      <TouchableOpacity
        key={pres._id}
        style={s.presCard}
        onPress={() => setExpandedPres(isExpanded ? null : pres._id)}
        activeOpacity={0.85}
      >
        <View style={s.presCardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={s.petNameTag}>🐾 {petName}</Text>
            <Text style={s.presDiagnosis} numberOfLines={isExpanded ? undefined : 1}>{pres.diagnosis || "No diagnosis"}</Text>
            <Text style={s.presDate}>{new Date(pres.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</Text>
          </View>
          <View style={s.presBadge}>
            <Text style={s.presBadgeTxt}>₹{pres.price}</Text>
          </View>
          {canDelete && (
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation?.(); handleDelete(pres); }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              disabled={deletingId === pres._id}
            >
              {deletingId === pres._id
                ? <ActivityIndicator size="small" color="#C62828" style={{ marginLeft: 8 }} />
                : <Ionicons name="trash-outline" size={18} color="#C62828" style={{ marginLeft: 8 }} />}
            </TouchableOpacity>
          )}
          <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color="#3E7B27" style={{ marginLeft: canDelete ? 4 : 8 }} />
        </View>
        {isExpanded && (
          <View style={s.presBody}>
            <Text style={s.presBodyLabel}>Medicines</Text>
            {allMeds.length === 0
              ? <Text style={s.presBodySub}>No medicines</Text>
              : allMeds.map((m, i) => (
                  <Text key={i} style={s.presBodySub}>• {m.name} × {m.qty} {m.unit}</Text>
                ))
            }
            {pres.nextFollowUp && (
              <>
                <Text style={[s.presBodyLabel, { marginTop: 8 }]}>Follow-up</Text>
                <Text style={s.presBodySub}>{new Date(pres.nextFollowUp).toLocaleDateString("en-IN")} {pres.followUpTime ? `at ${pres.followUpTime}` : ""}</Text>
                {pres.followUpPurpose ? <Text style={s.presBodySub}>Purpose: {pres.followUpPurpose}</Text> : null}
              </>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.8}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Prescriptions</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Prescriptions List */}
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.presListHeader}>
          <Text style={s.presListTitle}>
            {presLoading ? "Loading..." : `${prescriptions.length} Prescription${prescriptions.length !== 1 ? "s" : ""}`}
          </Text>
          <TouchableOpacity
            style={s.addPresBtn}
            onPress={() => setShowForm(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle-outline" size={16} color="#fff" />
            <Text style={s.addPresBtnTxt}>Add Prescription</Text>
          </TouchableOpacity>
        </View>
        {presLoading
          ? <ActivityIndicator color="#0B3D2E" style={{ marginVertical: 30 }} />
          : prescriptions.length === 0
            ? (
              <View style={s.presEmpty}>
                <Ionicons name="document-text-outline" size={36} color="#A8D96C" />
                <Text style={s.presEmptyTxt}>No Prescription</Text>
              </View>
            )
            : prescriptions.map(renderPrescriptionCard)
        }
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Add Prescription Modal */}
      <Modal visible={showForm} animationType="slide" onRequestClose={() => { setShowForm(false); setSelectedPet(null); }}>
        <View style={s.container}>
          <View style={s.header}>
            <TouchableOpacity onPress={() => { setShowForm(false); setSelectedPet(null); }} style={s.backBtn} activeOpacity={0.8}>
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={s.headerTitle}>Add Prescription</Text>
            <View style={{ width: 36 }} />
          </View>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

              {/* Pet Selector */}
              <Text style={s.label}>Select Pet *</Text>
              {selectedPet ? (
                <View style={s.petCard}>
                  <View style={s.petCardAvatar}>
                    <Text style={s.petCardInitials}>{selectedPet.name?.slice(0,2).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.petCardName}>{selectedPet.name}</Text>
                    <Text style={s.petCardSub}>
                      {[selectedPet.breed, selectedPet.species, selectedPet.owner?.name].filter(Boolean).join(" • ")}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedPet(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-circle" size={22} color="#C62828" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={s.petSelectorBtn} onPress={() => setPetModalVisible(true)} activeOpacity={0.8}>
                  <Ionicons name="paw-outline" size={18} color="#3E7B27" />
                  <Text style={s.petSelectorTxt}>Tap to select pet</Text>
                  {petsLoading
                    ? <ActivityIndicator size="small" color="#0B3D2E" />
                    : <Ionicons name="chevron-down" size={18} color="#999" />}
                </TouchableOpacity>
              )}

              {/* Customer Type */}
              <Text style={s.label}>Customer Type *</Text>
              <View style={s.segRow}>
                {[{ v: "pvtltd", l: "Private" }, { v: "NGO", l: "NGO" }].map(ct => (
                  <TouchableOpacity
                    key={ct.v}
                    style={[s.segBtn, customerType === ct.v && s.segBtnActive]}
                    onPress={() => setCustomerType(ct.v)}
                    activeOpacity={0.8}
                  >
                    <Text style={[s.segTxt, customerType === ct.v && s.segTxtActive]}>{ct.l}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Diagnosis */}
              <Text style={s.label}>Diagnosis *</Text>
              <TextInput
                style={[s.inputBox, s.textArea]}
                placeholder="Enter diagnosis / condition..."
                placeholderTextColor="#aaa"
                value={diagnosis}
                onChangeText={setDiagnosis}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              {/* Medicines */}
              <View style={s.sectionRow}>
                <Text style={s.label}>Medicines</Text>
                <TouchableOpacity style={s.addMedBtn} onPress={() => { setPickerSearch(""); setPickerVisible(true); }} activeOpacity={0.8}>
                  <Ionicons name="add-circle-outline" size={16} color="#0B3D2E" />
                  <Text style={s.addMedTxt}>Add Medicine</Text>
                </TouchableOpacity>
              </View>

              {totalSelected === 0 ? (
                <View style={s.emptyMed}>
                  <Ionicons name="medkit-outline" size={28} color="#A8D96C" />
                  <Text style={s.emptyMedTxt}>No medicines added yet</Text>
                </View>
              ) : (
                UNIT_TABS.map(tab => (
                  selected[tab.key].length > 0 && (
                    <View key={tab.key} style={s.medGroup}>
                      <Text style={s.medGroupTitle}>{tab.label}</Text>
                      {selected[tab.key].map(item => (
                        <View key={item.id} style={s.medRow}>
                          <Ionicons name={tab.icon} size={16} color="#3E7B27" />
                          <Text style={s.medName} numberOfLines={1}>{item.name}</Text>
                          <View style={s.qtyBox}>
                            <TouchableOpacity onPress={() => updateQty(tab.key, item.id, Math.max(1, item.quantity - 1))} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                              <Ionicons name="remove-circle-outline" size={20} color="#0B3D2E" />
                            </TouchableOpacity>
                            <TextInput
                              style={s.qtyInput}
                              value={String(item.quantity)}
                              onChangeText={v => updateQty(tab.key, item.id, v)}
                              keyboardType="number-pad"
                              maxLength={4}
                            />
                            <TouchableOpacity onPress={() => updateQty(tab.key, item.id, item.quantity + 1)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                              <Ionicons name="add-circle-outline" size={20} color="#0B3D2E" />
                            </TouchableOpacity>
                          </View>
                          <TouchableOpacity onPress={() => removeItem(tab.key, item.id)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                            <Ionicons name="trash-outline" size={18} color="#C62828" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )
                ))
              )}

              {/* Follow-up */}
              <Text style={[s.label, { marginTop: 16 }]}>Follow-up (optional)</Text>
              <View style={s.followRow}>
                <DatePickerField
                  value={followUpDate}
                  onChange={setFollowUpDate}
                  placeholder="Select follow-up date"
                  style={{ field: { flex: 1 } }}
                />
                <View style={[s.inputBox, { flex: 1 }]}>
                  <Ionicons name="time-outline" size={14} color="#999" />
                  <TextInput
                    style={s.input}
                    placeholder="HH:MM"
                    placeholderTextColor="#aaa"
                    value={followUpTime}
                    onChangeText={(v) => {
                      const digits = v.replace(/\D/g, "").slice(0, 4);
                      setFollowUpTime(digits.length > 2 ? `${digits.slice(0,2)}:${digits.slice(2)}` : digits);
                    }}
                    keyboardType="number-pad"
                    maxLength={5}
                  />
                </View>
              </View>
              <View style={s.inputBox}>
                <Ionicons name="clipboard-outline" size={14} color="#999" />
                <TextInput
                  style={[s.input, { flex: 1 }]}
                  placeholder="Follow-up purpose"
                  placeholderTextColor="#aaa"
                  value={followUpPurpose}
                  onChangeText={setFollowUpPurpose}
                />
              </View>

              {/* Submit */}
              <TouchableOpacity
                style={[s.submitBtn, submitting && { opacity: 0.6 }]}
                onPress={handleSubmit}
                disabled={submitting}
                activeOpacity={0.85}
              >
                {submitting
                  ? <ActivityIndicator color="#A8D96C" />
                  : <>
                      <Ionicons name="save-outline" size={20} color="#A8D96C" />
                      <Text style={s.submitTxt}>Save Prescription</Text>
                    </>
                }
              </TouchableOpacity>
              <View style={{ height: 40 }} />
            </ScrollView>
          </KeyboardAvoidingView>

          {/* Pet Select Modal */}
          <Modal visible={petModalVisible} animationType="slide" transparent onRequestClose={() => { setPetModalVisible(false); setPetFilter(""); }}>
            <KeyboardAvoidingView style={s.pickerOverlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
              <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => { setPetModalVisible(false); setPetFilter(""); }} />
              <View style={s.pickerSheet}>
            <View style={s.pickerHandle} />
            <View style={s.pickerHeader}>
              <Text style={s.pickerTitle}>Select Pet</Text>
              <TouchableOpacity onPress={() => { setPetModalVisible(false); setPetFilter(""); }}>
                <Ionicons name="close" size={22} color="#0B3D2E" />
              </TouchableOpacity>
            </View>
            <View style={[s.inputBox, { marginHorizontal: 12, marginBottom: 8 }]}>
              <Ionicons name="search-outline" size={16} color="#999" />
              <TextInput
                style={s.input}
                placeholder="Filter by name, owner, phone..."
                placeholderTextColor="#aaa"
                value={petFilter}
                onChangeText={(v) => {
                  // phone filter: max 10 digits if numeric only
                  if (/^\d+$/.test(v)) setPetFilter(v.slice(0, 10));
                  else setPetFilter(v);
                }}
              />
              {petFilter.length > 0 && (
                <TouchableOpacity onPress={() => setPetFilter("")}>
                  <Ionicons name="close-circle" size={16} color="#ccc" />
                </TouchableOpacity>
              )}
            </View>
            {petsLoading ? (
              <ActivityIndicator size="large" color="#0B3D2E" style={{ paddingVertical: 30 }} />
            ) : (
              <FlatList
                data={filteredPets}
                keyExtractor={p => p._id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 30 }}
                ListEmptyComponent={
                  <View style={{ alignItems: "center", paddingVertical: 30 }}>
                    <Ionicons name="paw-outline" size={36} color="#A8D96C" />
                    <Text style={{ marginTop: 8, fontFamily: "Inter_400Regular", color: "#999", fontSize: 13 }}>No pets found</Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <TouchableOpacity style={s.petResultCard} onPress={() => selectPet(item)} activeOpacity={0.8}>
                    <View style={s.petResultAvatar}>
                      <Text style={s.petResultInitials}>{item.name?.slice(0,2).toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.petResultName}>{item.name}</Text>
                      <Text style={s.petResultSub}>
                        {[item.breed, item.species, item.owner?.name, item.owner?.phone].filter(Boolean).join(" • ")}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#A8D96C" />
                  </TouchableOpacity>
                )}
              />
            )}
              </View>
            </KeyboardAvoidingView>
          </Modal>

          {/* Medicine Picker Modal */}
          <Modal visible={pickerVisible} animationType="slide" transparent onRequestClose={() => setPickerVisible(false)}>
            <View style={s.pickerOverlay}>
              <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setPickerVisible(false)} />
              <View style={s.pickerSheet}>
            <View style={s.pickerHandle} />
            <View style={s.pickerHeader}>
              <Text style={s.pickerTitle}>Select Medicine</Text>
              <TouchableOpacity onPress={() => setPickerVisible(false)}>
                <Ionicons name="close" size={22} color="#0B3D2E" />
              </TouchableOpacity>
            </View>
            <View style={[s.inputBox, { marginHorizontal: 12, marginBottom: 8 }]}>
              <Ionicons name="search-outline" size={16} color="#999" />
              <TextInput
                style={s.input}
                placeholder="Search medicine..."
                placeholderTextColor="#aaa"
                value={pickerSearch}
                onChangeText={setPickerSearch}
                autoCorrect={false}
              />
              {pickerSearch.length > 0 && (
                <TouchableOpacity onPress={() => setPickerSearch("")}>
                  <Ionicons name="close-circle" size={16} color="#ccc" />
                </TouchableOpacity>
              )}
            </View>
            {invLoading ? (
              <ActivityIndicator size="large" color="#0B3D2E" style={{ paddingVertical: 30 }} />
            ) : (
              <FlatList
                data={getFilteredInv()}
                keyExtractor={i => i._id}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 30 }}
                ListEmptyComponent={
                  <View style={{ alignItems: "center", paddingVertical: 30 }}>
                    <Ionicons name="medkit-outline" size={36} color="#A8D96C" />
                    <Text style={{ marginTop: 8, fontFamily: "Inter_400Regular", color: "#999", fontSize: 13 }}>
                      {inventory.length === 0 ? "No inventory items found" : "No medicines match your search"}
                    </Text>
                  </View>
                }
                renderItem={({ item }) => {
                  const selItem = isItemSelected(item);
                  const tabKey = getTabKey(item.stockUnit);
                  return (
                    <TouchableOpacity
                      style={[s.invItem, !!selItem && s.invItemActive]}
                      onPress={() => { if (!selItem) toggleItem(item); }}
                      activeOpacity={0.8}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[s.invName, !!selItem && s.invNameActive]}>{item.itemName}</Text>
                        <Text style={s.invSub}>{item.stockUnit} • Stock: {item.stock}</Text>
                      </View>
                      {selItem ? (
                        <View style={s.inlineQty}>
                          <TouchableOpacity
                            onPress={() => updateQty(tabKey, item._id, Math.max(1, selItem.quantity - 1))}
                            style={s.qtyBtn} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          >
                            <Ionicons name="remove" size={16} color="#0B3D2E" />
                          </TouchableOpacity>
                          <Text style={s.qtyNum}>{selItem.quantity}</Text>
                          <TouchableOpacity
                            onPress={() => updateQty(tabKey, item._id, selItem.quantity + 1)}
                            style={s.qtyBtn} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          >
                            <Ionicons name="add" size={16} color="#0B3D2E" />
                          </TouchableOpacity>
                          <Ionicons name="checkmark-circle" size={18} color="#3E7B27" style={{ marginLeft: 4 }} />
                        </View>
                      ) : (
                        <Text style={s.invPrice}>₹{item.unitMaxRetailPriceCustomer}</Text>
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
            )}
              </View>
            </View>
          </Modal>
        </View>
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

  scroll: { padding: 16, paddingBottom: 40 },
  label: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 8, marginTop: 14 },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 14, marginBottom: 8 },
  addMedBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  addMedTxt: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },

  inputBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 12, height: 46,
    borderWidth: 1, borderColor: "#D4EDD4", marginBottom: 10,
  },
  input: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: "#1A1A1A" },
  textArea: { height: 80, alignItems: "flex-start", paddingTop: 10 },

  petSelectorBtn: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 14, height: 50,
    borderWidth: 1.5, borderColor: "#D4EDD4", marginBottom: 4,
  },
  petSelectorTxt: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: "#aaa" },

  petCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#E8F5E8", borderRadius: 14, padding: 14,
    borderWidth: 1.5, borderColor: "#A8D96C", marginBottom: 4,
  },
  petCardAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "#0B3D2E", alignItems: "center", justifyContent: "center",
  },
  petCardInitials: { fontSize: 16, fontFamily: "Poppins_700Bold", color: "#A8D96C" },
  petCardName: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  petCardSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#3E7B27", marginTop: 2 },

  segRow: { flexDirection: "row", gap: 10, marginBottom: 4 },
  segBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center",
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#D4EDD4",
  },
  segBtnActive: { backgroundColor: "#0B3D2E", borderColor: "#0B3D2E" },
  segTxt: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#666" },
  segTxtActive: { color: "#A8D96C" },

  emptyMed: {
    alignItems: "center", paddingVertical: 20, gap: 8,
    backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#D4EDD4",
  },
  emptyMedTxt: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#999" },

  medGroup: {
    backgroundColor: "#fff", borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: "#D4EDD4", marginBottom: 10,
  },
  medGroupTitle: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#3E7B27", marginBottom: 8 },
  medRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#F0F7F0",
  },
  medName: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: "#0B3D2E" },
  qtyBox: { flexDirection: "row", alignItems: "center", gap: 6 },
  qtyInput: {
    width: 40, height: 32, borderRadius: 8, borderWidth: 1, borderColor: "#D4EDD4",
    textAlign: "center", fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E",
    backgroundColor: "#F0F7F0",
  },

  followRow: { flexDirection: "row", gap: 10 },

  submitBtn: {
    backgroundColor: "#0B3D2E", borderRadius: 14, height: 54,
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, marginTop: 20, elevation: 3,
  },
  submitTxt: { fontSize: 16, fontFamily: "Poppins_700Bold", color: "#A8D96C" },

  // Picker Modal
  pickerOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  pickerSheet: {
    backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    height: "85%", paddingTop: 12,
  },
  pickerHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#D4EDD4", alignSelf: "center", marginBottom: 12 },
  pickerHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, marginBottom: 12,
  },
  pickerTitle: { fontSize: 17, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },

  invItem: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#F0F7F0", borderRadius: 12, padding: 12,
    marginBottom: 8, borderWidth: 1, borderColor: "#D4EDD4",
  },
  invItemActive: { backgroundColor: "#E8F5E8", borderColor: "#A8D96C" },
  invName: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  invNameActive: { color: "#3E7B27" },
  invSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#666", marginTop: 2 },
  invPrice: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#3E7B27" },
  inlineQty: {
    flexDirection: "row", alignItems: "center", gap: 2,
    backgroundColor: "#F0F7F0", borderRadius: 20, paddingHorizontal: 6, paddingVertical: 4,
    borderWidth: 1, borderColor: "#A8D96C",
  },
  qtyBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "#A8D96C", alignItems: "center", justifyContent: "center",
  },
  qtyNum: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#0B3D2E", minWidth: 24, textAlign: "center" },

  petResultCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#F0F7F0", borderRadius: 14, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: "#D4EDD4",
  },
  petResultAvatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: "#0B3D2E", alignItems: "center", justifyContent: "center",
  },
  petResultInitials: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#A8D96C" },
  petResultName: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  petResultSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#666", marginTop: 2 },

  // Prescriptions list
  presListHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginBottom: 10, marginTop: 4,
  },
  presListTitle: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  addPresBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#0B3D2E", borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  addPresBtnTxt: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#A8D96C" },
  presEmpty: {
    alignItems: "center", paddingVertical: 20, gap: 6,
    backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#D4EDD4",
    marginBottom: 8,
  },
  presEmptyTxt: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#999" },
  presCard: {
    backgroundColor: "#fff", borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: "#D4EDD4", marginBottom: 8, elevation: 1,
  },
  presCardHeader: { flexDirection: "row", alignItems: "center" },
  presDiagnosis: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#0B3D2E", flex: 1 },
  presDate: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#999", marginTop: 2 },
  presBadge: {
    backgroundColor: "#E8F5E8", borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 3, marginLeft: 8,
  },
  presBadgeTxt: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#3E7B27" },
  presBody: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#F0F7F0" },
  presBodyLabel: { fontSize: 11, fontFamily: "Poppins_700Bold", color: "#3E7B27", marginBottom: 4 },
  presBodySub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#444", lineHeight: 18 },
  petNameTag: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#3E7B27", marginBottom: 2 },
});
