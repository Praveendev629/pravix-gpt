import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
export default function NotFound() {
  const router = useRouter();
  return (
    <View style={{ flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center", gap: 16 }}>
      <Text style={{ color: "#fff", fontSize: 18 }}>Page Not Found</Text>
      <TouchableOpacity onPress={() => router.replace("/(tabs)")} style={{ backgroundColor: "#8B5CF6", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 }}>
        <Text style={{ color: "#fff" }}>Go Home</Text>
      </TouchableOpacity>
    </View>
  );
}
