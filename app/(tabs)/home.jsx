import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image } from "react-native";
import ServiceCard from "../../components/ServiceCard";
import Header from "../../components/Header";

const services = [
  { id: "1", name: "Boarding", price: 900, image: "https://images.unsplash.com/photo-1558788353-f76d92427f16?w=400&auto=format&fit=crop&q=60&ixlib=rb-4.0.3", description: "Professional pet care service" },
  { id: "2", name: "Day Boarding", price: 600, image: "https://media.istockphoto.com/id/2236481495/photo/dog-riding-in-car-and-looking-out-from-car-window-happy-dog-enjoying-life-dog-adventure.webp?a=1&b=1&s=612x612&w=0&k=20&c=wi86K4KsyGmhC_aVssnENHVHL_I0VC0Aja8UF_tMfls=", description: "Professional pet care service" },
  { id: "10", name: "Oil Massage", price: 250, image: "https://media.istockphoto.com/id/1007122602/photo/woman-giving-body-massage-to-a-dog-spa-still-life-with-aromatic-candles-flowers-and-towel.webp?a=1&b=1&s=612x612&w=0&k=20&c=RpWR3oQwR_VmvZLZKiexYR0aXkWWOgBrM_90gfs7t5A=", description: "Professional pet care service" },
  { id: "4", name: "Day School (26 days)", price: 13650, image: "https://images.unsplash.com/photo-1627323721367-94128c3fa0f7?w=600&auto=format&fit=crop&q=60", description: "Professional pet care service" },
  { id: "5", name: "Play School (26 days)", price: 9650, image: "https://plus.unsplash.com/premium_photo-1679521026509-ecf65d3381f5?w=600&auto=format&fit=crop&q=60", description: "Professional pet care service" },
  { id: "6", name: "Grooming (Small breed)", price: 800, image: "https://plus.unsplash.com/premium_photo-1663012822996-ba7e04f3627a?w=600&auto=format&fit=crop&q=60", description: "Professional pet care service" },
  { id: "7", name: "Grooming (Large breed)", price: 900, image: "https://images.unsplash.com/photo-1576091160550-112173f31446?w=400&auto=format&fit=crop&q=60&ixlib=rb-4.0.3", description: "Professional pet care service" },
  { id: "8", name: "Full Grooming (Small breed)", price: 1500, image: "https://images.unsplash.com/photo-1563037404-161cd9e28b64?w=400&auto=format&fit=crop&q=60&ixlib=rb-4.0.3", description: "Professional pet care service" },
  { id: "9", name: "Full Grooming (Large breed)", price: 1600, image: "https://images.unsplash.com/photo-1634810849571-f83b2b4dbbf7?w=400&auto=format&fit=crop&q=60&ixlib=rb-4.0.3", description: "Professional pet care service" },
  { id: "3", name: "Boarding Wallet (15 days)", price: 11500, image: "https://images.unsplash.com/photo-1601758228598-3c89f1d65d13?w=400&auto=format&fit=crop&q=60&ixlib=rb-4.0.3", description: "Professional pet care service" },
];

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Header />
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Promotional Banner */}
        <View style={styles.bannerContainer}>
          <View style={styles.bannerContent}>
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>LIMITED TIME</Text>
            </View>
            <Text style={styles.bannerDiscount}>15% OFF</Text>
            <Text style={styles.bannerSubtext}>ON GROOMING OR CONSULTATIONS</Text>
            <TouchableOpacity style={styles.bookNowBanner}>
              <Text style={styles.bookNowText}>Book Now</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.bannerImageContainer}>
            <Image
              source={{ uri: "https://images.unsplash.com/photo-1556866261-8763a7662333?w=600&auto=format&fit=crop&q=60" }}
              style={styles.bannerImage}
              resizeMode="cover"
            />
          </View>
        </View>

        {/* Services List - Single Column */}
        <View style={styles.servicesContainer}>
          <Text style={styles.servicesTitle}>Available Services</Text>
          {services.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5EDE0",
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 16,
  },
  bannerContainer: {
    backgroundColor: "#7BC743",
    borderRadius: 12,
    flexDirection: "row",
    overflow: "hidden",
    marginHorizontal: 16,
    marginBottom: 24,
    height: 140,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bannerContent: {
    flex: 1,
    padding: 16,
    justifyContent: "center",
  },
  badgeContainer: {
    backgroundColor: "#FFFFFF",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#7BC743",
    letterSpacing: 0.5,
  },
  bannerDiscount: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FFFFFF",
    lineHeight: 36,
  },
  bannerSubtext: {
    fontSize: 11,
    color: "#FFFFFF",
    fontWeight: "500",
    marginBottom: 8,
  },
  bookNowBanner: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  bookNowText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#7BC743",
  },
  bannerImageContainer: {
    flex: 1,
    backgroundColor: "#E8F5E9",
    overflow: "hidden",
  },
  bannerImage: {
    width: "100%",
    height: "100%",
  },
  servicesContainer: {
    paddingBottom: 20,
  },
  servicesTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
    marginHorizontal: 16,
    marginBottom: 12,
  },
});