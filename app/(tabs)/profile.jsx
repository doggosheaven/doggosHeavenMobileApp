import { useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, Modal, Dimensions, Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import Header from "../../components/Header";
import { getAuth, clearAuth } from "../../utils/authStorage";
import { BASE_URL } from "../../constants/api";

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [pets, setPets] = useState([]);
  const [petsLoading, setPetsLoading] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);

  const loadProfile = useCallback(async () => {
    const { user: u, token } = await getAuth();
    setUser(u);
    if (u?.email) fetchPets(u.email, token);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const fetchPets = async (email, token) => {
    setPetsLoading(true);
    try {
      const encodedEmail = encodeURIComponent(email);
      const res = await fetch(
        `${BASE_URL}/api/v1/customerappointment/getcustomerpets?email=${encodedEmail}`,
        { headers: { Authorization: token || "" } }
      );
      const data = await res.json();
      if (data.success) setPets(data.pets || []);
    } catch (e) {
      console.log(e);
    } finally {
      setPetsLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout", style: "destructive",
        onPress: async () => {
          await clearAuth();
          router.replace("/auth/login");
        },
      },
    ]);
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const calculateAge = (dob) => {
    if (!dob) return "N/A";
    const today = new Date();
    const birth = new Date(dob);
    const years = today.getFullYear() - birth.getFullYear();
    const months = today.getMonth() - birth.getMonth();
    if (years > 0) return months < 0 ? `${years - 1}y` : `${years}y`;
    return months <= 0 ? "< 1m" : `${months}m`;
  };

  const menuItems = [
    { icon: "paw-outline", label: "My Pets", onPress: () => router.push("/screens/mypets"), iconColor: "#3E7B27" },
    { icon: "wallet-outline", label: "My Wallet", onPress: () => router.push("/screens/walletscreen"), iconColor: "#3E7B27" },
    { icon: "home-outline", label: "15-Day Boarding Plan", onPress: () => router.push("/screens/boardingsubscription"), iconColor: "#3E7B27" },
    { icon: "notifications-outline", label: "Notifications", onPress: () => router.push("/screens/notifications") },
    { icon: "key-outline", label: "Change Password", onPress: () => router.push("/screens/changepassword") },
    { icon: "person-outline", label: "Edit Profile", onPress: () => router.push("/screens/editprofile") },
    { icon: "star-outline", label: "Rate Us", onPress: () => setShowComingSoon(true) },
    { icon: "help-circle-outline", label: "Help & Support", onPress: () => router.push("/screens/helpsupport") },
    { icon: "shield-checkmark-outline", label: "Privacy Policy", onPress: () => router.push("/screens/privacypolicy") },
    { icon: "reader-outline", label: "Terms & Conditions", onPress: () => router.push("/screens/termsandconditions") },
    { icon: "return-up-back-outline", label: "Refund Policy", onPress: () => router.push("/screens/refundpolicy") },
    { icon: "bag-handle-outline", label: "Shipping & Delivery", onPress: () => router.push("/screens/shippingdelivery") },
  ];

  return (
    <View style={styles.container}>
      <Header title="Profile" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Avatar Card */}
        <View style={styles.avatarCard}>
          <TouchableOpacity style={styles.avatarWrapper} onPress={() => router.push("/screens/editprofile")} activeOpacity={0.8}>
            {user?.profileImage ? (
              <Image source={{ uri: user.profileImage }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{getInitials(user?.fullName)}</Text>
              </View>
            )}
            <View style={styles.editIconBadge}>
              <Ionicons name="pencil" size={12} color="#0B3D2E" />
            </View>
          </TouchableOpacity>
          <Text style={styles.userName}>{user?.fullName || "Pet Parent"}</Text>
          <Text style={styles.userEmail}>{user?.email || ""}</Text>
          <View style={styles.roleBadge}>
            <Ionicons name="hand-left" size={14} color="#A8D96C" />
            <Text style={styles.roleText}>Pet Parent</Text>
          </View>
        </View>

        {/* My Pets */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Pets</Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/Pet/PetForm")} style={styles.addPetBtn}>
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={styles.addPetText}>Add Pet</Text>
            </TouchableOpacity>
          </View>

          {petsLoading ? (
            <ActivityIndicator size="small" color="#0B3D2E" style={{ marginVertical: 16 }} />
          ) : pets.length === 0 ? (
            <TouchableOpacity style={styles.emptyPets} onPress={() => router.push("/(tabs)/Pet/PetForm")}>
            <Ionicons name="hand-left-outline" size={32} color="#3E7B27" />
              <Text style={styles.emptyPetsText}>No pets registered yet</Text>
              <Text style={styles.emptyPetsSub}>Tap to add your first pet</Text>
            </TouchableOpacity>
          ) : (() => {
            const sectionPadding = 32;
            const cardGap = 10;
            const availableWidth = Dimensions.get("window").width - 32 - sectionPadding;
            const displayPets = pets.slice(0, 3);
            const cardWidth =
              pets.length === 1 ? availableWidth
              : pets.length === 2 ? (availableWidth - cardGap) / 2
              : (availableWidth - cardGap * 2) / 3;

            return (
              <View>
                <View style={styles.petsGrid}>
                  {displayPets.map((pet, i) => (
                    <View key={i} style={[styles.petCard, { width: cardWidth }]}>
                      <View style={styles.petAvatar}>
                        {pet.image
                          ? <Image source={{ uri: pet.image }} style={styles.petAvatarImg} />
                          : <Text style={styles.petAvatarText}>{pet.name?.[0]?.toUpperCase() || "P"}</Text>
                        }
                      </View>
                      <Text style={styles.petName} numberOfLines={1}>{pet.name}</Text>
                      <Text style={styles.petBreed} numberOfLines={1}>{pet.breed || "Mixed"}</Text>
                      <Text style={styles.petAge}>{calculateAge(pet.dob)}</Text>
                    </View>
                  ))}
                </View>
                {pets.length > 3 && (
                  <TouchableOpacity style={styles.viewAllPetsBtn} onPress={() => router.push("/screens/mypets")} activeOpacity={0.8}>
                    <Ionicons name="heart-outline" size={16} color="#0B3D2E" />
                    <Text style={styles.viewAllPetsText}>View All Pets ({pets.length})</Text>
                    <Ionicons name="chevron-forward" size={16} color="#0B3D2E" />
                  </TouchableOpacity>
                )}
              </View>
            );
          })()}
        </View>

        {/* Menu Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Links</Text>
          <View style={styles.menuList}>
            {menuItems.map((item, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.menuItem, i === menuItems.length - 1 && styles.menuItemLast]}
                onPress={item.onPress}
                activeOpacity={0.7}
              >
                <View style={styles.menuIconBox}>
                  <Ionicons name={item.icon} size={20} color={item.iconColor || "#0B3D2E"} />
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={16} color="#aaa" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={20} color="#C62828" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <Text style={styles.version}>DoggosHeaven v1.0.0</Text>
      </ScrollView>

      <Modal transparent animationType="fade" visible={showComingSoon} onRequestClose={() => setShowComingSoon(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Ionicons name="paw" size={48} color="#A8D96C" style={{ marginBottom: 10 }} />
            <Text style={styles.modalTitle}>Coming Soon!</Text>
            <Text style={styles.modalSub}>We're working on something pawsome for you.</Text>
            <TouchableOpacity style={styles.modalBtn} onPress={() => setShowComingSoon(false)}>
              <Text style={styles.modalBtnText}>Got it!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F7F0" },
  scroll: { padding: 16, paddingBottom: 40 },

  // Avatar
  avatarCard: {
    backgroundColor: "#0B3D2E", borderRadius: 20, padding: 24,
    alignItems: "center", marginBottom: 16, elevation: 3,
  },
  avatarWrapper: { position: "relative", marginBottom: 12 },
  avatarCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: "#A8D96C",
    justifyContent: "center", alignItems: "center",
  },
  avatarImage: {
    width: 80, height: 80, borderRadius: 40,
  },
  editIconBadge: {
    position: "absolute", bottom: 0, right: 0,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: "#A8D96C",
    justifyContent: "center", alignItems: "center",
    borderWidth: 2, borderColor: "#0B3D2E",
  },
  avatarText: { fontSize: 28, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  userName: { fontSize: 20, fontFamily: "Poppins_700Bold", color: "#fff", marginBottom: 4 },
  userEmail: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#aaa", marginBottom: 10 },
  roleBadge: {
    backgroundColor: "rgba(168,217,108,0.2)",
    paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20,
    flexDirection: "row", alignItems: "center", gap: 6,
  },
  roleText: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#A8D96C" },

  // Section
  section: {
    backgroundColor: "#fff", borderRadius: 16, padding: 16,
    marginBottom: 14, elevation: 2,
    borderWidth: 1, borderColor: "#D4EDD4",
  },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  sectionTitle: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  addPetBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#0B3D2E", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },
  addPetText: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#fff" },

  // Pets
  emptyPets: {
    alignItems: "center", paddingVertical: 20,
    borderWidth: 1.5, borderColor: "#D4EDD4",
    borderStyle: "dashed", borderRadius: 14,
  },
  emptyPetsText: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginTop: 8 },
  emptyPetsSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#999", marginTop: 4 },
  petsGrid: { flexDirection: "row", gap: 10, marginTop: 4 },
  petCard: {
    backgroundColor: "#F0F7F0", borderRadius: 14, padding: 12,
    alignItems: "center",
    borderWidth: 1, borderColor: "#D4EDD4",
  },
  viewAllPetsBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    marginTop: 10, paddingVertical: 10, borderRadius: 12,
    backgroundColor: "#F0F7F0", borderWidth: 1, borderColor: "#D4EDD4",
  },
  viewAllPetsText: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E", flex: 1, textAlign: "center" },
  petAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "#A8D96C",
    justifyContent: "center", alignItems: "center", marginBottom: 8,
    overflow: "hidden",
  },
  petAvatarImg: { width: 44, height: 44, borderRadius: 22 },
  petAvatarText: { fontSize: 18, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  petName: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 2 },
  petBreed: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#666", textAlign: "center", marginBottom: 2 },
  petAge: { fontSize: 11, fontFamily: "Poppins_700Bold", color: "#3E7B27" },

  // Menu
  menuList: { gap: 0 },
  menuItem: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: "#F0F7F0",
  },
  menuItemLast: { borderBottomWidth: 0 },
  menuIconBox: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "#E8F5E8",
    justifyContent: "center", alignItems: "center",
  },
  menuLabel: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: "#1A1A1A" },

  // Logout
  logoutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#fff", borderRadius: 16, padding: 16,
    borderWidth: 1.5, borderColor: "#FFCDD2", marginBottom: 16, elevation: 1,
  },
  logoutText: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#C62828" },

  version: { textAlign: "center", fontSize: 11, fontFamily: "Inter_400Regular", color: "#bbb" },

  // Coming Soon Modal
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center", alignItems: "center",
  },
  modalBox: {
    backgroundColor: "#fff", borderRadius: 20, padding: 28,
    alignItems: "center", width: "75%",
    borderTopWidth: 4, borderTopColor: "#A8D96C",
    elevation: 10,
  },
  modalTitle: { fontSize: 22, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 8 },
  modalSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#666", textAlign: "center", marginBottom: 20 },
  modalBtn: {
    backgroundColor: "#0B3D2E", paddingHorizontal: 32, paddingVertical: 12, borderRadius: 25,
  },
  modalBtnText: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#A8D96C" },
});
