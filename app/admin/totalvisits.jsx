import { useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Modal, Alert, FlatList,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { getAuth } from "../../utils/authStorage";
import { BASE_URL } from "../../constants/api";

const PURPOSES = [
  "Inquiry", "Dog Park", "Veterinary", "Hostel",
  "Day Care", "Day School", "Play School", "Grooming",
  "Shop", "Buy Subscription",
];

export default function TotalVisits() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split("T")[0]);
  const [nameFilter, setNameFilter] = useState("");
  const [purposeFilter, setPurposeFilter] = useState("");

  // Add Visit Modal
  const [showModal, setShowModal] = useState(false);
  const [selectedPet, setSelectedPet] = useState(null);
  const [selectedPurpose, setSelectedPurpose] = useState("Inquiry");
  const [visitTypes, setVisitTypes] = useState([]);

  // Pet Selector Modal
  const [showPetSelector, setShowPetSelector] = useState(false);
  const [petSearch, setPetSearch] = useState("");
  const [allPets, setAllPets] = useState([]);
  const [petsLoading, setPetsLoading] = useState(false);

  // Purpose Selector Modal
  const [showPurposePicker, setShowPurposePicker] = useState(false);

  // Preview Modal
  const [previewVisit, setPreviewVisit] = useState(null);

  // Visit form fields
  const [price, setPrice] = useState("");
  const [discount, setDiscount] = useState("0");
  const [customerType, setCustomerType] = useState("pvtltd");
  const [note, setNote] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpTime, setFollowUpTime] = useState("");
  const [followUpPurpose, setFollowUpPurpose] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadToken = async () => {
    const { token: t } = await getAuth();
    setToken(t || "");
    return t || "";
  };

  const fetchVisits = useCallback(async (t) => {
    try {
      const params = new URLSearchParams();
      if (nameFilter) params.append("name", nameFilter);
      if (purposeFilter) params.append("purpose", purposeFilter);
      if (dateFilter) params.append("date", dateFilter);
      const res = await fetch(`${BASE_URL}/api/v1/visit/getvisitlist?${params}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: t },
      });
      const json = await res.json();
      if (json.success) setVisits(json.List || []);
      else setVisits([]);
    } catch (e) { console.log(e); setVisits([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, [nameFilter, purposeFilter, dateFilter]);

  const fetchVisitTypes = async (t) => {
    try {
      const res = await fetch(`${BASE_URL}/api/v1/visit/getallvisittypes`, {
        headers: { Authorization: t },
      });
      const json = await res.json();
      if (json.success) {
        setVisitTypes(json.visitTypes || []);
        if (json.visitTypes?.length) setSelectedPurpose(json.visitTypes[0].purpose);
      }
    } catch (e) { console.log(e); }
  };

  useFocusEffect(useCallback(() => {
    loadToken().then((t) => fetchVisits(t));
  }, [fetchVisits]));

  // Fetch all pets for selector
  const fetchAllPets = async (t) => {
    setPetsLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/v1/pet/getfilteredpetsbynameandphone/`, {
        headers: { Authorization: t },
      });
      const json = await res.json();
      setAllPets(json.list || []);
    } catch (e) { console.log(e); }
    finally { setPetsLoading(false); }
  };

  const filteredPets = petSearch.trim()
    ? allPets.filter((p) =>
        p.name?.toLowerCase().includes(petSearch.toLowerCase()) ||
        p.owner?.phone?.includes(petSearch) ||
        p.owner?.name?.toLowerCase().includes(petSearch.toLowerCase())
      )
    : allPets;

  const openModal = async () => {
    const t = token || (await loadToken());
    await Promise.all([fetchVisitTypes(t), fetchAllPets(t)]);
    setShowModal(true);
    resetForm();
  };

  const resetForm = () => {
    setSelectedPet(null);
    setPetSearch("");
    setPrice("");
    setDiscount("0");
    setCustomerType("pvtltd");
    setNote("");
    setFollowUpDate("");
    setFollowUpTime("");
    setFollowUpPurpose("");
  };

  const getVisitTypeId = () => {
    const vt = visitTypes.find((v) => v.purpose === selectedPurpose);
    return vt?._id || null;
  };

  const getEndpointForPurpose = (purpose) => {
    const map = {
      "Inquiry": "addinquiryvisit",
      "Dog Park": "adddogparkvisit",
      "Veterinary": "addveterinaryvisit",
      "Hostel": "addhostelvisit",
      "Day Care": "adddaycarevisit",
      "Day School": "adddayschoolvisit",
      "Play School": "addplayschoolvisit",
      "Grooming": "addgroomingvisit",
      "Shop": "addshopvisit",
      "Buy Subscription": "addinquiryvisit",
    };
    return map[purpose] || "addinquiryvisit";
  };

  // DD/MM/YY → YYYY-MM-DD for backend
  const parseFollowUpDate = (ddmmyy) => {
    const digits = ddmmyy.replace(/\D/g, "");
    if (digits.length < 6) return null;
    const dd = digits.slice(0, 2);
    const mm = digits.slice(2, 4);
    const yy = digits.slice(4, 6);
    const year = parseInt(yy) >= 0 ? `20${yy}` : null;
    if (!year) return null;
    return `${year}-${mm}-${dd}`;
  };

  const handleSubmit = async () => {
    if (!selectedPet) { Alert.alert("Error", "Please select a pet"); return; }
    const vtId = getVisitTypeId();
    if (!vtId) { Alert.alert("Error", "Visit type not found"); return; }

    const parsedFollowUp = followUpDate ? parseFollowUpDate(followUpDate) : null;

    setSubmitting(true);
    try {
      const t = token || (await loadToken());
      const endpoint = getEndpointForPurpose(selectedPurpose);
      const body = {
        petId: selectedPet._id,
        visitType: vtId,
        customerType,
        note,
        details: {
          price: Number(price) || 0,
          discount: Number(discount) || 0,
          finalPrice: Math.max(0, (Number(price) || 0) - (Number(discount) || 0)),
          note,
          selectedPayment: "cash",
        },
        ...(parsedFollowUp && {
          nextFollowUp: parsedFollowUp,
          followUpTime,
          followUpPurpose,
        }),
      };

      const res = await fetch(`${BASE_URL}/api/v1/visit/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: t },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        Alert.alert("✅ Success", "Visit recorded successfully!");
        setShowModal(false);
        resetForm();
        fetchVisits(t);
      } else {
        Alert.alert("Error", json.message || "Failed to save visit");
      }
    } catch (e) {
      Alert.alert("Error", "Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "";

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace("/staff/dashboard")} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Total Visits</Text>
        <TouchableOpacity style={s.addBtn} onPress={openModal} activeOpacity={0.8}>
          <Ionicons name="add" size={22} color="#0B3D2E" />
          <Text style={s.addBtnTxt}>Add Visit</Text>
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={s.filterBox}>
        <TextInput
          style={s.filterInput}
          placeholder="🐾 Pet name / phone"
          placeholderTextColor="#999"
          value={nameFilter}
          onChangeText={setNameFilter}
          onSubmitEditing={() => loadToken().then(fetchVisits)}
        />
        <TextInput
          style={s.filterInput}
          placeholder="📅 Date (YYYY-MM-DD)"
          placeholderTextColor="#999"
          value={dateFilter}
          onChangeText={setDateFilter}
          onSubmitEditing={() => loadToken().then(fetchVisits)}
        />
        <TouchableOpacity style={s.searchBtn} onPress={() => loadToken().then(fetchVisits)}>
          <Ionicons name="search" size={18} color="#fff" />
          <Text style={s.searchBtnTxt}>Search</Text>
        </TouchableOpacity>
      </View>

      {/* Visit List */}
      {loading ? (
        <ActivityIndicator size="large" color="#0B3D2E" style={{ flex: 1 }} />
      ) : visits.length === 0 ? (
        <View style={s.emptyBox}>
          <Ionicons name="document-text-outline" size={50} color="#A8D96C" />
          <Text style={s.emptyTitle}>No visits found</Text>
          <Text style={s.emptySubtitle}>Try a different date or add a new visit</Text>
          <TouchableOpacity style={s.emptyAddBtn} onPress={openModal}>
            <Text style={s.emptyAddBtnTxt}>+ Add New Visit</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={visits}
          keyExtractor={(item, i) => item._id || String(i)}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={s.visitCard} onPress={() => setPreviewVisit(item)} activeOpacity={0.85}>
              <View style={s.visitCardRow}>
                <Text style={s.visitPetName}>{item?.pet?.name || "—"}</Text>
                <View style={s.purposeBadge}>
                  <Text style={s.purposeText}>{item?.visitType?.purpose || "—"}</Text>
                </View>
              </View>
              <Text style={s.visitOwner}>👤 {item?.pet?.owner?.name || "N/A"}  📞 {item?.pet?.owner?.phone || "N/A"}</Text>
              <View style={s.visitCardFooter}>
                <Text style={s.visitDate}>📅 {fmtDate(item?.createdAt)}</Text>
                <Text style={s.visitPrice}>₹{item?.details?.price || 0}</Text>
              </View>
              <View style={s.previewHint}>
                <Ionicons name="eye-outline" size={13} color="#3E7B27" />
                <Text style={s.previewHintTxt}>Tap to preview</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Visit Preview Modal */}
      <Modal visible={!!previewVisit} animationType="slide" transparent onRequestClose={() => setPreviewVisit(null)}>
        <View style={s.previewOverlay}>
          <View style={s.previewSheet}>
            {/* Handle */}
            <View style={s.previewHandle} />

            {/* Header */}
            <View style={s.previewHeader}>
              <View style={{ flex: 1 }}>
                <Text style={s.previewPetName}>{previewVisit?.pet?.name || "—"}</Text>
                <View style={s.purposeBadge}>
                  <Text style={s.purposeText}>{previewVisit?.visitType?.purpose || "—"}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setPreviewVisit(null)} style={s.previewCloseBtn}>
                <Ionicons name="close" size={22} color="#0B3D2E" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={s.previewBody} showsVerticalScrollIndicator={false}>

              {/* Pet & Owner */}
              <View style={s.previewSection}>
                <Text style={s.previewSectionTitle}>🐾 Pet Details</Text>
                <View style={s.previewRow}>
                  <Text style={s.previewKey}>Name</Text>
                  <Text style={s.previewVal}>{previewVisit?.pet?.name || "—"}</Text>
                </View>
                <View style={s.previewRow}>
                  <Text style={s.previewKey}>Species</Text>
                  <Text style={s.previewVal}>{previewVisit?.pet?.species || "—"}</Text>
                </View>
                <View style={s.previewRow}>
                  <Text style={s.previewKey}>Breed</Text>
                  <Text style={s.previewVal}>{previewVisit?.pet?.breed || "—"}</Text>
                </View>
              </View>

              {/* Owner */}
              <View style={s.previewSection}>
                <Text style={s.previewSectionTitle}>👤 Owner Details</Text>
                <View style={s.previewRow}>
                  <Text style={s.previewKey}>Name</Text>
                  <Text style={s.previewVal}>{previewVisit?.pet?.owner?.name || "—"}</Text>
                </View>
                <View style={s.previewRow}>
                  <Text style={s.previewKey}>Phone</Text>
                  <Text style={s.previewVal}>{previewVisit?.pet?.owner?.phone || previewVisit?.pet?.owner?.[0]?.phone || "—"}</Text>
                </View>
                <View style={s.previewRow}>
                  <Text style={s.previewKey}>Email</Text>
                  <Text style={s.previewVal}>{previewVisit?.pet?.owner?.email || previewVisit?.pet?.owner?.[0]?.email || "—"}</Text>
                </View>
              </View>

              {/* Visit Info */}
              <View style={s.previewSection}>
                <Text style={s.previewSectionTitle}>📋 Visit Info</Text>
                <View style={s.previewRow}>
                  <Text style={s.previewKey}>Purpose</Text>
                  <Text style={s.previewVal}>{previewVisit?.visitType?.purpose || "—"}</Text>
                </View>
                <View style={s.previewRow}>
                  <Text style={s.previewKey}>Date</Text>
                  <Text style={s.previewVal}>{fmtDate(previewVisit?.createdAt)}</Text>
                </View>
                <View style={s.previewRow}>
                  <Text style={s.previewKey}>Customer Type</Text>
                  <Text style={s.previewVal}>{previewVisit?.details?.customerType || previewVisit?.customerType || "—"}</Text>
                </View>
                {previewVisit?.details?.note ? (
                  <View style={s.previewRow}>
                    <Text style={s.previewKey}>Note</Text>
                    <Text style={[s.previewVal, { flex: 1 }]}>{previewVisit.details.note}</Text>
                  </View>
                ) : null}
              </View>

              {/* Payment */}
              <View style={s.previewSection}>
                <Text style={s.previewSectionTitle}>💰 Payment</Text>
                <View style={s.previewRow}>
                  <Text style={s.previewKey}>Price</Text>
                  <Text style={s.previewVal}>₹{previewVisit?.details?.price ?? 0}</Text>
                </View>
                {previewVisit?.details?.discount > 0 && (
                  <View style={s.previewRow}>
                    <Text style={s.previewKey}>Discount</Text>
                    <Text style={[s.previewVal, { color: "#C62828" }]}>- ₹{previewVisit.details.discount}</Text>
                  </View>
                )}
                <View style={[s.previewRow, s.previewRowFinal]}>
                  <Text style={s.previewKeyBold}>Final Amount</Text>
                  <Text style={s.previewValBold}>
                    ₹{previewVisit?.details?.finalPrice ?? previewVisit?.details?.price ?? 0}
                  </Text>
                </View>
              </View>

              {/* Follow-up */}
              {previewVisit?.nextFollowUp && (
                <View style={s.previewSection}>
                  <Text style={s.previewSectionTitle}>📅 Follow-up</Text>
                  <View style={s.previewRow}>
                    <Text style={s.previewKey}>Date</Text>
                    <Text style={s.previewVal}>{fmtDate(previewVisit.nextFollowUp)}</Text>
                  </View>
                  {previewVisit?.followUpPurpose && (
                    <View style={s.previewRow}>
                      <Text style={s.previewKey}>Purpose</Text>
                      <Text style={s.previewVal}>{previewVisit.followUpPurpose}</Text>
                    </View>
                  )}
                </View>
              )}

              <View style={{ height: 30 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Pet Selector — Full Screen Modal */}
      <Modal visible={showPetSelector} animationType="slide" onRequestClose={() => setShowPetSelector(false)}>
        <View style={s.selectorContainer}>
          <View style={s.selectorHeader}>
            <Text style={s.selectorTitle}>Select Pet</Text>
            <TouchableOpacity onPress={() => setShowPetSelector(false)}>
              <Ionicons name="close" size={26} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={s.selectorSearchBox}>
            <Ionicons name="search" size={18} color="#888" />
            <TextInput
              style={s.selectorSearchInput}
              placeholder="Search by name, owner or phone..."
              placeholderTextColor="#999"
              value={petSearch}
              onChangeText={setPetSearch}
              autoFocus
            />
            {petSearch.length > 0 && (
              <TouchableOpacity onPress={() => setPetSearch("")}>
                <Ionicons name="close-circle" size={18} color="#aaa" />
              </TouchableOpacity>
            )}
          </View>
          {petsLoading ? (
            <ActivityIndicator size="large" color="#0B3D2E" style={{ flex: 1 }} />
          ) : (
            <FlatList
              data={filteredPets}
              keyExtractor={(item, i) => item._id || String(i)}
              contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
              ListEmptyComponent={
                <View style={{ alignItems: "center", marginTop: 40 }}>
                  <Ionicons name="paw-outline" size={48} color="#A8D96C" />
                  <Text style={{ color: "#666", marginTop: 10, fontFamily: "Inter_400Regular" }}>No pets found</Text>
                </View>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={s.selectorItem}
                  onPress={() => { setSelectedPet(item); setPetSearch(""); setShowPetSelector(false); }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={s.selectorItemTxt}>{item.name}</Text>
                    <Text style={s.selectorItemSub}>
                      {item.species}{item.breed ? ` · ${item.breed}` : ""}
                      {item.owner?.name ? `  👤 ${item.owner.name}` : ""}
                      {item.owner?.phone ? `  📞 ${item.owner.phone}` : ""}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#ccc" />
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </Modal>

      {/* Add Visit Modal */}
      <Modal visible={showModal} animationType="slide" onRequestClose={() => setShowModal(false)}>
        <View style={s.modalContainer}>
          {/* Modal Header */}
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Add New Visit</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Ionicons name="close" size={26} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={s.modalBody} keyboardShouldPersistTaps="handled">
            {/* Pet Selector */}
            <Text style={s.fieldLabel}>🐾 Select Pet</Text>
            {selectedPet ? (
              <View style={s.selectedPetBox}>
                <View style={{ flex: 1 }}>
                  <Text style={s.selectedPetName}>{selectedPet.name}</Text>
                  <Text style={s.selectedPetSub}>{selectedPet.species} · {selectedPet.breed}</Text>
                  {selectedPet.owner && (
                    <Text style={s.selectedPetSub}>Owner: {selectedPet.owner.name} · {selectedPet.owner.phone}</Text>
                  )}
                </View>
                <TouchableOpacity onPress={() => { setSelectedPet(null); setShowPetSelector(true); }}>
                  <Text style={s.changeBtn}>Change</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={s.pickerBtn} onPress={() => setShowPetSelector(true)}>
                <Text style={[s.pickerBtnTxt, { color: "#999" }]}>Tap to select a pet...</Text>
                <Ionicons name="paw" size={18} color="#0B3D2E" />
              </TouchableOpacity>
            )}

            {/* Purpose Selector */}
            <Text style={s.fieldLabel}>🎯 Purpose of Visit</Text>
            <TouchableOpacity style={s.pickerBtn} onPress={() => setShowPurposePicker(true)}>
              <Text style={s.pickerBtnTxt}>{selectedPurpose || "Select Purpose"}</Text>
              <Ionicons name="chevron-down" size={18} color="#0B3D2E" />
            </TouchableOpacity>

            {/* Purpose Picker — Full Screen Modal */}
            <Modal visible={showPurposePicker} animationType="slide" onRequestClose={() => setShowPurposePicker(false)}>
              <View style={s.selectorContainer}>
                <View style={s.selectorHeader}>
                  <Text style={s.selectorTitle}>Select Purpose</Text>
                  <TouchableOpacity onPress={() => setShowPurposePicker(false)}>
                    <Ionicons name="close" size={26} color="#fff" />
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={visitTypes.length ? visitTypes.map(v => v.purpose) : PURPOSES}
                  keyExtractor={(item) => item}
                  contentContainerStyle={{ padding: 16 }}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[s.selectorItem, selectedPurpose === item && s.selectorItemActive]}
                      onPress={() => { setSelectedPurpose(item); setShowPurposePicker(false); }}
                    >
                      <Text style={[s.selectorItemTxt, selectedPurpose === item && s.selectorItemTxtActive]}>{item}</Text>
                      {selectedPurpose === item && <Ionicons name="checkmark-circle" size={20} color="#0B3D2E" />}
                    </TouchableOpacity>
                  )}
                />
              </View>
            </Modal>

            {/* Visit Details */}
            <Text style={s.fieldLabel}>💰 Price (₹)</Text>
            <TextInput style={s.input} placeholder="0" placeholderTextColor="#999" keyboardType="numeric" value={price} onChangeText={setPrice} />

            <Text style={s.fieldLabel}>🏷️ Discount (₹)</Text>
            <TextInput style={s.input} placeholder="0" placeholderTextColor="#999" keyboardType="numeric" value={discount} onChangeText={setDiscount} />

            {(Number(price) > 0) && (
              <View style={s.totalBox}>
                <Text style={s.totalLabel}>Final Amount:</Text>
                <Text style={s.totalValue}>₹{Math.max(0, (Number(price) || 0) - (Number(discount) || 0))}</Text>
              </View>
            )}

            <Text style={s.fieldLabel}>👤 Customer Type</Text>
            <View style={s.customerTypeRow}>
              {["pvtltd", "NGO"].map((ct) => (
                <TouchableOpacity
                  key={ct}
                  style={[s.ctBtn, customerType === ct && s.ctBtnActive]}
                  onPress={() => setCustomerType(ct)}
                >
                  <Text style={[s.ctBtnTxt, customerType === ct && s.ctBtnTxtActive]}>{ct}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.fieldLabel}>📝 Note (optional)</Text>
            <TextInput
              style={[s.input, { height: 80, textAlignVertical: "top" }]}
              placeholder="Any notes..."
              placeholderTextColor="#999"
              multiline
              value={note}
              onChangeText={setNote}
            />

            <Text style={s.fieldLabel}>📅 Follow-up Date (optional)</Text>
            <TextInput
              style={s.input}
              placeholder="DD/MM/YY"
              placeholderTextColor="#999"
              keyboardType="numeric"
              maxLength={8}
              value={followUpDate}
              onChangeText={(val) => {
                const digits = val.replace(/\D/g, "");
                let formatted = digits;
                if (digits.length > 4) formatted = `${digits.slice(0,2)}/${digits.slice(2,4)}/${digits.slice(4,6)}`;
                else if (digits.length > 2) formatted = `${digits.slice(0,2)}/${digits.slice(2)}`;
                setFollowUpDate(formatted);
              }}
            />

            <Text style={s.fieldLabel}>⏰ Follow-up Time (optional)</Text>
            <TextInput style={s.input} placeholder="HH:MM" placeholderTextColor="#999" value={followUpTime} onChangeText={setFollowUpTime} />

            <Text style={s.fieldLabel}>🎯 Follow-up Purpose (optional)</Text>
            <TextInput style={s.input} placeholder="e.g. Vaccination" placeholderTextColor="#999" value={followUpPurpose} onChangeText={setFollowUpPurpose} />

            <TouchableOpacity
              style={[s.submitBtn, submitting && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={s.submitBtnTxt}>Save Visit</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F7F0" },

  header: {
    backgroundColor: "#0B3D2E", paddingHorizontal: 16,
    paddingTop: 52, paddingBottom: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  backBtn: { padding: 6 },
  headerTitle: { fontSize: 18, fontFamily: "Poppins_700Bold", color: "#fff", flex: 1, marginLeft: 10 },
  addBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#A8D96C", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7,
  },
  addBtnTxt: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },

  filterBox: { backgroundColor: "#fff", padding: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: "#D4EDD4" },
  filterInput: {
    borderWidth: 1, borderColor: "#D4EDD4", borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 9, fontSize: 13,
    fontFamily: "Inter_400Regular", color: "#333",
  },
  searchBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, backgroundColor: "#0B3D2E", borderRadius: 10, paddingVertical: 10,
  },
  searchBtnTxt: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#fff" },

  emptyBox: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 40 },
  emptyTitle: { fontSize: 18, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  emptySubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#666", textAlign: "center" },
  emptyAddBtn: { backgroundColor: "#0B3D2E", borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 },
  emptyAddBtnTxt: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#A8D96C" },

  visitCard: {
    backgroundColor: "#fff", borderRadius: 14, padding: 14,
    marginBottom: 10, elevation: 2, borderWidth: 1, borderColor: "#D4EDD4",
  },
  visitCardRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  visitPetName: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  purposeBadge: { backgroundColor: "#E8F5E8", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  purposeText: { fontSize: 11, fontFamily: "Poppins_700Bold", color: "#3E7B27" },
  visitOwner: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#666", marginBottom: 8 },
  visitCardFooter: { flexDirection: "row", justifyContent: "space-between" },
  visitDate: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#888" },
  visitPrice: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#3E7B27" },
  previewHint: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 },
  previewHintTxt: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#3E7B27" },

  // Modal
  modalContainer: { flex: 1, backgroundColor: "#F0F7F0" },
  modalHeader: {
    backgroundColor: "#0B3D2E", paddingHorizontal: 20,
    paddingTop: 52, paddingBottom: 18,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  modalTitle: { fontSize: 20, fontFamily: "Poppins_700Bold", color: "#fff" },
  modalBody: { padding: 20 },

  fieldLabel: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 6, marginTop: 14 },
  input: {
    borderWidth: 1.5, borderColor: "#D4EDD4", borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 14,
    fontFamily: "Inter_400Regular", color: "#333", backgroundColor: "#fff",
  },

  selectedPetBox: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#E8F5E8", borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: "#A8D96C", marginTop: 4,
  },
  selectedPetName: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  selectedPetSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#555", marginTop: 2 },
  changeBtn: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#C62828" },

  pickerBtn: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    borderWidth: 1.5, borderColor: "#D4EDD4", borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, backgroundColor: "#fff",
  },
  pickerBtnTxt: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#333" },

  // Full-screen Selector
  selectorContainer: { flex: 1, backgroundColor: "#F0F7F0" },
  selectorHeader: {
    backgroundColor: "#0B3D2E", paddingHorizontal: 20,
    paddingTop: 52, paddingBottom: 18,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  selectorTitle: { fontSize: 20, fontFamily: "Poppins_700Bold", color: "#fff" },
  selectorSearchBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#fff", margin: 12, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: "#D4EDD4",
  },
  selectorSearchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: "#333" },
  selectorItem: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#fff", borderRadius: 12, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: "#D4EDD4",
  },
  selectorItemActive: { backgroundColor: "#E8F5E8", borderColor: "#A8D96C" },
  selectorItemTxt: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  selectorItemTxtActive: { color: "#0B3D2E" },
  selectorItemSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#666", marginTop: 3 },

  totalBox: {
    flexDirection: "row", justifyContent: "space-between",
    backgroundColor: "#E8F5E8", borderRadius: 10, padding: 12, marginTop: 8,
  },
  totalLabel: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  totalValue: { fontSize: 16, fontFamily: "Poppins_700Bold", color: "#3E7B27" },

  customerTypeRow: { flexDirection: "row", gap: 10 },
  ctBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1.5, borderColor: "#D4EDD4", alignItems: "center", backgroundColor: "#fff",
  },
  ctBtnActive: { backgroundColor: "#0B3D2E", borderColor: "#0B3D2E" },
  ctBtnTxt: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#666" },
  ctBtnTxtActive: { color: "#A8D96C" },

  submitBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, backgroundColor: "#0B3D2E", borderRadius: 14,
    paddingVertical: 15, marginTop: 20,
  },
  submitBtnTxt: { fontSize: 16, fontFamily: "Poppins_700Bold", color: "#fff" },

  // Preview Bottom Sheet
  previewOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  previewSheet: {
    backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: "88%", paddingBottom: 20,
  },
  previewHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: "#D4EDD4",
    alignSelf: "center", marginTop: 10, marginBottom: 4,
  },
  previewHeader: {
    flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: "#E8F5E8",
  },
  previewPetName: { fontSize: 18, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 4 },
  previewCloseBtn: {
    backgroundColor: "#F0F7F0", borderRadius: 20, padding: 6, marginLeft: 10,
  },
  previewBody: { paddingHorizontal: 20, paddingTop: 8 },
  previewSection: {
    backgroundColor: "#F8FDF8", borderRadius: 14, padding: 14,
    marginTop: 12, borderWidth: 1, borderColor: "#E8F5E8",
  },
  previewSectionTitle: {
    fontSize: 12, fontFamily: "Poppins_700Bold", color: "#3E7B27",
    marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5,
  },
  previewRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "flex-start", paddingVertical: 5,
    borderBottomWidth: 1, borderBottomColor: "#EEF7EE",
  },
  previewRowFinal: {
    borderBottomWidth: 0, marginTop: 4, paddingTop: 8,
    borderTopWidth: 1, borderTopColor: "#D4EDD4",
  },
  previewKey: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#888", flex: 1 },
  previewVal: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#222", flex: 1, textAlign: "right" },
  previewKeyBold: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#0B3D2E", flex: 1 },
  previewValBold: { fontSize: 16, fontFamily: "Poppins_700Bold", color: "#3E7B27", textAlign: "right" },
});
