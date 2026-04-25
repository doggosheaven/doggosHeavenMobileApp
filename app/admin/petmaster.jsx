import { useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput, Modal, Alert, FlatList,
  KeyboardAvoidingView, Platform, Image,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { getAuth } from "../../utils/authStorage";
import { BASE_URL } from "../../constants/api";

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

// ─── Pet Detail Screen ────────────────────────────────────────────────────────
function PetDetail({ pet, onBack }) {
  const [vaccModal, setVaccModal] = useState(false);
  const [visitsModal, setVisitsModal] = useState(false);
  const [visits, setVisits] = useState([]);
  const [visitsLoading, setVisitsLoading] = useState(false);

  const [addVisitModal, setAddVisitModal] = useState(false);
  const [visitTypes, setVisitTypes] = useState([]);
  const [selectedVisitType, setSelectedVisitType] = useState(null);
  const [visitNote, setVisitNote] = useState("");
  const [addVisitLoading, setAddVisitLoading] = useState(false);

  const [prescModal, setPrescModal] = useState(false);
  const [prescriptions, setPrescriptions] = useState([]);
  const [prescLoading, setPrescLoading] = useState(false);
  const [addPrescMode, setAddPrescMode] = useState(false);
  const [prescMeds, setPrescMeds] = useState("");
  const [prescNotes, setPrescNotes] = useState("");
  const [prescSaving, setPrescSaving] = useState(false);

  const [subsModal, setSubsModal] = useState(false);
  const [subscriptions, setSubscriptions] = useState([]);
  const [subsLoading, setSubsLoading] = useState(false);

  const openVisits = async () => {
    setVisitsModal(true);
    setVisitsLoading(true);
    try {
      const { token } = await getAuth();
      const res = await fetch(`${BASE_URL}/api/v1/visit/getparticularpetvisit?petId=${pet._id}`, {
        headers: { Authorization: token || "" },
      });
      const json = await res.json();
      setVisits(json.visits || json.data || []);
    } catch (e) { console.log(e); }
    finally { setVisitsLoading(false); }
  };

  const openAddVisit = async () => {
    setAddVisitModal(true);
    setSelectedVisitType(null);
    setVisitNote("");
    try {
      const { token } = await getAuth();
      const res = await fetch(`${BASE_URL}/api/v1/visit/getallvisittypes`, {
        headers: { Authorization: token || "" },
      });
      const json = await res.json();
      setVisitTypes(json.visitTypes || json.data || []);
    } catch (e) { console.log(e); }
  };

  const submitVisit = async () => {
    if (!selectedVisitType) return Alert.alert("Select a visit type");
    setAddVisitLoading(true);
    try {
      const { token } = await getAuth();
      const res = await fetch(`${BASE_URL}/api/v1/visit/addvisit`, {
        method: "POST",
        headers: { Authorization: token || "", "Content-Type": "application/json" },
        body: JSON.stringify({ petId: pet._id, visitType: selectedVisitType._id, note: visitNote }),
      });
      const json = await res.json();
      if (json.success) {
        Alert.alert("Success", "Visit added successfully");
        setAddVisitModal(false);
      } else {
        Alert.alert("Error", json.message || "Failed to add visit");
      }
    } catch (e) { Alert.alert("Error", "Something went wrong"); }
    finally { setAddVisitLoading(false); }
  };

  const openPrescriptions = async () => {
    setPrescModal(true);
    setAddPrescMode(false);
    setPrescLoading(true);
    try {
      const { token } = await getAuth();
      const res = await fetch(`${BASE_URL}/api/v1/prescription/getprescription/${pet._id}`, {
        headers: { Authorization: token || "" },
      });
      const json = await res.json();
      setPrescriptions(json.prescriptions || json.data || []);
    } catch (e) { console.log(e); }
    finally { setPrescLoading(false); }
  };

  const submitPrescription = async () => {
    if (!prescMeds.trim()) return Alert.alert("Enter medicines");
    setPrescSaving(true);
    try {
      const { token } = await getAuth();
      const res = await fetch(`${BASE_URL}/api/v1/prescription/addprescription`, {
        method: "POST",
        headers: { Authorization: token || "", "Content-Type": "application/json" },
        body: JSON.stringify({ petId: pet._id, medicines: prescMeds, notes: prescNotes }),
      });
      const json = await res.json();
      if (json.success) {
        Alert.alert("Success", "Prescription added");
        setPrescMeds(""); setPrescNotes("");
        setAddPrescMode(false);
        openPrescriptions();
      } else {
        Alert.alert("Error", json.message || "Failed");
      }
    } catch (e) { Alert.alert("Error", "Something went wrong"); }
    finally { setPrescSaving(false); }
  };

  const openSubscriptions = async () => {
    setSubsModal(true);
    setSubsLoading(true);
    try {
      const { token } = await getAuth();
      const res = await fetch(`${BASE_URL}/api/v1/subscription/petssubscription/${pet._id}`, {
        headers: { Authorization: token || "" },
      });
      const json = await res.json();
      setSubscriptions(json.subscriptions || json.data || []);
    } catch (e) { console.log(e); }
    finally { setSubsLoading(false); }
  };

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>{pet.name}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.detailScroll}>
        {/* Avatar Card */}
        <View style={s.avatarCard}>
          <View style={s.bigAvatar}>
            {pet.image ? (
              <Image source={{ uri: pet.image }} style={s.bigAvatarImg} />
            ) : (
              <Text style={s.bigAvatarTxt}>{pet.name?.slice(0, 2).toUpperCase()}</Text>
            )}
          </View>
          <Text style={s.petName}>{pet.name}</Text>
          <Text style={s.petBreed}>{pet.breed} • {pet.species}</Text>
          <View style={s.roleBadge}>
            <Ionicons name="paw" size={12} color="#A8D96C" />
            <Text style={s.roleTxt}>{pet.sex || "—"}</Text>
          </View>
        </View>

        {/* Pet Details */}
        <Text style={s.secTitle}>Pet Details</Text>
        <View style={s.infoCard}>
          {[
            { icon: "male-female-outline", label: "Sex",           value: pet.sex },
            { icon: "color-palette-outline",label: "Color",        value: pet.color },
            { icon: "calendar-outline",     label: "Date of Birth", value: fmtDate(pet.dob) },
            { icon: "cut-outline",          label: "Neutered",     value: pet.neutered ? "Yes" : "No" },
            { icon: "today-outline",        label: "Registered",   value: fmtDate(pet.registrationDate) },
          ].map((row, i, arr) => (
            <View key={row.label} style={[s.infoRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={s.infoIconBox}>
                <Ionicons name={row.icon} size={16} color="#3E7B27" />
              </View>
              <Text style={s.infoLabel}>{row.label}</Text>
              <Text style={s.infoValue}>{row.value || "—"}</Text>
            </View>
          ))}
        </View>

        {/* Vaccinations */}
        {pet.vaccinations?.length > 0 && (
          <>
            <Text style={s.secTitle}>Vaccinations</Text>
            <TouchableOpacity style={s.vaccChip} onPress={() => setVaccModal(true)} activeOpacity={0.8}>
              <View style={s.vaccChipLeft}>
                <Ionicons name="shield-checkmark" size={20} color="#3E7B27" />
                <Text style={s.vaccChipTxt}>{pet.vaccinations.length} vaccination{pet.vaccinations.length > 1 ? "s" : ""} recorded</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#3E7B27" />
            </TouchableOpacity>
          </>
        )}

        {/* Actions */}
        <Text style={s.secTitle}>Actions</Text>
        <View style={s.actionsGrid}>
          {[
            { label: "View Visits",   icon: "document-text-outline", color: "#0B3D2E", onPress: openVisits },
            { label: "Add Visit",     icon: "add-circle-outline",    color: "#3E7B27", onPress: openAddVisit },
            { label: "Prescription",  icon: "medical-outline",       color: "#1A5C3A", onPress: openPrescriptions },
            { label: "Subscriptions", icon: "card-outline",          color: "#F59E0B", onPress: openSubscriptions },
          ].map((a) => (
            <TouchableOpacity key={a.label} style={s.actionBtn} activeOpacity={0.8} onPress={a.onPress}>
              <View style={[s.actionBtnIcon, { backgroundColor: a.color + "18" }]}>
                <Ionicons name={a.icon} size={22} color={a.color} />
              </View>
              <Text style={s.actionBtnTxt}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Owner Info */}
        {pet.owner && (
          <>
            <Text style={s.secTitle}>Owner Info</Text>
            <View style={s.infoCard}>
              {[
                { icon: "person-outline",  label: "Name",    value: pet.owner.name },
                { icon: "call-outline",    label: "Phone",   value: pet.owner.phone },
                { icon: "mail-outline",    label: "Email",   value: pet.owner.email },
                { icon: "location-outline",label: "Address", value: pet.owner.address },
              ].map((row, i, arr) => (
                <View key={row.label} style={[s.infoRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={s.infoIconBox}>
                    <Ionicons name={row.icon} size={16} color="#3E7B27" />
                  </View>
                  <Text style={s.infoLabel}>{row.label}</Text>
                  <Text style={[s.infoValue, { flex: 2 }]} numberOfLines={2}>{row.value || "—"}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Vaccination Modal */}
      <Modal visible={vaccModal} transparent animationType="slide" onRequestClose={() => setVaccModal(false)}>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Vaccinations</Text>
              <TouchableOpacity onPress={() => setVaccModal(false)}>
                <Ionicons name="close" size={22} color="#0B3D2E" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {pet.vaccinations?.map((v, i) => (
                <View key={i} style={s.vaccRow}>
                  <View style={s.vaccDot} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.vaccName}>{v.name || "—"}</Text>
                    <Text style={s.vaccDose}>Doses: {v.numberOfDose || "—"}</Text>
                  </View>
                  <View style={s.vaccBadge}>
                    <Text style={s.vaccBadgeTxt}>#{i + 1}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* View Visits Modal */}
      <Modal visible={visitsModal} transparent animationType="slide" onRequestClose={() => setVisitsModal(false)}>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Visit History</Text>
              <TouchableOpacity onPress={() => setVisitsModal(false)}>
                <Ionicons name="close" size={22} color="#0B3D2E" />
              </TouchableOpacity>
            </View>
            {visitsLoading ? (
              <ActivityIndicator size="large" color="#0B3D2E" style={{ marginTop: 20 }} />
            ) : visits.length === 0 ? (
              <View style={s.emptyModal}>
                <Ionicons name="document-text-outline" size={40} color="#A8D96C" />
                <Text style={s.emptyModalTxt}>No visits found</Text>
              </View>
            ) : (
              <FlatList
                data={visits}
                keyExtractor={(item, i) => item._id || String(i)}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <View style={s.listItem}>
                    <View style={s.listItemLeft}>
                      <Text style={s.listItemTitle}>{item.visitType?.purpose || item.purpose || "Visit"}</Text>
                      <Text style={s.listItemSub}>{fmtDate(item.createdAt || item.date)}</Text>
                      {item.note ? <Text style={s.listItemNote}>{item.note}</Text> : null}
                    </View>
                    <View style={s.listItemBadge}>
                      <Text style={s.listItemBadgeTxt}>₹{item.price || item.amount || "—"}</Text>
                    </View>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Add Visit Modal */}
      <Modal visible={addVisitModal} transparent animationType="slide" onRequestClose={() => setAddVisitModal(false)}>
        <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={s.sheet}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Add Visit</Text>
              <TouchableOpacity onPress={() => setAddVisitModal(false)}>
                <Ionicons name="close" size={22} color="#0B3D2E" />
              </TouchableOpacity>
            </View>
            <Text style={s.fieldLabel}>Select Visit Type</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 220 }}>
              {visitTypes.map((vt) => (
                <TouchableOpacity
                  key={vt._id}
                  style={[s.selectRow, selectedVisitType?._id === vt._id && s.selectRowActive]}
                  onPress={() => setSelectedVisitType(vt)}
                  activeOpacity={0.8}
                >
                  <Text style={s.selectRowEmoji}>{vt.emoji || "🐾"}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.selectRowTxt}>{vt.purpose}</Text>
                    {vt.price ? <Text style={s.selectRowSub}>₹{vt.price}</Text> : null}
                  </View>
                  {selectedVisitType?._id === vt._id && (
                    <Ionicons name="checkmark-circle" size={20} color="#3E7B27" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={[s.fieldLabel, { marginTop: 12 }]}>Note (optional)</Text>
            <TextInput
              style={s.textArea}
              placeholder="Add a note..."
              placeholderTextColor="#aaa"
              value={visitNote}
              onChangeText={setVisitNote}
              multiline
              numberOfLines={3}
            />
            <TouchableOpacity
              style={[s.submitBtn, addVisitLoading && { opacity: 0.6 }]}
              onPress={submitVisit}
              disabled={addVisitLoading}
              activeOpacity={0.8}
            >
              {addVisitLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={s.submitBtnTxt}>Add Visit</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Prescription Modal */}
      <Modal visible={prescModal} transparent animationType="slide" onRequestClose={() => { setPrescModal(false); setAddPrescMode(false); }}>
        <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={s.sheet}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>{addPrescMode ? "Add Prescription" : "Prescriptions"}</Text>
              <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                {!addPrescMode && (
                  <TouchableOpacity onPress={() => setAddPrescMode(true)}>
                    <Ionicons name="add-circle-outline" size={24} color="#3E7B27" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => { setPrescModal(false); setAddPrescMode(false); }}>
                  <Ionicons name="close" size={22} color="#0B3D2E" />
                </TouchableOpacity>
              </View>
            </View>
            {addPrescMode ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={s.fieldLabel}>Medicines *</Text>
                <TextInput
                  style={s.textArea}
                  placeholder="e.g. Amoxicillin 250mg - 1 tab twice daily"
                  placeholderTextColor="#aaa"
                  value={prescMeds}
                  onChangeText={setPrescMeds}
                  multiline
                  numberOfLines={4}
                />
                <Text style={[s.fieldLabel, { marginTop: 10 }]}>Notes (optional)</Text>
                <TextInput
                  style={s.textArea}
                  placeholder="Additional notes..."
                  placeholderTextColor="#aaa"
                  value={prescNotes}
                  onChangeText={setPrescNotes}
                  multiline
                  numberOfLines={3}
                />
                <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                  <TouchableOpacity style={s.cancelBtn} onPress={() => setAddPrescMode(false)} activeOpacity={0.8}>
                    <Text style={s.cancelBtnTxt}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.submitBtn, { flex: 1 }, prescSaving && { opacity: 0.6 }]}
                    onPress={submitPrescription}
                    disabled={prescSaving}
                    activeOpacity={0.8}
                  >
                    {prescSaving ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={s.submitBtnTxt}>Save</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            ) : prescLoading ? (
              <ActivityIndicator size="large" color="#0B3D2E" style={{ marginTop: 20 }} />
            ) : prescriptions.length === 0 ? (
              <View style={s.emptyModal}>
                <Ionicons name="medical-outline" size={40} color="#A8D96C" />
                <Text style={s.emptyModalTxt}>No prescriptions found</Text>
              </View>
            ) : (
              <FlatList
                data={prescriptions}
                keyExtractor={(item, i) => item._id || String(i)}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <View style={s.listItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.listItemTitle}>{item.medicines || item.medicine || "Prescription"}</Text>
                      {item.notes ? <Text style={s.listItemNote}>{item.notes}</Text> : null}
                      <Text style={s.listItemSub}>{fmtDate(item.createdAt || item.date)}</Text>
                    </View>
                  </View>
                )}
              />
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Subscriptions Modal */}
      <Modal visible={subsModal} transparent animationType="slide" onRequestClose={() => setSubsModal(false)}>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Subscriptions</Text>
              <TouchableOpacity onPress={() => setSubsModal(false)}>
                <Ionicons name="close" size={22} color="#0B3D2E" />
              </TouchableOpacity>
            </View>
            {subsLoading ? (
              <ActivityIndicator size="large" color="#0B3D2E" style={{ marginTop: 20 }} />
            ) : subscriptions.length === 0 ? (
              <View style={s.emptyModal}>
                <Ionicons name="card-outline" size={40} color="#F59E0B" />
                <Text style={s.emptyModalTxt}>No subscriptions found</Text>
              </View>
            ) : (
              <FlatList
                data={subscriptions}
                keyExtractor={(item, i) => item._id || String(i)}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <View style={s.listItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.listItemTitle}>{item.planName || item.visitType?.purpose || "Subscription"}</Text>
                      <Text style={s.listItemSub}>Expires: {fmtDate(item.expiryDate || item.endDate)}</Text>
                      {item.remainingVisits != null && (
                        <Text style={s.listItemNote}>Remaining visits: {item.remainingVisits}</Text>
                      )}
                    </View>
                    <View style={[s.listItemBadge, { backgroundColor: item.isActive ? "#E8F5E8" : "#FEE2E2" }]}>
                      <Text style={[s.listItemBadgeTxt, { color: item.isActive ? "#3E7B27" : "#DC2626" }]}>
                        {item.isActive ? "Active" : "Expired"}
                      </Text>
                    </View>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Main List Screen ─────────────────────────────────────────────────────────
export default function StaffPetMaster() {
  const router = useRouter();
  const [petList, setPetList] = useState([]);
  const [selectedPet, setSelectedPet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const search = useCallback(async (n = "", p = "") => {
    try {
      const { token } = await getAuth();
      const params = new URLSearchParams({ name: n.trim(), phone: p.trim() });
      const res = await fetch(`${BASE_URL}/api/v1/pet/getfilteredpetsbynameandphone?${params}`, {
        headers: { Authorization: token || "" },
      });
      const json = await res.json();
      setPetList(json.pets || json.list || []);
    } catch (e) { console.log(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    search();
  }, []));

  const handleSearch = (field, val) => {
    const n = field === "name" ? val : name;
    const p = field === "phone" ? val : phone;
    if (field === "name") setName(val); else setPhone(val);
    clearTimeout(handleSearch._t);
    handleSearch._t = setTimeout(() => search(n, p), 600);
  };

  const openDetail = async (id) => {
    setDetailLoading(true);
    try {
      const { token } = await getAuth();
      const res = await fetch(`${BASE_URL}/api/v1/pet/getpetdetails/${id}`, {
        headers: { Authorization: token || "" },
      });
      const json = await res.json();
      if (json.success) setSelectedPet(json.pet);
    } catch (e) { console.log(e); }
    finally { setDetailLoading(false); }
  };

  // Show detail screen
  if (detailLoading) {
    return (
      <View style={[s.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#0B3D2E" />
        <Text style={{ marginTop: 12, fontFamily: "Inter_400Regular", color: "#666" }}>Loading pet details...</Text>
      </View>
    );
  }

  if (selectedPet) {
    return <PetDetail pet={selectedPet} onBack={() => setSelectedPet(null)} />;
  }

  // List screen
  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.8}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Pet Master</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => router.push("/admin/addpet")} activeOpacity={0.8}>
          <Ionicons name="add" size={18} color="#0B3D2E" />
          <Text style={s.addBtnTxt}>Add Pet</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={s.searchSection}>
        <View style={s.searchBox}>
          <Ionicons name="paw-outline" size={16} color="#999" />
          <TextInput
            style={s.searchInput} placeholder="Search by pet name..." placeholderTextColor="#aaa"
            value={name} onChangeText={(v) => handleSearch("name", v)}
          />
          {name.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch("name", "")}>
              <Ionicons name="close-circle" size={16} color="#ccc" />
            </TouchableOpacity>
          )}
        </View>
        <View style={s.searchBox}>
          <Ionicons name="call-outline" size={16} color="#999" />
          <TextInput
            style={s.searchInput} placeholder="Search by phone..." placeholderTextColor="#aaa"
            keyboardType="number-pad" value={phone}
            onChangeText={(v) => handleSearch("phone", v)}
          />
          {phone.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch("phone", "")}>
              <Ionicons name="close-circle" size={16} color="#ccc" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Count */}
      {!loading && petList.length > 0 && (
        <View style={s.countBar}>
          <Text style={s.countTxt}>{petList.length} pet{petList.length !== 1 ? "s" : ""} found</Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color="#0B3D2E" style={{ flex: 1 }} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.listScroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); search(name, phone); }} tintColor="#0B3D2E" />}
        >
          {petList.length === 0 ? (
            <View style={s.emptyBox}>
              <Ionicons name="paw-outline" size={52} color="#A8D96C" />
              <Text style={s.emptyTitle}>No Pets Found</Text>
              <Text style={s.emptySubtitle}>Try a different name or phone number</Text>
              <TouchableOpacity style={s.addFirstBtn} onPress={() => router.push("/admin/addpet")} activeOpacity={0.8}>
                <Ionicons name="add" size={16} color="#fff" />
                <Text style={s.addFirstTxt}>Add First Pet</Text>
              </TouchableOpacity>
            </View>
          ) : (
            petList.map((pet) => (
              <TouchableOpacity
                key={pet._id}
                style={s.petCard}
                onPress={() => openDetail(pet._id)}
                activeOpacity={0.82}
              >
                <View style={[s.petAvatar, pet.isBlacklisted && { backgroundColor: "#C62828" }]}>
                  {pet.image ? (
                    <Image source={{ uri: pet.image }} style={s.petAvatarImg} />
                  ) : (
                    <Text style={s.petAvatarTxt}>{pet.name?.slice(0, 2).toUpperCase() || "🐾"}</Text>
                  )}
                </View>
                <View style={s.petCardBody}>
                  <Text style={s.petCardName}>{pet.name}</Text>
                  <Text style={s.petCardBreed}>{pet.breed || pet.species}</Text>
                  {pet.owner?.name && (
                    <View style={s.ownerRow}>
                      <Ionicons name="person-outline" size={11} color="#999" />
                      <Text style={s.ownerTxt}>{pet.owner.name}</Text>
                      {pet.owner?.phone && (
                        <>
                          <Text style={s.dot}>•</Text>
                          <Ionicons name="call-outline" size={11} color="#999" />
                          <Text style={s.ownerTxt}>{pet.owner.phone}</Text>
                        </>
                      )}
                    </View>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={18} color="#A8D96C" />
              </TouchableOpacity>
            ))
          )}
          <View style={{ height: 30 }} />
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F7F0" },

  header: {
    backgroundColor: "#0B3D2E", paddingHorizontal: 20,
    paddingTop: 52, paddingBottom: 16,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  headerTitle: { fontSize: 20, fontFamily: "Poppins_700Bold", color: "#fff", flex: 1 },
  backBtn: { width: 36, height: 36, justifyContent: "center" },
  addBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#A8D96C", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
  },
  addBtnTxt: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },

  searchSection: { backgroundColor: "#fff", padding: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: "#D4EDD4" },
  searchBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#F0F7F0", borderRadius: 12, paddingHorizontal: 12, height: 44,
    borderWidth: 1, borderColor: "#D4EDD4",
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: "#1A1A1A" },

  countBar: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#D4EDD4" },
  countTxt: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#999" },

  listScroll: { padding: 16, paddingBottom: 40 },

  petCard: {
    backgroundColor: "#fff", borderRadius: 16, padding: 14,
    marginBottom: 10, elevation: 2, borderWidth: 1, borderColor: "#D4EDD4",
    flexDirection: "row", alignItems: "center", gap: 12,
  },
  petAvatar: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: "#0B3D2E", justifyContent: "center", alignItems: "center",
    overflow: "hidden",
  },
  petAvatarImg: { width: 50, height: 50, borderRadius: 25 },
  petAvatarTxt: { fontSize: 17, fontFamily: "Poppins_700Bold", color: "#A8D96C" },
  petCardBody: { flex: 1 },
  petCardName: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 2 },
  petCardBreed: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#666", marginBottom: 4 },
  ownerRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  ownerTxt: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#999" },
  dot: { fontSize: 11, color: "#ccc" },

  emptyBox: { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 16, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  emptySubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#999" },
  addFirstBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#0B3D2E", paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20, marginTop: 8,
  },
  addFirstTxt: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#fff" },

  // Detail screen
  detailScroll: { padding: 16, paddingBottom: 40 },

  avatarCard: {
    backgroundColor: "#0B3D2E", borderRadius: 20, padding: 24,
    alignItems: "center", marginBottom: 16, elevation: 3,
  },
  bigAvatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: "#A8D96C", justifyContent: "center", alignItems: "center", marginBottom: 12,
    overflow: "hidden",
  },
  bigAvatarImg: { width: 80, height: 80, borderRadius: 40 },
  bigAvatarTxt: { fontSize: 28, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  petName: { fontSize: 22, fontFamily: "Poppins_700Bold", color: "#fff", marginBottom: 4 },
  petBreed: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#aaa", marginBottom: 10 },
  roleBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(168,217,108,0.2)", paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20,
  },
  roleTxt: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#A8D96C" },

  secTitle: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 10, marginTop: 4 },

  infoCard: {
    backgroundColor: "#fff", borderRadius: 16, paddingHorizontal: 14,
    marginBottom: 16, elevation: 2, borderWidth: 1, borderColor: "#D4EDD4",
  },
  infoRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F0F7F0",
  },
  infoIconBox: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: "#E8F5E8", justifyContent: "center", alignItems: "center",
  },
  infoLabel: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#666", flex: 1 },
  infoValue: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#0B3D2E", textAlign: "right" },

  vaccChip: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#fff", borderRadius: 14, padding: 14,
    marginBottom: 16, elevation: 2, borderWidth: 1, borderColor: "#D4EDD4",
  },
  vaccChipLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  vaccChipTxt: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#3E7B27" },

  actionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  actionBtn: {
    width: "47%", backgroundColor: "#fff", borderRadius: 16, padding: 16,
    alignItems: "center", elevation: 2, borderWidth: 1, borderColor: "#D4EDD4",
  },
  actionBtnIcon: { width: 48, height: 48, borderRadius: 12, justifyContent: "center", alignItems: "center", marginBottom: 8 },
  actionBtnTxt: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#0B3D2E", textAlign: "center" },

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "65%" },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  sheetTitle: { fontSize: 18, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  vaccRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F0F7F0",
  },
  vaccDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#A8D96C" },
  vaccName: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  vaccDose: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#666" },
  vaccBadge: { backgroundColor: "#E8F5E8", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  vaccBadgeTxt: { fontSize: 11, fontFamily: "Poppins_700Bold", color: "#3E7B27" },

  // Action modals
  emptyModal: { alignItems: "center", paddingVertical: 30, gap: 10 },
  emptyModalTxt: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#999" },

  listItem: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F0F7F0",
  },
  listItemLeft: { flex: 1 },
  listItemTitle: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 2 },
  listItemSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#999" },
  listItemNote: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#666", marginTop: 2 },
  listItemBadge: { backgroundColor: "#E8F5E8", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  listItemBadgeTxt: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#3E7B27" },

  fieldLabel: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 6 },
  textArea: {
    backgroundColor: "#F0F7F0", borderRadius: 12, padding: 12,
    fontSize: 13, fontFamily: "Inter_400Regular", color: "#1A1A1A",
    borderWidth: 1, borderColor: "#D4EDD4", textAlignVertical: "top", minHeight: 80,
  },
  selectRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12,
    borderWidth: 1, borderColor: "#D4EDD4", marginBottom: 8, backgroundColor: "#F0F7F0",
  },
  selectRowActive: { borderColor: "#3E7B27", backgroundColor: "#E8F5E8" },
  selectRowEmoji: { fontSize: 20 },
  selectRowTxt: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  selectRowSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#666" },
  submitBtn: {
    backgroundColor: "#0B3D2E", borderRadius: 14, paddingVertical: 14,
    alignItems: "center", marginTop: 12,
  },
  submitBtnTxt: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#fff" },
  cancelBtn: {
    flex: 1, borderRadius: 14, paddingVertical: 14,
    alignItems: "center", borderWidth: 1, borderColor: "#D4EDD4", backgroundColor: "#F0F7F0",
  },
  cancelBtnTxt: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#666" },
});
