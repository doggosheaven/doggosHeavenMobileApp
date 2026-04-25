import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Header from "../../components/Header";
import { useApp } from "../../context/AppContext";

export default function MyPrescriptionsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [detailModal, setDetailModal] = useState(null);
  const { prescriptions, loadPrescriptions } = useApp();

  useEffect(() => { loadPrescriptions(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPrescriptions(true);
    setRefreshing(false);
  };

  const formatDate = (d) =>
    new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  const getAllMeds = (rx) => [
    ...(rx.items   || []).map(m => ({ name: m.id?.itemName || "Item",   qty: m.quantity, unit: "item",   icon: "cube-outline" })),
    ...(rx.tablets || []).map(m => ({ name: m.id?.itemName || "Tablet", qty: m.quantity, unit: "tablet", icon: "medical-outline" })),
    ...(rx.ml      || []).map(m => ({ name: m.id?.itemName || "ML",     qty: m.quantity, unit: "ml",     icon: "water-outline" })),
    ...(rx.mg      || []).map(m => ({ name: m.id?.itemName || "MG",     qty: m.quantity, unit: "mg",     icon: "flask-outline" })),
  ];

  return (
    <View style={s.container}>
      <Header title="My Prescriptions" showBack />
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0B3D2E" />}
      >
        {prescriptions.length === 0 ? (
          <View style={s.emptyBox}>
            <Ionicons name="document-text-outline" size={48} color="#A8D96C" />
            <Text style={s.emptyTitle}>No Prescriptions Yet</Text>
            <Text style={s.emptySub}>Your vet prescriptions will appear here</Text>
          </View>
        ) : (
          prescriptions.map((rx) => {
            const meds = getAllMeds(rx);
            return (
              <TouchableOpacity key={rx._id} style={s.card} onPress={() => setDetailModal(rx)} activeOpacity={0.85}>
                <View style={s.cardHeader}>
                  <View style={s.petAvatarBox}>
                    <Text style={s.petAvatarTxt}>{rx.petId?.name?.slice(0, 2).toUpperCase() || "🐾"}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.petName}>🐾 {rx.petId?.name || "Pet"}</Text>
                    <Text style={s.dateText}>{formatDate(rx.createdAt)}</Text>
                  </View>
                  {rx.price > 0 && (
                    <View style={s.priceBadge}><Text style={s.priceTxt}>₹{rx.price}</Text></View>
                  )}
                </View>
                {rx.diagnosis ? <Text numberOfLines={2} style={s.diagnosis}>🩺 {rx.diagnosis}</Text> : null}
                <View style={s.medPreview}>
                  <Ionicons name="medkit-outline" size={13} color="#3E7B27" />
                  <Text style={s.medPreviewTxt}>
                    {meds.length === 0 ? "No medicines" : `${meds.length} medicine${meds.length > 1 ? "s" : ""} prescribed`}
                  </Text>
                </View>
                {rx.nextFollowUp && (
                  <View style={s.followUpRow}>
                    <Ionicons name="calendar-outline" size={13} color="#F59E0B" />
                    <Text style={s.followUpTxt}>Follow-up: {formatDate(rx.nextFollowUp)}</Text>
                  </View>
                )}
                <Text style={s.viewMore}>View Details →</Text>
              </TouchableOpacity>
            );
          })
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal
        visible={!!detailModal}
        animationType="slide"
        presentationStyle={Platform.OS === "ios" ? "pageSheet" : "fullScreen"}
        onRequestClose={() => setDetailModal(null)}
      >
        <SafeAreaView style={s.container} edges={["top", "left", "right"]}>
          {Platform.OS === "ios" && (
            <View style={s.dragHandleBar}>
              <View style={s.dragHandle} />
            </View>
          )}
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => setDetailModal(null)} style={s.modalCloseBtn}>
              <Ionicons name="chevron-down" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={s.modalHeaderTitle}>Prescription Detail</Text>
            <View style={{ width: 36 }} />
          </View>
          {detailModal && (() => {
            const meds = getAllMeds(detailModal);
            return (
              <ScrollView contentContainerStyle={s.modalScroll} showsVerticalScrollIndicator={false}>
                <View style={s.modalPetCard}>
                  <View style={s.modalPetAvatar}>
                    <Text style={s.modalPetAvatarTxt}>{detailModal.petId?.name?.slice(0, 2).toUpperCase() || "🐾"}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.modalPetName}>🐾 {detailModal.petId?.name || "Pet"}</Text>
                    <Text style={s.modalDate}>📅 {formatDate(detailModal.createdAt)}</Text>
                  </View>
                  {detailModal.price > 0 && (
                    <View style={s.priceBadge}><Text style={s.priceTxt}>₹{detailModal.price}</Text></View>
                  )}
                </View>
                {detailModal.diagnosis ? (
                  <View style={s.section}>
                    <Text style={s.sectionLabel}>Diagnosis</Text>
                    <Text style={s.sectionValue}>🩺 {detailModal.diagnosis}</Text>
                  </View>
                ) : null}
                <View style={s.section}>
                  <Text style={s.sectionLabel}>Medicines Prescribed</Text>
                  {meds.length === 0 ? (
                    <Text style={s.noMedsTxt}>No medicines prescribed</Text>
                  ) : (
                    meds.map((m, i) => (
                      <View key={i} style={s.medRow}>
                        <Ionicons name={m.icon} size={15} color="#3E7B27" />
                        <Text style={s.medName}>{m.name}</Text>
                        <Text style={s.medQty}>× {m.qty} {m.unit}</Text>
                      </View>
                    ))
                  )}
                </View>
                {detailModal.nextFollowUp && (
                  <View style={s.section}>
                    <Text style={s.sectionLabel}>Follow-up</Text>
                    <View style={s.followUpDetail}>
                      <Ionicons name="calendar-outline" size={15} color="#F59E0B" />
                      <Text style={s.followUpDetailTxt}>{formatDate(detailModal.nextFollowUp)}</Text>
                      {detailModal.followUpTime ? (
                        <>
                          <Ionicons name="time-outline" size={15} color="#F59E0B" />
                          <Text style={s.followUpDetailTxt}>{detailModal.followUpTime}</Text>
                        </>
                      ) : null}
                    </View>
                    {detailModal.followUpPurpose ? (
                      <Text style={s.followUpPurpose}>Purpose: {detailModal.followUpPurpose}</Text>
                    ) : null}
                  </View>
                )}
                <View style={{ height: 40 }} />
              </ScrollView>
            );
          })()}
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F7F0" },
  scroll: { padding: 16 },

  emptyBox: { alignItems: "center", paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginTop: 12, marginBottom: 6 },
  emptySub: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#999" },

  card: {
    backgroundColor: "#fff", borderRadius: 16, padding: 16,
    marginBottom: 12, elevation: 2, borderWidth: 1, borderColor: "#D4EDD4",
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  petAvatarBox: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "#0B3D2E", justifyContent: "center", alignItems: "center",
  },
  petAvatarTxt: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#A8D96C" },
  petName: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  dateText: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#999", marginTop: 2 },
  priceBadge: { backgroundColor: "#E8F5E8", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  priceTxt: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#3E7B27" },
  diagnosis: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#444", marginBottom: 8, lineHeight: 18 },
  medPreview: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  medPreviewTxt: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#3E7B27" },
  followUpRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  followUpTxt: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#F59E0B" },
  viewMore: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#3E7B27", marginTop: 4 },

  modalHeader: {
    backgroundColor: "#0B3D2E", paddingHorizontal: 20,
    paddingTop: 12, paddingBottom: 16,
    flexDirection: "row", alignItems: "center", gap: 12,
  },
  dragHandleBar: {
    backgroundColor: "#0B3D2E",
    alignItems: "center", paddingTop: 10, paddingBottom: 4,
  },
  dragHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: "rgba(168,217,108,0.5)",
  },
  modalCloseBtn: { width: 36, height: 36, justifyContent: "center" },
  modalHeaderTitle: { fontSize: 18, fontFamily: "Poppins_700Bold", color: "#fff", flex: 1 },
  modalScroll: { padding: 16 },

  modalPetCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#0B3D2E", borderRadius: 16, padding: 16, marginBottom: 14,
  },
  modalPetAvatar: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: "#1A5C3A", justifyContent: "center", alignItems: "center",
    borderWidth: 2, borderColor: "#A8D96C",
  },
  modalPetAvatarTxt: { fontSize: 17, fontFamily: "Poppins_700Bold", color: "#A8D96C" },
  modalPetName: { fontSize: 16, fontFamily: "Poppins_700Bold", color: "#fff", marginBottom: 4 },
  modalDate: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#A8D96C" },

  section: {
    backgroundColor: "#fff", borderRadius: 14, padding: 14,
    marginBottom: 12, borderWidth: 1, borderColor: "#D4EDD4",
  },
  sectionLabel: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#3E7B27", marginBottom: 8 },
  sectionValue: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#1A1A1A", lineHeight: 20 },
  noMedsTxt: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#999" },

  medRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#F0F7F0",
  },
  medName: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: "#0B3D2E" },
  medQty: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#3E7B27" },

  followUpDetail: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  followUpDetailTxt: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#1A1A1A" },
  followUpPurpose: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#666", marginTop: 4 },
});
