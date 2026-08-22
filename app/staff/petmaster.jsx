import { useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput, Modal, Alert, Platform, Image, KeyboardAvoidingView,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { getAuth } from "../../utils/authStorage";
import { BASE_URL } from "../../constants/api";
import { ErrorState } from "../../components/ScreenState";

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

// ─── Pet Detail Screen ────────────────────────────────────────────────────────
function PetDetail({ pet: initialPet, onBack, token }) {
  const [pet, setPet] = useState(initialPet);
  const [vaccModal, setVaccModal] = useState(false);
  const [visitsModal, setVisitsModal] = useState(false);
  const [visits, setVisits] = useState([]);
  const [visitsLoading, setVisitsLoading] = useState(false);
  const [blacklistModal, setBlacklistModal] = useState(false);
  const [blacklistReason, setBlacklistReason] = useState("");
  const [blacklistLoading, setBlacklistLoading] = useState(false);

  // Add Visit
  const [addVisitModal, setAddVisitModal] = useState(false);
  const [visitTypes, setVisitTypes] = useState([]);
  const [vtLoading, setVtLoading] = useState(false);
  const [selectedVT, setSelectedVT] = useState(null);
  const [visitNote, setVisitNote] = useState("");
  const [customerType, setCustomerType] = useState("Regular");
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpTime, setFollowUpTime] = useState("");
  const [followUpPurpose, setFollowUpPurpose] = useState("");
  const [addVisitLoading, setAddVisitLoading] = useState(false);

  const handleBlacklist = async () => {
    if (!pet.isBlacklisted && !blacklistReason.trim())
      return Alert.alert("Required", "Please enter a reason for blacklisting.");
    setBlacklistLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/v1/pet/blacklist/${pet._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: token || "" },
        body: JSON.stringify({
          isBlacklisted: !pet.isBlacklisted,
          blacklistReason: pet.isBlacklisted ? "" : blacklistReason.trim(),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setPet((prev) => ({
          ...prev,
          isBlacklisted: !prev.isBlacklisted,
          blacklistReason: prev.isBlacklisted ? "" : blacklistReason.trim(),
        }));
        setBlacklistModal(false);
        setBlacklistReason("");
        Alert.alert(
          pet.isBlacklisted ? "✅ Removed" : "🚫 Blacklisted",
          pet.isBlacklisted ? "Pet removed from blacklist." : "Pet has been blacklisted."
        );
      } else {
        Alert.alert("Error", json.message || "Failed to update.");
      }
    } catch { Alert.alert("Error", "Network error"); }
    finally { setBlacklistLoading(false); }
  };

  const loadVisits = async () => {
    setVisitsLoading(true);
    setVisitsModal(true);
    try {
      const res = await fetch(`${BASE_URL}/api/v1/visit/getparticularpetvisit?petId=${pet._id}`, {
        headers: { Authorization: token || "" },
      });
      const json = await res.json();
      setVisits(json.List || json.list || []);
    } catch (e) { __DEV__ && console.log(e); }
    finally { setVisitsLoading(false); }
  };

  const openAddVisit = async () => {
    setSelectedVT(null);
    setVisitNote("");
    setCustomerType("Regular");
    setFollowUpDate("");
    setFollowUpTime("");
    setFollowUpPurpose("");
    setAddVisitModal(true);
    setVtLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/v1/visit/getallvisittypes`, {
        headers: { Authorization: token || "" },
      });
      const json = await res.json();
      setVisitTypes(json.visitTypes || []);
    } catch (e) { __DEV__ && console.log(e); }
    finally { setVtLoading(false); }
  };

  const submitVisit = async () => {
    if (!selectedVT) return Alert.alert("Required", "Please select a visit type");
    if (!visitNote.trim()) return Alert.alert("Required", "Please enter a note");
    const hasPartialFollowUp =
      (followUpDate || followUpTime || followUpPurpose) &&
      !(followUpDate && followUpTime && followUpPurpose);
    if (hasPartialFollowUp)
      return Alert.alert("Follow-up", "Fill all follow-up fields or leave all empty");
    setAddVisitLoading(true);
    try {
      const body = {
        petId: pet._id,
        visitType: selectedVT._id,
        note: visitNote,
        customerType,
        nextFollowUp: followUpDate || undefined,
        followUpTime: followUpTime || undefined,
        followUpPurpose: followUpPurpose || undefined,
      };
      const res = await fetch(`${BASE_URL}/api/v1/visit/addinquiryvisit`, {
        method: "POST",
        headers: { Authorization: token || "", "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
        {/* Blacklist Banner */}
        {pet.isBlacklisted && (
          <View style={s.blacklistBanner}>
            <Ionicons name="ban" size={18} color="#fff" />
            <View style={{ flex: 1 }}>
              <Text style={s.blacklistBannerTitle}>🚫 Blacklisted</Text>
              {pet.blacklistReason ? (
                <Text style={s.blacklistBannerReason}>Reason: {pet.blacklistReason}</Text>
              ) : null}
            </View>
          </View>
        )}

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
            { label: "View Visits", icon: "document-text-outline", color: "#0B3D2E", onPress: loadVisits },
            { label: "Add Visit",   icon: "add-circle-outline",    color: "#3E7B27", onPress: openAddVisit },
          ].map((a) => (
            <TouchableOpacity key={a.label} style={s.actionBtn} onPress={a.onPress} activeOpacity={0.8}>
              <View style={[s.actionBtnIcon, { backgroundColor: a.color + "18" }]}>
                <Ionicons name={a.icon} size={22} color={a.color} />
              </View>
              <Text style={s.actionBtnTxt}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Blacklist Button */}
        <TouchableOpacity
          style={s.blacklistBtn}
          onPress={() => {
            if (pet.isBlacklisted) {
              Alert.alert("Admin Only", "Only admin can remove a pet from the blacklist.");
            } else {
              setBlacklistModal(true);
            }
          }}
          activeOpacity={0.8}
        >
          <Ionicons name={pet.isBlacklisted ? "lock-closed-outline" : "ban-outline"} size={18} color={pet.isBlacklisted ? "#999" : "#C62828"} />
          <Text style={[s.blacklistBtnTxt, pet.isBlacklisted && { color: "#999" }]}>
            {pet.isBlacklisted ? "Blacklisted (Admin can remove)" : "Blacklist this Pet"}
          </Text>
        </TouchableOpacity>

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

      {/* Blacklist Reason Modal */}
      <Modal visible={blacklistModal} transparent animationType="slide" onRequestClose={() => setBlacklistModal(false)}>
        <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={s.sheet}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>🚫 Blacklist Pet</Text>
              <TouchableOpacity onPress={() => setBlacklistModal(false)}>
                <Ionicons name="close" size={22} color="#0B3D2E" />
              </TouchableOpacity>
            </View>
            <Text style={s.fieldLabel}>Reason for blacklisting *</Text>
            <TextInput
              style={s.textArea}
              placeholder="e.g. Owner was rude to staff, aggressive behavior..."
              placeholderTextColor="#aaa"
              value={blacklistReason}
              onChangeText={setBlacklistReason}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[s.blacklistConfirmBtn, blacklistLoading && { opacity: 0.6 }]}
              onPress={handleBlacklist}
              disabled={blacklistLoading}
              activeOpacity={0.8}
            >
              {blacklistLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="ban" size={16} color="#fff" />
                  <Text style={s.blacklistConfirmTxt}>Confirm Blacklist</Text>
                </>
              )}
            </TouchableOpacity>
            <View style={{ height: 20 }} />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Visits Modal */}
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
              <ActivityIndicator size="large" color="#0B3D2E" style={{ paddingVertical: 30 }} />
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {visits.length === 0 ? (
                  <View style={{ alignItems: "center", paddingVertical: 30 }}>
                    <Ionicons name="document-text-outline" size={40} color="#A8D96C" />
                    <Text style={{ marginTop: 10, fontFamily: "Inter_400Regular", color: "#999" }}>No visits recorded</Text>
                  </View>
                ) : (
                  visits.map((v, i) => (
                    <View key={v._id || i} style={s.vaccRow}>
                      <View style={s.vaccDot} />
                      <View style={{ flex: 1 }}>
                        <Text style={s.vaccName}>{v.visitType?.purpose || "Visit"}</Text>
                        <Text style={s.vaccDose}>
                          {v.createdAt ? new Date(v.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                          {v.details?.price != null ? `  •  ₹${v.details.price}` : ""}
                        </Text>
                        {v.details?.note ? <Text style={s.vaccDose} numberOfLines={1}>{v.details.note}</Text> : null}
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Add Visit Modal */}
      <Modal visible={addVisitModal} transparent animationType="slide" onRequestClose={() => setAddVisitModal(false)}>
        <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={[s.sheet, { maxHeight: "90%" }]}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Add Visit</Text>
              <TouchableOpacity onPress={() => setAddVisitModal(false)}>
                <Ionicons name="close" size={22} color="#0B3D2E" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              {/* Visit Type */}
              <Text style={s.fieldLabel}>Visit Type *</Text>
              {vtLoading ? (
                <ActivityIndicator size="small" color="#0B3D2E" style={{ marginBottom: 12 }} />
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                  {visitTypes.map((vt) => (
                    <TouchableOpacity
                      key={vt._id}
                      style={[s.vtChip, selectedVT?._id === vt._id && s.vtChipActive]}
                      onPress={() => setSelectedVT(vt)}
                      activeOpacity={0.8}
                    >
                      <Text style={s.vtEmoji}>{vt.emoji || "🐾"}</Text>
                      <Text style={[s.vtChipTxt, selectedVT?._id === vt._id && s.vtChipTxtActive]}>
                        {vt.purpose}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              {/* Selected type price info */}
              {selectedVT?.price != null && (
                <View style={s.priceInfo}>
                  <Ionicons name="pricetag-outline" size={14} color="#3E7B27" />
                  <Text style={s.priceInfoTxt}>Price: ₹{selectedVT.price}</Text>
                </View>
              )}

              {/* Customer Type */}
              <Text style={s.fieldLabel}>Customer Type *</Text>
              <View style={s.segmentRow}>
                {["Regular", "New", "VIP"].map((ct) => (
                  <TouchableOpacity
                    key={ct}
                    style={[s.segBtn, customerType === ct && s.segBtnActive]}
                    onPress={() => setCustomerType(ct)}
                    activeOpacity={0.8}
                  >
                    <Text style={[s.segBtnTxt, customerType === ct && s.segBtnTxtActive]}>{ct}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Note */}
              <Text style={s.fieldLabel}>Note *</Text>
              <TextInput
                style={s.textArea}
                placeholder="Describe the visit reason, symptoms, etc."
                placeholderTextColor="#aaa"
                value={visitNote}
                onChangeText={setVisitNote}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              {/* Follow-up Section */}
              <Text style={[s.fieldLabel, { marginTop: 14 }]}>Follow-up (optional)</Text>
              <View style={s.followUpGrid}>
                <View style={[s.inputBox, { flex: 1 }]}>
                  <Ionicons name="calendar-outline" size={14} color="#999" />
                  <TextInput
                    style={s.inlineInput}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#aaa"
                    value={followUpDate}
                    onChangeText={setFollowUpDate}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
                <View style={[s.inputBox, { flex: 1 }]}>
                  <Ionicons name="time-outline" size={14} color="#999" />
                  <TextInput
                    style={s.inlineInput}
                    placeholder="HH:MM"
                    placeholderTextColor="#aaa"
                    value={followUpTime}
                    onChangeText={setFollowUpTime}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
              </View>
              <View style={[s.inputBox, { marginBottom: 14 }]}>
                <Ionicons name="clipboard-outline" size={14} color="#999" />
                <TextInput
                  style={[s.inlineInput, { flex: 1 }]}
                  placeholder="Follow-up purpose"
                  placeholderTextColor="#aaa"
                  value={followUpPurpose}
                  onChangeText={setFollowUpPurpose}
                />
              </View>

              {/* Submit */}
              <TouchableOpacity
                style={[s.submitBtn, addVisitLoading && { opacity: 0.6 }]}
                onPress={submitVisit}
                disabled={addVisitLoading}
                activeOpacity={0.8}
              >
                {addVisitLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={s.submitBtnTxt}>Save Visit</Text>
                )}
              </TouchableOpacity>
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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
    </View>
  );
}

// ─── Main List Screen ─────────────────────────────────────────────────────────
export default function StaffPetMaster() {
  const router = useRouter();
  const [petList, setPetList] = useState([]);
  const [selectedPet, setSelectedPet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [token, setToken] = useState("");

  const search = useCallback(async (n = "", p = "") => {
    try {
      const { token } = await getAuth();
      const params = new URLSearchParams({ name: n.trim(), phone: p.trim() });
      const res = await fetch(`${BASE_URL}/api/v1/pet/getfilteredpetsbynameandphone?${params}`, {
        headers: { Authorization: token || "" },
      });
      const json = await res.json();
      setPetList(json.pets || json.list || []);
      setLoadError(false);
    } catch (e) { __DEV__ && console.log(e); setLoadError(true); }
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
      const { token: t } = await getAuth();
      setToken(t || "");
      const res = await fetch(`${BASE_URL}/api/v1/pet/getpetdetails/${id}`, {
        headers: { Authorization: t || "" },
      });
      const json = await res.json();
      if (json.success) setSelectedPet(json.pet);
    } catch (e) { __DEV__ && console.log(e); }
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
    return <PetDetail pet={selectedPet} onBack={() => setSelectedPet(null)} token={token} />;
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
        <TouchableOpacity style={s.addBtn} onPress={() => router.push("/staff/addpet")} activeOpacity={0.8}>
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
      ) : loadError ? (
        <ErrorState
          message="Could not load the pet list. Check your connection."
          onRetry={() => { setLoading(true); setLoadError(false); search(name, phone); }}
        />
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
              <TouchableOpacity style={s.addFirstBtn} onPress={() => router.push("/staff/addpet")} activeOpacity={0.8}>
                <Ionicons name="add" size={16} color="#fff" />
                <Text style={s.addFirstTxt}>Add First Pet</Text>
              </TouchableOpacity>
            </View>
          ) : (
            petList.map((pet) => (
              <TouchableOpacity
                key={pet._id}
                style={[s.petCard, pet.isBlacklisted && s.petCardBlacklisted]}
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
                  {pet.isBlacklisted && (
                    <View style={s.blacklistBadge}>
                      <Ionicons name="ban" size={10} color="#C62828" />
                      <Text style={s.blacklistBadgeTxt}>Blacklisted</Text>
                    </View>
                  )}
                  {!pet.isBlacklisted && pet.owner?.name && (
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
  petCardBlacklisted: {
    borderColor: "#FFCDD2", backgroundColor: "#FFF5F5",
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

  blacklistBanner: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#C62828", borderRadius: 14, padding: 14, marginBottom: 16,
  },
  blacklistBannerTitle: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#fff" },
  blacklistBannerReason: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#ffcdd2", marginTop: 2 },

  blacklistBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    borderWidth: 1.5, borderColor: "#C62828", borderRadius: 14,
    paddingVertical: 13, marginBottom: 16, backgroundColor: "#FFF5F5",
  },
  blacklistBtnRemove: { borderColor: "#3E7B27", backgroundColor: "#F0FFF0" },
  blacklistBtnTxt: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#C62828" },

  blacklistConfirmBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#C62828", borderRadius: 14, paddingVertical: 14, marginTop: 12,
  },
  blacklistConfirmTxt: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#fff" },

  blacklistBadge: {
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: "#FFEBEE", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
    alignSelf: "flex-start", marginTop: 4,
  },
  blacklistBadgeTxt: { fontSize: 10, fontFamily: "Poppins_700Bold", color: "#C62828" },
  fieldLabel: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 8 },
  vtChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8,
    backgroundColor: "#F0F7F0", borderWidth: 1, borderColor: "#D4EDD4",
  },
  vtChipActive: { backgroundColor: "#0B3D2E", borderColor: "#0B3D2E" },
  vtEmoji: { fontSize: 16 },
  vtChipTxt: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#3E7B27" },
  vtChipTxtActive: { color: "#A8D96C" },
  priceInfo: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#E8F5E8", paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 10, alignSelf: "flex-start", marginBottom: 14,
  },
  priceInfoTxt: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#3E7B27" },
  segmentRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  segBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center",
    backgroundColor: "#F0F7F0", borderWidth: 1, borderColor: "#D4EDD4",
  },
  segBtnActive: { backgroundColor: "#0B3D2E", borderColor: "#0B3D2E" },
  segBtnTxt: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#666" },
  segBtnTxtActive: { color: "#A8D96C" },
  textArea: {
    backgroundColor: "#F0F7F0", borderRadius: 12, padding: 12,
    fontSize: 13, fontFamily: "Inter_400Regular", color: "#1A1A1A",
    borderWidth: 1, borderColor: "#D4EDD4", minHeight: 80, marginBottom: 4,
  },
  followUpGrid: { flexDirection: "row", gap: 10, marginBottom: 10 },
  inputBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#F0F7F0", borderRadius: 12, paddingHorizontal: 12, height: 44,
    borderWidth: 1, borderColor: "#D4EDD4",
  },
  inlineInput: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: "#1A1A1A" },
  submitBtn: {
    backgroundColor: "#0B3D2E", borderRadius: 14, paddingVertical: 14,
    alignItems: "center", marginTop: 8,
  },
  submitBtnTxt: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#fff" },
});
