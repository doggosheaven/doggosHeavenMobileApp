import React, { useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import Header from "../../components/Header";

// ── Mock data (replace with real state/context/storage later) ─────────────────
const profileData = {
  owner: {
    name: "Rahul Sharma",
    phone: "9876543210",
    email: "rahul@example.com",
    address: "12, MG Road, Bengaluru, Karnataka - 560001",
  },
  pets: [
    {
      name: "Bruno",
      species: "Dog",
      breed: "Labrador Retriever",
      sex: "Male",
      color: "Golden",
      dob: "2021-03-15",
      registrationDate: "2024-01-10",
      neutered: true,
      vaccinations: [
        { name: "Rabies", numberOfDose: "2" },
        { name: "Parvovirus", numberOfDose: "3" },
      ],
    },
    {
      name: "Coco",
      species: "Dog",
      breed: "Pomeranian",
      sex: "Female",
      color: "White",
      dob: "2022-07-20",
      registrationDate: "2024-01-10",
      neutered: false,
      vaccinations: [{ name: "Distemper", numberOfDose: "2" }],
    },
  ],
};

// ── Info Row ──────────────────────────────────────────────────────────────────
const InfoRow = ({ label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value || "—"}</Text>
  </View>
);

// ── Accordion Section ─────────────────────────────────────────────────────────
const AccordionSection = ({ emoji, title, children }) => {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.accordion}>
      <TouchableOpacity
        style={styles.accordionHeader}
        onPress={() => setOpen((v) => !v)}
        activeOpacity={0.8}
      >
        <View style={styles.accordionLeft}>
          <Text style={styles.accordionEmoji}>{emoji}</Text>
          <Text style={styles.accordionTitle}>{title}</Text>
        </View>
        <Text style={styles.accordionChevron}>{open ? "▲" : "▼"}</Text>
      </TouchableOpacity>
      {open && <View style={styles.accordionBody}>{children}</View>}
    </View>
  );
};

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const { owner, pets } = profileData;

  return (
    <View style={styles.container}>
      <Header title="My Profile" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarEmoji}>👤</Text>
          </View>
          <Text style={styles.ownerName}>{owner.name}</Text>
          <Text style={styles.ownerPhone}>📞 {owner.phone}</Text>
        </View>

        {/* Owner Information */}
        <AccordionSection emoji="🧑" title="Owner Information">
          <InfoRow label="Full Name" value={owner.name} />
          <InfoRow label="Phone" value={owner.phone} />
          <InfoRow label="Email" value={owner.email} />
          <InfoRow label="Address" value={owner.address} />
        </AccordionSection>

        {/* Pet Information */}
        <AccordionSection emoji="🐾" title="Pet Information">
          {pets.map((pet, idx) => (
            <View key={idx} style={[styles.petBlock, idx > 0 && styles.petBlockBorder]}>
              <View style={styles.petTitleRow}>
                <View style={styles.dot} />
                <Text style={styles.petTitle}>{pet.name}</Text>
              </View>
              <InfoRow label="Species" value={pet.species} />
              <InfoRow label="Breed" value={pet.breed} />
              <InfoRow label="Sex" value={pet.sex} />
              <InfoRow label="Color" value={pet.color} />
              <InfoRow label="Date of Birth" value={pet.dob} />
              <InfoRow label="Registered On" value={pet.registrationDate} />
              <InfoRow label="Neutered" value={pet.neutered ? "Yes ✅" : "No ❌"} />

              {pet.vaccinations.length > 0 && (
                <View style={styles.vaccSection}>
                  <Text style={styles.vaccTitle}>💉 Vaccinations</Text>
                  {pet.vaccinations.map((v, vIdx) => (
                    <View key={vIdx} style={styles.vaccRow}>
                      <Text style={styles.vaccName}>{v.name}</Text>
                      <Text style={styles.vaccDose}>{v.numberOfDose} dose(s)</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </AccordionSection>
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5EDE0",
  },
  scroll: { flex: 1 },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },

  // Avatar
  avatarSection: {
    alignItems: "center",
    marginBottom: 24,
    marginTop: 8,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#7BC743",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
    elevation: 4,
  },
  avatarEmoji: { fontSize: 36 },
  ownerName: {
    fontSize: 20,
    fontFamily: "Poppins_700Bold",
    color: "#0B3D2E",
    marginBottom: 4,
  },
  ownerPhone: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#666",
  },

  // Accordion
  accordion: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    marginBottom: 14,
    overflow: "hidden",
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(123,199,67,0.25)",
  },
  accordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#0B3D2E",
  },
  accordionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  accordionEmoji: { fontSize: 20 },
  accordionTitle: {
    fontSize: 16,
    fontFamily: "Poppins_700Bold",
    color: "#FFFFFF",
  },
  accordionChevron: {
    fontSize: 12,
    color: "#7BC743",
    fontWeight: "700",
  },
  accordionBody: {
    padding: 16,
  },

  // Info rows
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F0EAE0",
  },
  infoLabel: {
    fontSize: 13,
    color: "#7BC743",
    fontFamily: "Poppins_700Bold",
    flex: 1,
  },
  infoValue: {
    fontSize: 13,
    color: "#0B3D2E",
    fontFamily: "Inter_400Regular",
    flex: 2,
    textAlign: "right",
  },

  // Pet block
  petBlock: {
    marginBottom: 12,
  },
  petBlockBorder: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(123,199,67,0.3)",
  },
  petTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#7BC743",
  },
  petTitle: {
    fontSize: 15,
    fontFamily: "Poppins_700Bold",
    color: "#0B3D2E",
  },

  // Vaccinations
  vaccSection: {
    marginTop: 10,
    backgroundColor: "rgba(123,199,67,0.08)",
    borderRadius: 10,
    padding: 10,
  },
  vaccTitle: {
    fontSize: 13,
    fontFamily: "Poppins_700Bold",
    color: "#0B3D2E",
    marginBottom: 6,
  },
  vaccRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  vaccName: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#333",
  },
  vaccDose: {
    fontSize: 13,
    fontFamily: "Poppins_700Bold",
    color: "#7BC743",
  },
});
