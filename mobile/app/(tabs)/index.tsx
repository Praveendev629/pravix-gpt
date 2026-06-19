import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

const QUICK_PROMPTS = [
  { icon: "code", text: "Write a Python function" },
  { icon: "image", text: "Analyze an image" },
  { icon: "file-text", text: "Summarize a document" },
  { icon: "zap", text: "Explain a concept" },
];

export default function HomeScreen() {
  const { user } = useAuth();
  const { config } = useTheme();
  const router = useRouter();
  const firstName = user?.displayName?.split(" ")[0] || "User";

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.userInfo}>
            {user?.photoURL ? (
              <Image source={{ uri: user.photoURL }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: config.primary + "30" }]}>
                <Feather name="user" size={22} color={config.primary} />
              </View>
            )}
            <View>
              <Text style={styles.greeting}>Welcome back,</Text>
              <Text style={[styles.name, { color: config.primary }]}>{firstName}</Text>
            </View>
          </View>
          <View style={[styles.logoBadge, { borderColor: config.primary + "40" }]}>
            <Image source={require("../../assets/logo.jpg")} style={styles.logoSmall} contentFit="cover" />
          </View>
        </View>

        {/* Email */}
        <Text style={styles.emailText}>{user?.email}</Text>

        {/* New Chat CTA */}
        <TouchableOpacity style={[styles.newChatBtn, { backgroundColor: config.primary }]}
          onPress={() => router.push("/(tabs)/chat")}>
          <Feather name="plus" size={20} color="#fff" />
          <Text style={styles.newChatText}>Start New Chat</Text>
        </TouchableOpacity>

        {/* Quick Prompts */}
        <Text style={styles.sectionTitle}>Quick Start</Text>
        <View style={styles.quickGrid}>
          {QUICK_PROMPTS.map((p, i) => (
            <TouchableOpacity key={i}
              style={[styles.quickCard, { borderColor: config.primary + "25" }]}
              onPress={() => router.push("/(tabs)/chat")}>
              <Feather name={p.icon as any} size={22} color={config.primary} />
              <Text style={styles.quickText}>{p.text}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Info */}
        <View style={[styles.infoCard, { borderColor: config.primary + "20" }]}>
          <Feather name="info" size={16} color={config.primary} />
          <Text style={styles.infoText}>PRAVIX AI supports streaming responses, image analysis, document understanding, and file generation.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  scroll: { padding: 20, gap: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  userInfo: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarPlaceholder: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  greeting: { fontSize: 13, color: "#666" },
  name: { fontSize: 20, fontWeight: "700" },
  logoBadge: { width: 40, height: 40, borderRadius: 10, overflow: "hidden", borderWidth: 1 },
  logoSmall: { width: "100%", height: "100%" },
  emailText: { color: "#555", fontSize: 13, marginTop: -8 },
  newChatBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16, borderRadius: 16 },
  newChatText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  sectionTitle: { color: "#fff", fontSize: 16, fontWeight: "700", marginTop: 8 },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  quickCard: { width: "47%", padding: 16, borderRadius: 14, borderWidth: 1, backgroundColor: "rgba(255,255,255,0.03)", gap: 10 },
  quickText: { color: "#ccc", fontSize: 13 },
  infoCard: { flexDirection: "row", gap: 10, padding: 14, borderRadius: 14, borderWidth: 1, backgroundColor: "rgba(255,255,255,0.02)" },
  infoText: { flex: 1, color: "#666", fontSize: 13, lineHeight: 20 }
});
