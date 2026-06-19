import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { useTheme, THEMES, ThemeColor } from "@/context/ThemeContext";
import { Feather } from "@expo/vector-icons";

const THEME_OPTIONS: ThemeColor[] = ["purple", "red", "green", "orange", "blue", "cyan"];

export default function ProfileScreen() {
  const { user } = useAuth();
  const { config, theme, setTheme } = useTheme();
  const router = useRouter();

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: async () => {
        await signOut(auth);
        router.replace("/(auth)/login");
      }}
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.pageTitle}>Profile</Text>

        {/* User Card */}
        <View style={[styles.userCard, { borderColor: config.primary + "30" }]}>
          {user?.photoURL ? (
            <Image source={{ uri: user.photoURL }} style={[styles.avatar, { shadowColor: config.primary }]} contentFit="cover" />
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: config.primary + "30", shadowColor: config.primary }]}>
              <Feather name="user" size={36} color={config.primary} />
            </View>
          )}
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{user?.displayName || "User"}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            <View style={[styles.providerBadge, { backgroundColor: config.primary + "20", borderColor: config.primary + "40" }]}>
              <Feather name={user?.providerData[0]?.providerId === "google.com" ? "globe" : "mail"} size={11} color={config.primary} />
              <Text style={[styles.providerText, { color: config.primary }]}>
                {user?.providerData[0]?.providerId === "google.com" ? "Google" : "Email"}
              </Text>
            </View>
          </View>
        </View>

        {/* Theme Picker */}
        <View style={[styles.section, { borderColor: "rgba(255,255,255,0.06)" }]}>
          <View style={styles.sectionHeader}>
            <Feather name="palette" size={16} color={config.primary} />
            <Text style={styles.sectionTitle}>Theme Color</Text>
          </View>
          <View style={styles.themeGrid}>
            {THEME_OPTIONS.map(t => (
              <TouchableOpacity key={t} style={[styles.themeChip,
                theme === t ? { backgroundColor: THEMES[t].primary + "25", borderColor: THEMES[t].primary } : { borderColor: "rgba(255,255,255,0.1)" }
              ]} onPress={() => setTheme(t)}>
                <View style={[styles.themeColorDot, { backgroundColor: THEMES[t].primary }]} />
                <Text style={[styles.themeLabel, theme === t && { color: THEMES[t].primary }]}>{THEMES[t].label}</Text>
                {theme === t && <Feather name="check" size={12} color={THEMES[t].primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Account Info */}
        <View style={[styles.section, { borderColor: "rgba(255,255,255,0.06)" }]}>
          <View style={styles.sectionHeader}>
            <Feather name="info" size={16} color={config.primary} />
            <Text style={styles.sectionTitle}>Account Info</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Name</Text>
            <Text style={styles.infoValue}>{user?.displayName || "—"}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{user?.email}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Provider</Text>
            <Text style={styles.infoValue}>{user?.providerData[0]?.providerId === "google.com" ? "Google" : "Email & Password"}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Verified</Text>
            <Text style={[styles.infoValue, { color: user?.emailVerified ? "#10B981" : "#EF4444" }]}>
              {user?.emailVerified ? "Yes" : "No"}
            </Text>
          </View>
          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.infoLabel}>Member since</Text>
            <Text style={styles.infoValue}>
              {user?.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : "—"}
            </Text>
          </View>
        </View>

        {/* About */}
        <View style={[styles.section, { borderColor: "rgba(255,255,255,0.06)" }]}>
          <View style={styles.sectionHeader}>
            <Feather name="cpu" size={16} color={config.primary} />
            <Text style={styles.sectionTitle}>About PRAVIX AI</Text>
          </View>
          <Text style={styles.aboutText}>
            PRAVIX AI is an advanced AI assistant powered by Groq, featuring streaming responses, image analysis,
            document understanding, multi-model support, and file generation. Developed by Praveen.
          </Text>
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Feather name="log-out" size={18} color="#EF4444" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>Developed By Praveen</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  scroll: { padding: 20, gap: 16 },
  pageTitle: { fontSize: 24, fontWeight: "700", color: "#fff", marginBottom: 4 },
  userCard: { flexDirection: "row", alignItems: "center", gap: 16, padding: 20, borderRadius: 18, borderWidth: 1, backgroundColor: "rgba(255,255,255,0.03)" },
  avatar: { width: 68, height: 68, borderRadius: 34, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 12, elevation: 8 },
  avatarFallback: { width: 68, height: 68, borderRadius: 34, alignItems: "center", justifyContent: "center", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 12, elevation: 8 },
  userDetails: { flex: 1, gap: 4 },
  userName: { fontSize: 18, fontWeight: "700", color: "#fff" },
  userEmail: { fontSize: 13, color: "#666" },
  providerBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, alignSelf: "flex-start" },
  providerText: { fontSize: 11, fontWeight: "600" },
  section: { borderRadius: 16, borderWidth: 1, padding: 16, backgroundColor: "rgba(255,255,255,0.02)", gap: 12 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#fff" },
  themeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  themeChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1.5 },
  themeColorDot: { width: 12, height: 12, borderRadius: 6 },
  themeLabel: { fontSize: 13, color: "#888", fontWeight: "600" },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" },
  infoLabel: { color: "#666", fontSize: 14 },
  infoValue: { color: "#ddd", fontSize: 14, fontWeight: "500", textAlign: "right", flex: 1, marginLeft: 16 },
  aboutText: { color: "#666", fontSize: 13, lineHeight: 20 },
  signOutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 15, borderRadius: 14, borderWidth: 1, borderColor: "rgba(239,68,68,0.3)", backgroundColor: "rgba(239,68,68,0.05)" },
  signOutText: { color: "#EF4444", fontSize: 15, fontWeight: "700" },
  footer: { color: "#333", fontSize: 12, textAlign: "center", marginTop: 8 }
});
