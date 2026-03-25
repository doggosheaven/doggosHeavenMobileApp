import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function ServiceCard({ service }) {
  const router = useRouter();

  const handlePress = () => {
    router.push("/Pet/PetForm");
  };

  return (
    <TouchableOpacity 
      style={styles.card}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {/* Left Side - Service Image */}
      <Image
        source={{ uri: service.image }}
        style={styles.serviceImage}
        resizeMode="cover"
      />

      {/* Center - Service Details */}
      <View style={styles.contentContainer}>
        <Text style={styles.serviceName} numberOfLines={2}>
          {service.name}
        </Text>

        <Text style={styles.serviceDate} numberOfLines={1}>
          Dec 12, 2017
        </Text>

        <Text style={styles.serviceCode}>
          #SF834N211
        </Text>
      </View>

      {/* Right Side - Arrow Icon */}
      <View style={styles.arrowContainer}>
        <MaterialCommunityIcons
          name="chevron-right"
          size={28}
          color="#999999"
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginVertical: 10,
    marginHorizontal: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F5F5F5",
  },
  serviceImage: {
    width: 90,
    height: 90,
    borderRadius: 12,
    backgroundColor: "#E8E8E8",
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
    justifyContent: "space-between",
  },
  serviceName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 6,
    lineHeight: 18,
  },
  serviceDate: {
    fontSize: 12,
    color: "#999999",
    fontWeight: "500",
    marginBottom: 4,
  },
  serviceCode: {
    fontSize: 12,
    fontWeight: "600",
    color: "#7BC743",
  },
  arrowContainer: {
    paddingLeft: 12,
    justifyContent: "center",
    alignItems: "center",
  },
});