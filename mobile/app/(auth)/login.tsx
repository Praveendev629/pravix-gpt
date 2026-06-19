import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert
} from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useTheme } from "@/context/ThemeContext";
import { Feather } from "@expo/vector-icons";

WebBrowser.maybeCompleteAuthSession();

type Mode = "main" | "signin" | "signup";

export default function LoginScreen() {
  const router = useRouter();
  const { config } = useTheme();
  const [mode, setMode] = useState<Mode>("main");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const result = await promptAsync();
      if (result?.type === "success") {
        const credential = GoogleAuthProvider.credential(result.params.id_token);
        await signInWithCredential(auth, credential);
        router.replace("/(tabs)");
      }
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally { setLoading(false); }
  };

  const handleSignIn = async () => {
    if (!email || !password) return Alert.alert("Error", "Fill all fields");
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      if (!cred.user.emailVerified) {
        Alert.alert("Verify Email", "Please verify your email first.");
        router.push("/(auth)/verify");
        return;
      }
      router.replace("/(tabs)");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally { setLoading(false); }
  };

  const handleSignUp = async () => {
    if (!email || !password) return Alert.alert("Error", "Fill all fields");
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(cred.user);
      Alert.alert("Success", "Verification email sent!");
      router.push("/(auth)/verify");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "#000" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={styles.header}>
          <View style={[styles.logoWrap, { borderColor: config.primary + "50", shadowColor: config.primary }]}>
            <Image source={require("../../assets/logo.jpg")} style={styles.logo} contentFit="cover" />
          </View>
          <Text style={[styles.title, { color: config.primary }]}>PRAVIX AI</Text>
          <Text style={styles.subtitle}>Advanced AI Assistant</Text>
        </View>

        <View style={[styles.card, { borderColor: config.primary + "30" }]}>
          {mode === "main" && (
            <View style={styles.modeContainer}>
              <TouchableOpacity style={[styles.googleBtn, { borderColor: config.primary + "50" }]}
                onPress={handleGoogleSignIn} disabled={loading || !request}>
                <Feather name="globe" size={18} color={config.primary} />
                <Text style={[styles.googleText, { color: config.primary }]}>Continue with Google</Text>
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity style={[styles.btn, { backgroundColor: config.primary }]} onPress={() => setMode("signin")}>
                <Text style={styles.btnText}>Sign In</Text>
                <Feather name="arrow-right" size={16} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.outlineBtn, { borderColor: config.primary + "50" }]} onPress={() => setMode("signup")}>
                <Text style={[styles.outlineBtnText, { color: config.primary }]}>Create Account</Text>
              </TouchableOpacity>
            </View>
          )}

          {(mode === "signin" || mode === "signup") && (
            <View style={styles.modeContainer}>
              <Text style={styles.modeTitle}>{mode === "signin" ? "Sign In" : "Create Account"}</Text>
              {mode === "signup" && (
                <View style={[styles.inputWrap, { borderColor: config.primary + "30" }]}>
                  <Feather name="user" size={16} color="#666" style={styles.inputIcon} />
                  <TextInput style={styles.input} placeholder="Full Name" placeholderTextColor="#555"
                    value={name} onChangeText={setName} autoCapitalize="words" />
                </View>
              )}
              <View style={[styles.inputWrap, { borderColor: config.primary + "30" }]}>
                <Feather name="mail" size={16} color="#666" style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#555"
                  value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
              </View>
              <View style={[styles.inputWrap, { borderColor: config.primary + "30" }]}>
                <Feather name="lock" size={16} color="#666" style={styles.inputIcon} />
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="Password" placeholderTextColor="#555"
                  value={password} onChangeText={setPassword} secureTextEntry={!showPass} />
                <TouchableOpacity onPress={() => setShowPass(!showPass)} style={{ paddingHorizontal: 12 }}>
                  <Feather name={showPass ? "eye-off" : "eye"} size={16} color="#666" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={[styles.btn, { backgroundColor: config.primary }]}
                onPress={mode === "signin" ? handleSignIn : handleSignUp} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <Text style={styles.btnText}>{mode === "signin" ? "Sign In" : "Create Account"}</Text>
                )}
              </TouchableOpacity>

              <View style={styles.switchRow}>
                <TouchableOpacity onPress={() => setMode("main")}>
                  <Text style={styles.switchLink}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setMode(mode === "signin" ? "signup" : "signin")}>
                  <Text style={[styles.switchLink, { color: config.primary }]}>
                    {mode === "signin" ? "Sign Up" : "Sign In"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        <Text style={styles.footer}>Developed By Praveen</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "#000" },
  header: { alignItems: "center", marginBottom: 32, gap: 12 },
  logoWrap: { width: 88, height: 88, borderRadius: 20, overflow: "hidden", borderWidth: 1, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 16, elevation: 10 },
  logo: { width: "100%", height: "100%" },
  title: { fontSize: 32, fontWeight: "800", letterSpacing: 2 },
  subtitle: { fontSize: 13, color: "#666" },
  card: { width: "100%", borderRadius: 20, borderWidth: 1, padding: 20, backgroundColor: "rgba(255,255,255,0.03)" },
  modeContainer: { gap: 14 },
  modeTitle: { fontSize: 20, fontWeight: "700", color: "#fff", marginBottom: 4 },
  googleBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 14, borderRadius: 14, borderWidth: 1, backgroundColor: "rgba(255,255,255,0.03)" },
  googleText: { fontSize: 15, fontWeight: "600" },
  divider: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 4 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.08)" },
  dividerText: { color: "#555", fontSize: 13 },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14 },
  btnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  outlineBtn: { paddingVertical: 14, borderRadius: 14, borderWidth: 1, alignItems: "center" },
  outlineBtnText: { fontSize: 15, fontWeight: "600" },
  inputWrap: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.04)" },
  inputIcon: { paddingLeft: 14 },
  input: { flex: 1, paddingHorizontal: 12, paddingVertical: 13, color: "#fff", fontSize: 15 },
  switchRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  switchLink: { color: "#666", fontSize: 13 },
  footer: { marginTop: 32, color: "#333", fontSize: 12 }
});
