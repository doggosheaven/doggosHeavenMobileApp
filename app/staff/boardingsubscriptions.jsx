import { useState, useCallback, useRef } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl, Modal, TextInput, FlatList,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { getAuth } from "../../utils/authStorage";
import { BASE_URL } from "../../constants/api";

const PRICE_PER_DAY = 766.67;

const STATUS_FILTERS = ["active", "all", "inactive"];

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

export default function StaffBoardingSubscriptions() {
  const router = useRouter();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("active");
  const [token, setToken] = useState(null);
  const [deboarding, setDeboarding] = useState(null);

  const cache = useRef({});
  const tokenRef = useRef(null);

  const load = useCallback(async (status = filter, force = false) => {
    if (!force && cache.current[status]) {
      setBookings(cache.current[status]);
      setLoading(false);
      return;
    }
    if (!tokenRef.current) {
      const { token: t } = await getAuth();
      tokenRef.current = t;
      setToken(t);
    }
    try {
      const q = status === "all" ? "" : `?status=${status}`;
      const res = await fetch(`${BASE_URL}/api/v1/boarding-subscription/admin/list${q}`, {
        headers: { Authorization: tokenRef.current || "" },
      });
      const data = await res.json();
      if (data.success) {
        cache.current[status] = data.bookings || [];
        setBookings(data.bookings || []);
      }
    } catch { }
    finally { setLoading(false); setRefreshing(false); }
  }, [filter]);

  useFocusEffect(useCallback(() => { load(filter); }, [filter]));

  const handleDeboard = (b) => {
    Alert.alert(
      "Force Deboard?",
      `Stop wallet boarding for ${b.userId?.fullName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Deboard", style: "destructive", onPress: async () => {
            setDeboarding(b._id);
            try {
              const res = await fetch(`${BASE_URL}/api/v1/boarding-subscription/staff/deboard`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: token || "" },
                body: JSON.stringify({ boardingId: b._id }),
              });
              const data = await res.json();
              if (data.success) {
                Alert.alert("✅ Done", "Boarding stopped successfully.");
                cache.current[filter] = null;
                load(filter, true);
              } else Alert.alert("Error", data.message);
            } catch { Alert.alert("Error", "Network error"); }
            finally { setDeboarding(null); }
          },
        },
      ]
    );
  };

  const activeCount = bookings.filter(b => b.status === "active").length;

  // ── Add Boarding Modal state ──────────────────────────────────────────────
  const [showAddModal, setShowAddModal] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [allUsers, setAllUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userPets, setUserPets] = useState([]);
  const [petsLoading, setPetsLoading] = useState(false);
  const [selectedPets, setSelectedPets] = useState([]);
  const [selectedPetInfo, setSelectedPetInfo] = useState(null);
  const [activating, setActivating] = useState(false);

  // ── Update Pets Modal state ───────────────────────────────────────────────
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateBoarding, setUpdateBoarding] = useState(null);
  const [updatePets, setUpdatePets] = useState([]);
  const [updateSelectedPets, setUpdateSelectedPets] = useState([]);
  const [updating, setUpdating] = useState(false);

  const fetchUsers = async (q) => {
    setUsersLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/v1/pet/getfilteredpetsbynameandphone${q ? `?name=${encodeURIComponent(q)}` : ""}`, {
        headers: { Authorization: tokenRef.current || "" },
      });
      const json = await res.json();
      setAllUsers(json.list || []);
    } catch { }
    finally { setUsersLoading(false); }
  };

  const fetchUserPets = async (userId) => {
    setPetsLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/v1/pet/getfilteredpetsbynameandphone`, {
        headers: { Authorization: tokenRef.current || "" },
      });
      const json = await res.json();
      const pets = (json.list || []).filter((p) => p.owner?._id === userId);
      setUserPets(pets);
    } catch { }
    finally { setPetsLoading(false); }
  };

  // ── New Customer form state ───────────────────────────────────────────────
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "", email: "", address: "" });
  const [newPets, setNewPets] = useState([{ name: "", species: "Dog", breed: "" }]);
  const [savingCustomer, setSavingCustomer] = useState(false);

  const openAddModal = async () => {
    setSelectedUser(null);
    setUserPets([]);
    setSelectedPets([]);
    setSelectedPetInfo(null);
    setUserSearch("");
    setAllUsers([]);
    setShowNewCustomer(false);
    setNewCustomer({ name: "", phone: "", email: "", address: "" });
    setNewPets([{ name: "", species: "Dog", breed: "" }]);
    setShowAddModal(true);
    await fetchUsers("");
  };

  const handleSaveNewCustomer = async () => {
    const { name, phone, email } = newCustomer;
    if (!name.trim() || !phone.trim()) return Alert.alert("Error", "Name and phone are required");
    if (newPets.some(p => !p.name.trim())) return Alert.alert("Error", "Please enter a name for each pet");
    setSavingCustomer(true);
    try {
      const formData = new FormData();
      formData.append("ownerName", name.trim());
      formData.append("phone", phone.trim());
      formData.append("email", email.trim() || `${phone.trim()}@doggosheaven.com`);
      formData.append("address", newCustomer.address.trim() || "N/A");
      formData.append("pets", JSON.stringify(newPets.map(p => ({
        name: p.name.trim(), species: p.species, breed: p.breed.trim() || p.species,
        sex: "Unknown", color: "Unknown", dob: new Date().toISOString(),
        registrationDate: new Date().toISOString(), neutered: false, vaccinations: [],
      }))));
      const res = await fetch(`${BASE_URL}/api/v1/pet/addpet`, {
        method: "POST",
        headers: { Authorization: tokenRef.current || "" },
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert("✅ Done", "Customer and pets added successfully!");
        setShowNewCustomer(false);
        await fetchUsers("");
        // Auto-select the newly created owner
        const ownerMap = {};
        const petsRes = await fetch(`${BASE_URL}/api/v1/pet/getfilteredpetsbynameandphone?name=${encodeURIComponent(newPets[0].name.trim())}`, {
          headers: { Authorization: tokenRef.current || "" },
        });
        const petsJson = await petsRes.json();
        (petsJson.list || []).forEach(p => {
          if (p.owner?._id && !ownerMap[p.owner._id]) ownerMap[p.owner._id] = p.owner;
        });
        const newOwner = Object.values(ownerMap).find(u => u.phone === phone.trim() || u.name === name.trim());
        if (newOwner) await handleSelectUser(newOwner);
      } else Alert.alert("Error", data.message || data.details);
    } catch (e) { Alert.alert("Error", "Network error"); }
    finally { setSavingCustomer(false); }
  };

  const handleSelectUser = async (user, petId, petObj) => {
    setSelectedUser(user);
    setSelectedPets(petId ? [petId] : []);
    setSelectedPetInfo(petObj || null);
    setUserPets([]);
  };

  const togglePet = (id) =>
    setSelectedPets((prev) => prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]);

  const handleActivate = async () => {
    if (!selectedUser) return Alert.alert("Error", "Select a user first");
    if (!selectedPets.length) return Alert.alert("Error", "Select at least one pet");
    const userId = selectedUser._id || selectedUser.id;
    if (!userId) return Alert.alert("Error", "Owner ID not found. Please try again.");
    setActivating(true);
    try {
      const res = await fetch(`${BASE_URL}/api/v1/boarding-subscription/staff/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: tokenRef.current || "" },
        body: JSON.stringify({ userId, petIds: selectedPets }),
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert("✅ Done", "Boarding activated successfully!");
        setShowAddModal(false);
        cache.current = {};
        load(filter, true);
      } else Alert.alert("Error", data.message);
    } catch { Alert.alert("Error", "Network error"); }
    finally { setActivating(false); }
  };

  const openUpdateModal = async (b) => {
    setUpdateBoarding(b);
    setUpdateSelectedPets(b.petIds?.map((p) => p._id) || []);
    setUpdating(false);
    setPetsLoading(true);
    setShowUpdateModal(true);
    try {
      const res = await fetch(`${BASE_URL}/api/v1/pet/getfilteredpetsbynameandphone`, {
        headers: { Authorization: tokenRef.current || "" },
      });
      const json = await res.json();
      const userId = b.userId?._id || b.userId;
      const pets = (json.list || []).filter((p) => p.owner?._id === userId);
      setUpdatePets(pets);
    } catch { }
    finally { setPetsLoading(false); }
  };

  const toggleUpdatePet = (id) =>
    setUpdateSelectedPets((prev) => prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]);

  const handleUpdatePets = async () => {
    if (!updateSelectedPets.length) return Alert.alert("Error", "Select at least one pet");
    setUpdating(true);
    try {
      const res = await fetch(`${BASE_URL}/api/v1/boarding-subscription/staff/update-pets`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: tokenRef.current || "" },
        body: JSON.stringify({ boardingId: updateBoarding._id, petIds: updateSelectedPets }),
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert("✅ Updated", "Boarding pets updated!");
        setShowUpdateModal(false);
        cache.current = {};
        load(filter, true);
      } else Alert.alert("Error", data.message);
    } catch { Alert.alert("Error", "Network error"); }
    finally { setUpdating(false); }
  };

  const dailyCharge = parseFloat((PRICE_PER_DAY * selectedPets.length).toFixed(2));

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.8}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Wallet Boardings</Text>
        <TouchableOpacity
          style={s.addBtn}
          onPress={openAddModal}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={18} color="#0B3D2E" />
          <Text style={s.addBtnTxt}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={s.tabRow}>
        {STATUS_FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[s.tab, filter === f && s.tabActive]}
            onPress={() => { setFilter(f); if (!cache.current[f]) setLoading(true); }}
            activeOpacity={0.8}
          >
            <Text style={[s.tabTxt, filter === f && s.tabTxtActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color="#0B3D2E" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(filter, true); }}
              tintColor="#0B3D2E"
            />
          }
        >
          {bookings.length === 0 ? (
            <View style={s.emptyBox}>
              <View style={s.emptyIconBox}>
                <Ionicons name="home-outline" size={40} color="#A8D96C" />
              </View>
              <Text style={s.emptyTitle}>No {filter} boardings</Text>
              <Text style={s.emptySub}>No wallet boarding records found</Text>
              <TouchableOpacity
                style={s.emptyBtn}
                onPress={openAddModal}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle-outline" size={18} color="#A8D96C" />
                <Text style={s.emptyBtnTxt}>Add New Boarding</Text>
              </TouchableOpacity>
            </View>
          ) : (
            bookings.map((b) => (
              <View key={b._id} style={s.card}>

                {/* Card Top */}
                <View style={s.cardTop}>
                  <View style={s.avatar}>
                    <Text style={s.avatarTxt}>
                      {b.userId?.fullName?.slice(0, 2).toUpperCase() || "??"}
                    </Text>
                  </View>
                  <View style={s.cardTopInfo}>
                    <Text style={s.ownerName}>{b.userId?.fullName || "Unknown"}</Text>
                    {b.userId?.phone ? (
                      <View style={s.phoneRow}>
                        <Ionicons name="call-outline" size={12} color="#3E7B27" />
                        <Text style={s.phoneTxt}>{b.userId.phone}</Text>
                      </View>
                    ) : (
                      <Text style={s.emailTxt} numberOfLines={1}>{b.userId?.email || "—"}</Text>
                    )}
                  </View>
                  <View style={[
                    s.statusPill,
                    b.status === "active" && s.statusActive,
                    b.status === "inactive" && s.statusInactive,
                    b.status === "pending" && s.statusPending,
                  ]}>
                    <View style={[
                      s.statusDot,
                      b.status === "active" && { backgroundColor: "#3E7B27" },
                      b.status === "inactive" && { backgroundColor: "#C62828" },
                      b.status === "pending" && { backgroundColor: "#B8860B" },
                    ]} />
                    <Text style={[
                      s.statusTxt,
                      b.status === "active" && { color: "#0B3D2E" },
                      b.status === "inactive" && { color: "#C62828" },
                      b.status === "pending" && { color: "#B8860B" },
                    ]}>
                      {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                    </Text>
                  </View>
                </View>

                {/* Stats Row */}
                <View style={s.statsRow}>
                  {[
                    { label: "Pets", val: b.numberOfPets, icon: "paw-outline" },
                    { label: "Daily", val: `₹${b.dailyCharge}`, icon: "cash-outline" },
                    { label: "Days Left", val: b.daysRemaining, icon: "hourglass-outline" },
                  ].map((item) => (
                    <View key={item.label} style={s.statBox}>
                      <Ionicons name={item.icon} size={14} color="#3E7B27" />
                      <Text style={s.statVal}>{item.val}</Text>
                      <Text style={s.statLabel}>{item.label}</Text>
                    </View>
                  ))}
                </View>

                {/* Pets */}
                {b.petIds?.length > 0 && (
                  <View style={s.petsRow}>
                    {b.petIds.map((p) => (
                      <View key={p._id} style={s.petChip}>
                        <Text style={s.petChipTxt}>
                          {p.species?.toLowerCase().includes("cat") ? "🐱" : "🐶"} {p.name}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Dates */}
                {b.status === "active" && b.startDate && (
                  <View style={s.datesRow}>
                    <Ionicons name="calendar-outline" size={13} color="#3E7B27" />
                    <Text style={s.datesTxt}>
                      {fmtDate(b.startDate)} → {fmtDate(b.endDate)}
                    </Text>
                  </View>
                )}

                {/* Action Buttons */}
                {b.status === "active" && (
                  <View style={s.actionRow}>
                    <TouchableOpacity
                      style={s.updateBtn}
                      onPress={() => openUpdateModal(b)}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="paw-outline" size={15} color="#0B3D2E" />
                      <Text style={s.updateBtnTxt}>Update Pets</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.deboardBtn, deboarding === b._id && s.deboardBtnDis]}
                      onPress={() => handleDeboard(b)}
                      disabled={deboarding === b._id}
                      activeOpacity={0.85}
                    >
                      {deboarding === b._id ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="exit-outline" size={15} color="#fff" />
                          <Text style={s.deboardBtnTxt}>Deboard</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}

                <Text style={s.cardFooter}>
                  {fmtDate(b.createdAt)} · ID: {b._id.slice(-6).toUpperCase()}
                </Text>
              </View>
            ))
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ── Add Boarding Modal ─────────────────────────────────────────── */}
      <Modal visible={showAddModal} animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <KeyboardAvoidingView style={s.modalContainer} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddModal(false)} style={s.backBtn}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={s.headerTitle}>Add Boarding</Text>
              <Text style={s.headerSub}>Search user → select pets → activate</Text>
            </View>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
            {!selectedUser ? (
              <>
                <Text style={s.sectionLabel}>Search Pet / Owner</Text>
                <View style={s.searchBox}>
                  <Ionicons name="search-outline" size={18} color="#999" />
                  <TextInput
                    style={s.searchInput}
                    placeholder="Search by pet name..."
                    placeholderTextColor="#aaa"
                    value={userSearch}
                    onChangeText={(v) => { setUserSearch(v); fetchUsers(v); }}
                  />
                </View>
                {usersLoading ? (
                  <ActivityIndicator color="#0B3D2E" style={{ marginTop: 20 }} />
                ) : allUsers.length === 0 ? (
                  <Text style={s.emptyTxt}>No pets found</Text>
                ) : (
                  allUsers.map((pet) => (
                    <TouchableOpacity
                      key={pet._id}
                      style={[s.userItem, selectedPets.includes(pet._id) && s.userItemSelected]}
                      onPress={() => handleSelectUser(pet.owner, pet._id, pet)}
                      activeOpacity={0.8}
                    >
                      <View style={s.userAvatar}>
                        <Text style={s.userAvatarTxt}>
                          {pet.species?.toLowerCase().includes("cat") ? "🐱" : "🐶"}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.userItemName}>{pet.name}</Text>
                        <Text style={s.userItemSub}>
                          {pet.breed ? `${pet.breed} · ` : ""}{pet.owner?.name || "Unknown Owner"}{pet.owner?.phone ? ` · ${pet.owner.phone}` : ""}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#A8D96C" />
                    </TouchableOpacity>
                  ))
                )}

                <View style={s.dividerRow}>
                  <View style={s.dividerLine} />
                  <Text style={s.dividerTxt}>or</Text>
                  <View style={s.dividerLine} />
                </View>

                <TouchableOpacity
                  style={[s.newCustToggle, showNewCustomer && s.newCustToggleActive]}
                  onPress={() => setShowNewCustomer(v => !v)}
                  activeOpacity={0.85}
                >
                  <Ionicons name={showNewCustomer ? "chevron-up" : "person-add-outline"} size={18} color={showNewCustomer ? "#A8D96C" : "#0B3D2E"} />
                  <Text style={[s.newCustToggleTxt, showNewCustomer && { color: "#A8D96C" }]}>
                    {showNewCustomer ? "Close" : "Add New Customer"}
                  </Text>
                </TouchableOpacity>

                {showNewCustomer && (
                  <View style={s.newCustBox}>
                    <Text style={[s.sectionLabel, { marginBottom: 12 }]}>Customer Details</Text>
                    <TextInput style={s.formInput} placeholder="Name *" placeholderTextColor="#aaa" value={newCustomer.name} onChangeText={v => setNewCustomer(p => ({ ...p, name: v }))} />
                    <TextInput style={s.formInput} placeholder="Phone *" placeholderTextColor="#aaa" keyboardType="phone-pad" value={newCustomer.phone} onChangeText={v => setNewCustomer(p => ({ ...p, phone: v }))} />
                    <TextInput style={s.formInput} placeholder="Email (optional)" placeholderTextColor="#aaa" keyboardType="email-address" autoCapitalize="none" value={newCustomer.email} onChangeText={v => setNewCustomer(p => ({ ...p, email: v }))} />
                    <TextInput style={s.formInput} placeholder="Address (optional)" placeholderTextColor="#aaa" value={newCustomer.address} onChangeText={v => setNewCustomer(p => ({ ...p, address: v }))} />

                    <Text style={[s.sectionLabel, { marginTop: 14, marginBottom: 10 }]}>Pets</Text>
                    {newPets.map((pet, idx) => (
                      <View key={idx} style={s.petFormRow}>
                        <View style={s.petFormInputs}>
                          <TextInput style={[s.formInput, { marginBottom: 6 }]} placeholder={`Pet ${idx + 1} name *`} placeholderTextColor="#aaa" value={pet.name} onChangeText={v => setNewPets(prev => prev.map((p, i) => i === idx ? { ...p, name: v } : p))} />
                          <View style={s.petSpeciesRow}>
                            {["Dog", "Cat"].map(sp => (
                              <TouchableOpacity key={sp} style={[s.speciesBtn, pet.species === sp && s.speciesBtnActive]} onPress={() => setNewPets(prev => prev.map((p, i) => i === idx ? { ...p, species: sp } : p))}>
                                <Text style={[s.speciesBtnTxt, pet.species === sp && s.speciesBtnTxtActive]}>{sp === "Dog" ? "🐶 Dog" : "🐱 Cat"}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                          <TextInput style={s.formInput} placeholder="Breed (optional)" placeholderTextColor="#aaa" value={pet.breed} onChangeText={v => setNewPets(prev => prev.map((p, i) => i === idx ? { ...p, breed: v } : p))} />
                        </View>
                        {newPets.length > 1 && (
                          <TouchableOpacity onPress={() => setNewPets(prev => prev.filter((_, i) => i !== idx))} style={s.removePetBtn}>
                            <Ionicons name="close-circle" size={22} color="#C62828" />
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                    <TouchableOpacity style={s.addPetRowBtn} onPress={() => setNewPets(prev => [...prev, { name: "", species: "Dog", breed: "" }])} activeOpacity={0.8}>
                      <Ionicons name="add-circle-outline" size={18} color="#3E7B27" />
                      <Text style={s.addPetRowBtnTxt}>Add another pet</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.activateBtn, savingCustomer && s.activateBtnDis]} onPress={handleSaveNewCustomer} disabled={savingCustomer} activeOpacity={0.85}>
                      {savingCustomer ? <ActivityIndicator color="#0B3D2E" /> : (
                        <><Ionicons name="checkmark-circle-outline" size={18} color="#0B3D2E" /><Text style={s.activateBtnTxt}>Save & Select</Text></>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </>
            ) : (
              <>
                <View style={s.selectedUserBox}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.selectedUserName}>{selectedUser?.name || selectedUser?.fullName || "Owner"}</Text>
                    <Text style={s.selectedUserSub}>{selectedUser?.phone || selectedUser?.email || ""}</Text>
                  </View>
                  <TouchableOpacity onPress={() => { setSelectedUser(null); setSelectedPets([]); setUserPets([]); }}>
                    <Text style={s.changeBtn}>Change</Text>
                  </TouchableOpacity>
                </View>

                <Text style={[s.sectionLabel, { marginTop: 16 }]}>Selected Pet</Text>
                {selectedPetInfo ? (
                  <View style={[s.userItem, { borderColor: "#3E7B27", backgroundColor: "#F0FFF0" }]}>
                    <View style={s.userAvatar}>
                      <Text style={s.userAvatarTxt}>
                        {selectedPetInfo.species?.toLowerCase().includes("cat") ? "🐱" : "🐶"}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.userItemName}>{selectedPetInfo.name}</Text>
                      <Text style={s.userItemSub}>{selectedPetInfo.breed || selectedPetInfo.species || ""}</Text>
                    </View>
                    <Ionicons name="checkmark-circle" size={22} color="#3E7B27" />
                  </View>
                ) : null}

                {selectedPets.length > 0 && (
                  <>
                    <View style={s.costBox}>
                      <View style={s.costRow}>
                        <Text style={s.costLabel}>Pets selected</Text>
                        <Text style={s.costVal}>{selectedPets.length}</Text>
                      </View>
                      <View style={[s.costRow, { borderBottomWidth: 0 }]}>
                        <Text style={s.costLabel}>Daily deduction</Text>
                        <Text style={s.costVal}>₹{dailyCharge}/day</Text>
                      </View>
                    </View>
                    <TouchableOpacity style={[s.activateBtn, activating && s.activateBtnDis]} onPress={handleActivate} disabled={activating} activeOpacity={0.85}>
                      {activating ? <ActivityIndicator color="#0B3D2E" /> : (
                        <><Ionicons name="paw-outline" size={18} color="#0B3D2E" /><Text style={s.activateBtnTxt}>Start Boarding</Text></>
                      )}
                    </TouchableOpacity>
                  </>
                )}
              </>
            )}
            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Update Pets Modal ──────────────────────────────────────────── */}
      <Modal visible={showUpdateModal} animationType="slide" onRequestClose={() => setShowUpdateModal(false)}>
        <View style={s.modalContainer}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => setShowUpdateModal(false)} style={s.backBtn}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={s.headerTitle}>Update Pets</Text>
              <Text style={s.headerSub}>{updateBoarding?.userId?.fullName || ""}</Text>
            </View>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <Text style={s.sectionLabel}>Select Pets to Board</Text>
            {petsLoading ? (
              <ActivityIndicator color="#0B3D2E" style={{ marginTop: 20 }} />
            ) : updatePets.length === 0 ? (
              <Text style={s.emptyTxt}>No pets found</Text>
            ) : (
              <View style={s.petsGrid}>
                {updatePets.map((pet) => {
                  const sel = updateSelectedPets.includes(pet._id);
                  return (
                    <TouchableOpacity key={pet._id} style={[s.petCard, sel && s.petCardSel]} onPress={() => toggleUpdatePet(pet._id)} activeOpacity={0.8}>
                      {sel && <View style={s.checkDot}><Ionicons name="checkmark" size={11} color="#fff" /></View>}
                      <Text style={s.petEmoji}>{pet.species?.toLowerCase().includes("cat") ? "🐱" : "🐶"}</Text>
                      <Text style={[s.petName, sel && s.petNameSel]} numberOfLines={1}>{pet.name}</Text>
                      {pet.breed ? <Text style={s.petBreed} numberOfLines={1}>{pet.breed}</Text> : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {updateSelectedPets.length > 0 && (
              <View style={s.costBox}>
                <View style={s.costRow}>
                  <Text style={s.costLabel}>Pets selected</Text>
                  <Text style={s.costVal}>{updateSelectedPets.length}</Text>
                </View>
                <View style={[s.costRow, { borderBottomWidth: 0 }]}>
                  <Text style={s.costLabel}>New daily charge</Text>
                  <Text style={s.costVal}>₹{(PRICE_PER_DAY * updateSelectedPets.length).toFixed(2)}/day</Text>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={[s.activateBtn, (!updateSelectedPets.length || updating) && s.activateBtnDis]}
              onPress={handleUpdatePets}
              disabled={!updateSelectedPets.length || updating}
              activeOpacity={0.85}
            >
              {updating ? <ActivityIndicator color="#0B3D2E" /> : (
                <><Ionicons name="checkmark-circle-outline" size={18} color="#0B3D2E" /><Text style={s.activateBtnTxt}>Save Changes</Text></>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F7F0" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },

  header: {
    backgroundColor: "#0B3D2E", paddingHorizontal: 20,
    paddingTop: 52, paddingBottom: 16,
    flexDirection: "row", alignItems: "center", gap: 12,
  },
  headerTitle: { fontSize: 20, fontFamily: "Poppins_700Bold", color: "#fff" },
  backBtn: { width: 36, height: 36, justifyContent: "center" },
  headerSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#A8D96C", marginTop: 1 },
  addBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#A8D96C", paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10,
  },
  addBtnTxt: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },

  tabRow: {
    flexDirection: "row", backgroundColor: "#fff",
    borderBottomWidth: 1, borderBottomColor: "#D4EDD4",
  },
  tab: {
    flex: 1, paddingVertical: 13, alignItems: "center",
    borderBottomWidth: 2, borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: "#0B3D2E" },
  tabTxt: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#999" },
  tabTxtActive: { color: "#0B3D2E" },

  scroll: { padding: 16 },

  emptyBox: { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyIconBox: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: "#0B3D2E", justifyContent: "center", alignItems: "center",
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 16, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  emptySub: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#999" },
  emptyBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#0B3D2E", borderRadius: 14,
    paddingHorizontal: 20, paddingVertical: 12, marginTop: 8,
  },
  emptyBtnTxt: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#A8D96C" },

  card: {
    backgroundColor: "#fff", borderRadius: 18, padding: 16,
    marginBottom: 14, elevation: 2, borderWidth: 1, borderColor: "#E8F5E8",
  },

  cardTop: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: "#0B3D2E", justifyContent: "center", alignItems: "center",
  },
  avatarTxt: { fontSize: 16, fontFamily: "Poppins_700Bold", color: "#A8D96C" },
  cardTopInfo: { flex: 1 },
  ownerName: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 3 },
  phoneRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  phoneTxt: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#3E7B27" },
  emailTxt: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#888" },

  statusPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  statusActive: { backgroundColor: "#E8F5E8" },
  statusInactive: { backgroundColor: "#FFEBEE" },
  statusPending: { backgroundColor: "#FFF9E6" },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusTxt: { fontSize: 11, fontFamily: "Poppins_700Bold" },

  statsRow: {
    flexDirection: "row", gap: 8, marginBottom: 12,
  },
  statBox: {
    flex: 1, backgroundColor: "#F0F7F0", borderRadius: 12, padding: 10,
    alignItems: "center", gap: 3, borderWidth: 1, borderColor: "#D4EDD4",
  },
  statVal: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  statLabel: { fontSize: 9, fontFamily: "Inter_400Regular", color: "#888" },

  petsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  petChip: {
    backgroundColor: "#E8F5E8", borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  petChipTxt: { fontSize: 11, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },

  datesRow: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#F0F7F0", borderRadius: 10, padding: 10, marginBottom: 12,
  },
  datesTxt: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },

  actionRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  updateBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, backgroundColor: "#E8F5E8", borderRadius: 12, height: 46,
    borderWidth: 1, borderColor: "#D4EDD4",
  },
  updateBtnTxt: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  deboardBtn: {
    flex: 1, backgroundColor: "#C62828", borderRadius: 12, height: 46,
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, elevation: 1,
  },
  deboardBtnDis: { opacity: 0.5 },
  deboardBtnTxt: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#fff" },

  cardFooter: {
    fontSize: 10, fontFamily: "Inter_400Regular",
    color: "#bbb", textAlign: "right",
  },

  modalContainer: { flex: 1, backgroundColor: "#F0F7F0" },
  modalHeader: {
    backgroundColor: "#0B3D2E", paddingHorizontal: 16,
    paddingTop: 52, paddingBottom: 16,
    flexDirection: "row", alignItems: "center", gap: 8,
  },
  sectionLabel: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 10 },
  searchBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: "#D4EDD4", marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: "#1A1A1A" },
  userItem: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#fff", borderRadius: 12, padding: 12,
    marginBottom: 8, borderWidth: 1, borderColor: "#E8F5E8",
  },
  userItemSelected: { borderColor: "#3E7B27", backgroundColor: "#F0FFF0" },
  userAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "#0B3D2E", justifyContent: "center", alignItems: "center",
  },
  userAvatarTxt: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#A8D96C" },
  userItemName: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  userItemSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#888", marginTop: 2 },
  selectedUserBox: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#E8F5E8", borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: "#D4EDD4",
  },
  selectedUserName: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  selectedUserSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#666", marginTop: 2 },
  changeBtn: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#3E7B27" },
  petsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 4 },
  petCard: {
    width: "30%", backgroundColor: "#F0F7F0", borderRadius: 14, padding: 12,
    alignItems: "center", borderWidth: 1.5, borderColor: "#D4EDD4", position: "relative",
  },
  petCardSel: { backgroundColor: "#0B3D2E", borderColor: "#0B3D2E" },
  checkDot: {
    position: "absolute", top: 6, right: 6,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: "#A8D96C", justifyContent: "center", alignItems: "center",
  },
  petEmoji: { fontSize: 26, marginBottom: 6 },
  petName: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#0B3D2E", textAlign: "center" },
  petNameSel: { color: "#A8D96C" },
  petBreed: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#888", textAlign: "center", marginTop: 2 },
  costBox: {
    backgroundColor: "#F0F7F0", borderRadius: 12, padding: 12, marginTop: 12,
    borderWidth: 1, borderColor: "#D4EDD4",
  },
  costRow: {
    flexDirection: "row", justifyContent: "space-between",
    paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: "#E8F5E8",
  },
  costLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#666" },
  costVal: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  activateBtn: {
    backgroundColor: "#A8D96C", borderRadius: 12, paddingVertical: 14,
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, marginTop: 16, elevation: 2,
  },
  activateBtnDis: { opacity: 0.45 },
  activateBtnTxt: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  emptyTxt: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#999", textAlign: "center", marginTop: 20 },

  dividerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#D4EDD4" },
  dividerTxt: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#999" },

  newCustToggle: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    borderWidth: 1.5, borderColor: "#0B3D2E", borderRadius: 12,
    paddingVertical: 12, marginBottom: 4,
  },
  newCustToggleActive: { backgroundColor: "#0B3D2E" },
  newCustToggleTxt: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },

  newCustBox: {
    backgroundColor: "#fff", borderRadius: 14, padding: 14,
    marginTop: 10, borderWidth: 1, borderColor: "#D4EDD4",
  },
  formInput: {
    backgroundColor: "#F0F7F0", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, fontFamily: "Inter_400Regular", color: "#1A1A1A",
    borderWidth: 1, borderColor: "#D4EDD4", marginBottom: 10,
  },
  petFormRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 8 },
  petFormInputs: { flex: 1 },
  petSpeciesRow: { flexDirection: "row", gap: 8, marginBottom: 6 },
  speciesBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1, borderColor: "#D4EDD4", alignItems: "center",
    backgroundColor: "#F0F7F0",
  },
  speciesBtnActive: { backgroundColor: "#0B3D2E", borderColor: "#0B3D2E" },
  speciesBtnTxt: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  speciesBtnTxtActive: { color: "#A8D96C" },
  removePetBtn: { paddingTop: 10 },
  addPetRowBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingVertical: 10, justifyContent: "center",
  },
  addPetRowBtnTxt: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#3E7B27" },
});
