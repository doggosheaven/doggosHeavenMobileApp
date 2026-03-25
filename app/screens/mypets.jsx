import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Header from "../../components/Header";
import { getAuth } from "../../utils/authStorage";
import { BASE_URL } from "../../constants/api";

export default function MyPetsScreen() {
  const router = useRouter();
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPets = async () => {
    try {
      const { user, token } = await getAuth();
      const encodedEmail = encodeURIComponent(user?.email || "");
      const res = await fetch(
        `${BASE_URL}/api/v1/customerappointment/getcustomerpets?email=${encodedEmail}`,
        { headers: { Authorization: token || "" } }
      );
      const data = await res.json();
      if (data.success) setPets(data.pets || []);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchPets(); }, []);
  const onRefresh = () => { setRefreshing(true); fetchPets(); };

  const calculateAge = (dob) => {
    if (!dob) return "N/A";
    const today = new Date();
    const birth = new Date(dob);
    const years = today.getFullYear() - birth.getFullYear();
    const months = today.getMonth() - birth.getMonth();
    if (years > 0) return months < 0 ? `${years - 1} yr` : `${years} yr`;
    return months <= 0 ? "< 1 month" : `${months} months`;
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0B3D2E" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="My Pets" showBack />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0B3D2E" />}
      >
        {/* Add Pet Button */}
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push("/(tabs)/Pet/PetForm")} activeOpacity={0.8}>
          <View style={styles.addBtnIcon}>
            <Ionicons name="add" size={22} color="#fff" />
          </View>
          <Text style={styles.addBtnText}>Register a New Pet</Text>
          <Ionicons name="chevron-forward" size={18} color="#A8D96C" />
        </TouchableOpacity>

        {/* Pets List */}
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
              {/* Card Header */}
              <View style={styles.cardHeader}>
                <View style={styles.petAvatar}>
                  <Text style={styles.petAvatarText}>{pet.name?.[0]?.toUpperCase() || "P"}</Text>
                </View>
                <View style={styles.petHeaderInfo}>
                  <Text style={styles.petName}>{pet.name}</Text>
                  <Text style={styles.petBreed}>{pet.breed || "Mixed Breed"}</Text>
                </View>
                <View style={styles.ageBadge}>
                  <Text style={styles.ageText}>{calculateAge(pet.dob)}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              {/* Pet Details Grid */}
              <View style={styles.detailsGrid}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Species</Text>
                  <Text style={styles.detailValue}>{pet.species || "Dog"}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Sex</Text>
                  <Text style={styles.detailValue}>{pet.sex || "N/A"}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Color</Text>
                  <Text style={styles.detailValue}>{pet.color || "N/A"}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Neutered</Text>
                  <Text style={styles.detailValue}>{pet.neutered ? "Yes ✓" : "No"}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>DOB</Text>
                  <Text style={styles.detailValue}>
                    {pet.dob ? new Date(pet.dob).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "N/A"}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Registered</Text>
                  <Text style={styles.detailValue}>
                    {pet.registrationDate ? new Date(pet.registrationDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "N/A"}
                  </Text>
                </View>
              </View>

              {/* Vaccinations */}
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

              {/* Book Service */}
              <TouchableOpacity
                style={styles.bookBtn}
                onPress={() => router.push("/(tabs)/services")}
                activeOpacity={0.8}
              >
                <Ionicons name="calendar-outline" size={16} color="#fff" />
                <Text style={styles.bookBtnText}>Book a Service</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F7F0" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
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
  emptyEmoji: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 6 },
  emptySub: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#999", marginBottom: 20 },
  emptyBtn: {
    backgroundColor: "#0B3D2E", paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20,
  },
  emptyBtnText: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#fff" },

  petCard: {
    backgroundColor: "#fff", borderRadius: 16, padding: 16,
    marginBottom: 14, elevation: 2,
    borderWidth: 1, borderColor: "#D4EDD4",
  },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  petAvatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: "#A8D96C",
    justifyContent: "center", alignItems: "center", marginRight: 12,
  },
  petAvatarText: { fontSize: 22, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  petHeaderInfo: { flex: 1 },
  petName: { fontSize: 17, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 2 },
  petBreed: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#666" },
  ageBadge: {
    backgroundColor: "#E8F5E8", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  ageText: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#3E7B27" },

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
  vaccChip: {
    backgroundColor: "#E8F5E8", borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  vaccName: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  vaccDose: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#666" },

  bookBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#0B3D2E", borderRadius: 12, padding: 12, marginTop: 12,
  },
  bookBtnText: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#fff" },
});
