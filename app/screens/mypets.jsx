import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Image, Modal, TextInput, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Header from "../../components/Header";
import { getAuth } from "../../utils/authStorage";
import { BASE_URL } from "../../constants/api";
import { useApp } from "../../context/AppContext";

export default function MyPetsScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [token, setToken] = useState("");
  const [unblockModal, setUnblockModal] = useState(null);
  const [unblockReason, setUnblockReason] = useState("");
  const [unblockLoading, setUnblockLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const { pets, loadPets, setPets } = useApp();

  useEffect(() => {
    loadPets();
    getAuth().then(({ token: t }) => setToken(t || ""));
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPets(true);
    setRefreshing(false);
  };

  const handleDelete = (pet) => {
    Alert.alert(
      "Delete Pet",
      `Are you sure you want to delete ${pet.name}? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete", style: "destructive",
          onPress: async () => {
            setDeletingId(pet._id);
            try {
              const res = await fetch(`${BASE_URL}/api/v1/customer/pet/delete/${pet._id}`, {
                method: "DELETE",
                headers: { Authorization: token },
              });
              const data = await res.json();
              if (data.success) {
                setPets((prev) => prev.filter((p) => p._id !== pet._id));
              } else {
                Alert.alert("Error", data.message || "Could not delete pet.");
              }
            } catch { Alert.alert("Error", "Network error."); }
            finally { setDeletingId(null); }
          },
        },
      ]
    );
  };

  const handleUnblockRequest = async () => {
    if (!unblockReason.trim())
      return Alert.alert("Required", "Please explain why you want to unblock your pet.");
    setUnblockLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/v1/pet/unblock-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token },
        body: JSON.stringify({ petId: unblockModal._id, reason: unblockReason.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setUnblockModal(null);
        setUnblockReason("");
        Alert.alert("✅ Request Sent", "Your unblock request has been sent to the admin. You will be notified once it is reviewed.");
      } else {
        Alert.alert("Error", data.message || "Could not submit request.");
      }
    } catch { Alert.alert("Error", "Network error."); }
    finally { setUnblockLoading(false); }
  };

  const calculateAge = (dob) => {
    if (!dob) return "N/A";
    const today = new Date();
    const birth = new Date(dob);
    const years = today.getFullYear() - birth.getFullYear();
    const months = today.getMonth() - birth.getMonth();
    if (years > 0) return months < 0 ? `${years - 1} yr` : `${years} yr`;
    return months <= 0 ? "< 1 month" : `${months} months`;
  };

  return (
    <View style={styles.container}>
      <Header title="My Pets" showBack />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0B3D2E" />}
      >
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push("/(tabs)/Pet/PetForm")} activeOpacity={0.8}>
          <View style={styles.addBtnIcon}>
            <Ionicons name="add" size={22} color="#fff" />
          </View>
          <Text style={styles.addBtnText}>Register a New Pet</Text>
          <Ionicons name="chevron-forward" size={18} color="#A8D96C" />
        </TouchableOpacity>

        {pets.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="paw" size={48} color="#3E7B27" style={{ marginBottom: 12 }} />
            <Text style={styles.emptyTitle}>No Pets Registered</Text>
            <Text style={styles.emptySub}>Add your first pet to get started</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push("/(tabs)/Pet/PetForm")}>
              <Text style={styles.emptyBtnText}>Add Pet</Text>
            </TouchableOpacity>
          </View>
        ) : (
          pets.map((pet, i) => (
            <View key={i} style={styles.petCard}>
              <View style={styles.cardHeader}>
                {pet.image ? (
                  <Image source={{ uri: pet.image }} style={styles.petAvatarImg} />
                ) : (
                  <View style={styles.petAvatar}>
                    <Text style={styles.petAvatarText}>{pet.name?.[0]?.toUpperCase() || "P"}</Text>
                  </View>
                )}
                <View style={styles.petHeaderInfo}>
                  <Text style={styles.petName}>{pet.name}</Text>
                  <Text style={styles.petBreed}>{pet.breed || "Mixed Breed"}</Text>
                </View>
                <View style={styles.ageBadge}>
                  <Text style={styles.ageText}>{calculateAge(pet.dob)}</Text>
                </View>
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => router.push({ pathname: "/(tabs)/../screens/editpet", params: { petId: pet._id, pet: JSON.stringify(pet) } })}
                  activeOpacity={0.8}
                >
                  <Ionicons name="pencil" size={15} color="#0B3D2E" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDelete(pet)}
                  activeOpacity={0.8}
                  disabled={deletingId === pet._id}
                >
                  {deletingId === pet._id
                    ? <ActivityIndicator size="small" color="#C62828" />
                    : <Ionicons name="trash-outline" size={15} color="#C62828" />}
                </TouchableOpacity>
              </View>

              <View style={styles.divider} />

              <View style={styles.detailsGrid}>
                {[
                  { label: "Species", value: pet.species || "Dog" },
                  { label: "Sex", value: pet.sex || "N/A" },
                  { label: "Color", value: pet.color || "N/A" },
                  { label: "Neutered", value: pet.neutered ? "Yes ✓" : "No" },
                  { label: "DOB", value: pet.dob ? new Date(pet.dob).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "N/A" },
                  { label: "Registered", value: pet.registrationDate ? new Date(pet.registrationDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "N/A" },
                ].map((d) => (
                  <View key={d.label} style={styles.detailItem}>
                    <Text style={styles.detailLabel}>{d.label}</Text>
                    <Text style={styles.detailValue}>{d.value}</Text>
                  </View>
                ))}
              </View>

              {pet.vaccinations?.length > 0 && (
                <>
                  <View style={styles.divider} />
                  <Text style={styles.vaccTitle}>💉 Vaccinations</Text>
                  <View style={styles.vaccRow}>
                    {pet.vaccinations.map((v, vi) => (
                      <View key={vi} style={styles.vaccChip}>
                        <Text style={styles.vaccName}>{v.name}</Text>
                        <Text style={styles.vaccDose}>{v.numberOfDose} dose</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}

              {pet.isBlacklisted ? (
                <View style={styles.bookBtnDisabled}>
                  <Ionicons name="ban" size={16} color="#C62828" />
                  <Text style={styles.bookBtnDisabledText}>Booking Disabled (Blacklisted)</Text>
                </View>
              ) : (
                <TouchableOpacity style={styles.bookBtn} onPress={() => router.push("/(tabs)/services")} activeOpacity={0.8}>
                  <Ionicons name="calendar-outline" size={16} color="#fff" />
                  <Text style={styles.bookBtnText}>Book a Service</Text>
                </TouchableOpacity>
              )}

              {pet.isBlacklisted && (
                <View style={styles.blacklistBox}>
                  <View style={styles.blacklistHeader}>
                    <Ionicons name="ban" size={16} color="#C62828" />
                    <Text style={styles.blacklistTitle}>This pet is blacklisted</Text>
                  </View>
                  {pet.blacklistReason ? <Text style={styles.blacklistReason}>Reason: {pet.blacklistReason}</Text> : null}
                  <TouchableOpacity style={styles.unblockBtn} onPress={() => { setUnblockModal(pet); setUnblockReason(""); }} activeOpacity={0.8}>
                    <Ionicons name="mail-outline" size={15} color="#0B3D2E" />
                    <Text style={styles.unblockBtnText}>Request Unblock</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={!!unblockModal} transparent animationType="slide" onRequestClose={() => setUnblockModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request Unblock</Text>
              <TouchableOpacity onPress={() => setUnblockModal(null)}>
                <Ionicons name="close" size={22} color="#0B3D2E" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalPetName}>Pet: {unblockModal?.name}</Text>
            <Text style={styles.modalLabel}>Why should your pet be unblocked? *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Explain your reason in detail. This will be reviewed by admin only."
              placeholderTextColor="#aaa"
              value={unblockReason}
              onChangeText={setUnblockReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <View style={styles.modalNote}>
              <Ionicons name="shield-checkmark-outline" size={14} color="#3E7B27" />
              <Text style={styles.modalNoteText}>Your request will be sent directly to admin only. Staff cannot see this.</Text>
            </View>
            <TouchableOpacity
              style={[styles.modalSubmitBtn, unblockLoading && { opacity: 0.6 }]}
              onPress={handleUnblockRequest}
              disabled={unblockLoading}
              activeOpacity={0.8}
            >
              {unblockLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="send" size={16} color="#fff" />
                  <Text style={styles.modalSubmitText}>Send Request to Admin</Text>
                </>
              )}
            </TouchableOpacity>
            <View style={{ height: 20 }} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F7F0" },
  scroll: { padding: 16, paddingBottom: 40 },

  addBtn: {
    backgroundColor: "#0B3D2E", borderRadius: 16, padding: 16,
    flexDirection: "row", alignItems: "center", marginBottom: 16, elevation: 3,
  },
  addBtnIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "rgba(168,217,108,0.2)",
    justifyContent: "center", alignItems: "center", marginRight: 12,
  },
  addBtnText: { flex: 1, fontSize: 15, fontFamily: "Poppins_700Bold", color: "#fff" },

  emptyBox: {
    alignItems: "center", paddingVertical: 60,
    backgroundColor: "#fff", borderRadius: 16,
    borderWidth: 1, borderColor: "#D4EDD4",
  },
  emptyTitle: { fontSize: 18, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 6 },
  emptySub: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#999", marginBottom: 20 },
  emptyBtn: { backgroundColor: "#0B3D2E", paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 },
  emptyBtnText: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#fff" },

  petCard: {
    backgroundColor: "#fff", borderRadius: 16, padding: 16,
    marginBottom: 14, elevation: 2, borderWidth: 1, borderColor: "#D4EDD4",
  },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  petAvatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: "#A8D96C", justifyContent: "center", alignItems: "center", marginRight: 12,
  },
  petAvatarImg: { width: 52, height: 52, borderRadius: 26, marginRight: 12 },
  petAvatarText: { fontSize: 22, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  petHeaderInfo: { flex: 1 },
  petName: { fontSize: 17, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 2 },
  petBreed: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#666" },
  ageBadge: { backgroundColor: "#E8F5E8", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  ageText: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#3E7B27" },
  editBtn: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: "#A8D96C",
    justifyContent: "center", alignItems: "center", marginLeft: 8,
  },
  deleteBtn: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: "#FFF0F0",
    justifyContent: "center", alignItems: "center", marginLeft: 6,
    borderWidth: 1, borderColor: "#FFCDD2",
  },

  divider: { height: 1, backgroundColor: "#E8F5E8", marginVertical: 12 },

  detailsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  detailItem: {
    backgroundColor: "#F0F7F0", borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8, minWidth: "30%",
  },
  detailLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#666", marginBottom: 2 },
  detailValue: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },

  vaccTitle: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 8 },
  vaccRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  vaccChip: { backgroundColor: "#E8F5E8", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  vaccName: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  vaccDose: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#666" },

  bookBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#0B3D2E", borderRadius: 12, padding: 12, marginTop: 12,
  },
  bookBtnText: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#fff" },
  bookBtnDisabled: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#FFF5F5", borderRadius: 12, padding: 12, marginTop: 12,
    borderWidth: 1.5, borderColor: "#FFCDD2",
  },
  bookBtnDisabledText: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#C62828" },

  blacklistBox: {
    marginTop: 12, backgroundColor: "#FFF5F5", borderRadius: 12,
    padding: 12, borderWidth: 1.5, borderColor: "#FFCDD2",
  },
  blacklistHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  blacklistTitle: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#C62828" },
  blacklistReason: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#C62828", marginBottom: 10 },
  unblockBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    backgroundColor: "#A8D96C", borderRadius: 10, paddingVertical: 10,
  },
  unblockBtnText: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 10,
  },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  modalTitle: { fontSize: 17, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  modalPetName: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#C62828", marginBottom: 12 },
  modalLabel: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 8 },
  modalInput: {
    backgroundColor: "#F0F7F0", borderRadius: 12, padding: 12,
    fontSize: 13, fontFamily: "Inter_400Regular", color: "#1A1A1A",
    borderWidth: 1, borderColor: "#D4EDD4", minHeight: 100, marginBottom: 12,
  },
  modalNote: {
    flexDirection: "row", alignItems: "flex-start", gap: 6,
    backgroundColor: "#E8F5E8", borderRadius: 10, padding: 10, marginBottom: 14,
  },
  modalNoteText: { flex: 1, fontSize: 11, fontFamily: "Inter_400Regular", color: "#3E7B27", lineHeight: 16 },
  modalSubmitBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#0B3D2E", borderRadius: 14, paddingVertical: 14,
  },
  modalSubmitText: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#A8D96C" },
});
