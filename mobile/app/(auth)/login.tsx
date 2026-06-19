import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert
} from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from "firebase/auth";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { GoogleAuthProvider, signInWithCredential, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useTheme } from "@/context/ThemeContext";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

WebBrowser.maybeCompleteAuthSession();

const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL || "http://localhost:5000";
type Mode = "main" | "signin" | "signup" | "forgot";

export default function LoginScreen() {
  const router = useRouter();
  const { config } = useTheme();
  const [mode, setMode] = useState<Mode>("main");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const [request, , promptAsync] = Google.useIdTokenAuthRequest({
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
      Alert.alert("Google Sign-In Error", e.message);
    } finally { setLoading(false); }
  };

  const handleSignIn = async () => {
    if (!email || !password) return Alert.alert("Error", "Please fill all fields.");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.replace("/(tabs)");
    } catch (e: any) {
      if (e.code === "auth/invalid-credential") Alert.alert("Error", "Wrong email or password.");
      else Alert.alert("Sign In Error", e.message);
    } finally { setLoading(false); }
  };

  const handleSignUp = async () => {
    if (!email || !password) return Alert.alert("Error", "Please fill all fields.");
    if (password.length < 6) return Alert.alert("Error", "Password must be at least 6 characters.");
    setLoading(true);
    try {
      // 1. Create Firebase account
      await createUserWithEmailAndPassword(auth, email, password);

      // 2. Send OTP via backend (Nodemailer + Gmail - FREE)
      const res = await axios.post(`${BACKEND}/api/otp/send`, { email });
      if (res.data.success) {
        await AsyncStorage.setItem("pravix-verify-email", email);
        Alert.alert("OTP Sent!", "A 6-digit code was sent to your email. Check your inbox.");
        router.push("/(auth)/verify");
      }
    } catch (e: any) {
      if (e.code === "auth/email-already-in-use") Alert.alert("Error", "Email already registered. Please sign in.");
      else if (e.response?.data?.error) Alert.alert("Error", e.response.data.error);
      else Alert.alert("Sign Up Error", e.message);
    } finally { setLoading(false); }
  };

  const handleForgot = async () => {
    if (!email) return Alert.alert("Error", "Enter your email address.");
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert("Sent!", "Password reset email sent. Check your inbox.");
      setMode("signin");
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

          {/* Main */}
          {mode === "main" && (
            <View style={styles.col}>
              <TouchableOpacity style={[styles.googleBtn, { borderColor: config.primary + "40" }]}
                onPress={handleGoogleSignIn} disabled={loading || !request}>
                <Feather name="globe" size={18} color={config.primary} />
                <Text style={[styles.googleText, { color: config.primary }]}>Continue with Google</Text>
              </TouchableOpacity>
              <View style={styles.divider}>
                <View style={styles.divLine} /><Text style={styles.divText}>or</Text><View style={styles.divLine} />
              </View>
              <TouchableOpacity style={[styles.btn, { backgroundColor: config.primary }]} onPress={() => setMode("signin")}>
                <Text style={styles.btnTxt}>Sign In</Text>
                <Feather name="arrow-right" size={16} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.outBtn, { borderColor: config.primary + "50" }]} onPress={() => setMode("signup")}>
                <Text style={[styles.outTxt, { color: config.primary }]}>Create Account</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Sign In */}
          {mode === "signin" && (
            <View style={styles.col}>
              <Text style={styles.modeTitle}>Sign In</Text>
              <View style={[styles.inp, { borderColor: config.primary + "30" }]}>
                <Feather name="mail" size={15} color="#555" style={styles.inpIcon} />
                <TextInput style={styles.inpTxt} placeholder="Email" placeholderTextColor="#555"
                  value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
              </View>
              <View style={[styles.inp, { borderColor: config.primary + "30" }]}>
                <Feather name="lock" size={15} color="#555" style={styles.inpIcon} />
                <TextInput style={[styles.inpTxt, { flex: 1 }]} placeholder="Password" placeholderTextColor="#555"
                  value={password} onChangeText={setPassword} secureTextEntry={!showPass} />
                <TouchableOpacity onPress={() => setShowPass(!showPass)} style={{ paddingHorizontal: 12 }}>
                  <Feather name={showPass ? "eye-off" : "eye"} size={15} color="#555" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={[styles.btn, { backgroundColor: config.primary }]} onPress={handleSignIn} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnTxt}>Sign In</Text>}
              </TouchableOpacity>
              <View style={styles.row}>
                <TouchableOpacity onPress={() => setMode("main")}><Text style={styles.link}>Back</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => setMode("forgot")}><Text style={[styles.link, { color: config.primary }]}>Forgot Password?</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => setMode("signup")}><Text style={[styles.link, { color: config.primary }]}>Sign Up</Text></TouchableOpacity>
              </View>
            </View>
          )}

          {/* Sign Up */}
          {mode === "signup" && (
            <View style={styles.col}>
              <View>
                <Text style={styles.modeTitle}>Create Account</Text>
                <Text style={styles.modeSub}>A 6-digit OTP will be emailed to you</Text>
              </View>
              <View style={[styles.inp, { borderColor: config.primary + "30" }]}>
                <Feather name="user" size={15} color="#555" style={styles.inpIcon} />
                <TextInput style={styles.inpTxt} placeholder="Full Name" placeholderTextColor="#555"
                  value={name} onChangeText={setName} autoCapitalize="words" />
              </View>
              <View style={[styles.inp, { borderColor: config.primary + "30" }]}>
                <Feather name="mail" size={15} color="#555" style={styles.inpIcon} />
                <TextInput style={styles.inpTxt} placeholder="Email address" placeholderTextColor="#555"
                  value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
              </View>
              <View style={[styles.inp, { borderColor: config.primary + "30" }]}>
                <Feather name="lock" size={15} color="#555" style={styles.inpIcon} />
                <TextInput style={[styles.inpTxt, { flex: 1 }]} placeholder="Password (min 6 chars)" placeholderTextColor="#555"
                  value={password} onChangeText={setPassword} secureTextEntry={!showPass} />
                <TouchableOpacity onPress={() => setShowPass(!showPass)} style={{ paddingHorizontal: 12 }}>
                  <Feather name={showPass ? "eye-off" : "eye"} size={15} color="#555" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={[styles.btn, { backgroundColor: config.primary }]} onPress={handleSignUp} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnTxt}>Send OTP & Register</Text>}
              </TouchableOpacity>
              <View style={styles.row}>
                <TouchableOpacity onPress={() => setMode("main")}><Text style={styles.link}>Back</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => setMode("signin")}><Text style={[styles.link, { color: config.primary }]}>Sign In</Text></TouchableOpacity>
              </View>
            </View>
          )}

          {/* Forgot */}
          {mode === "forgot" && (
            <View style={styles.col}>
              <Text style={styles.modeTitle}>Reset Password</Text>
              <View style={[styles.inp, { borderColor: config.primary + "30" }]}>
                <Feather name="mail" size={15} color="#555" style={styles.inpIcon} />
                <TextInput style={styles.inpTxt} placeholder="Your email address" placeholderTextColor="#555"
                  value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
              </View>
              <TouchableOpacity style={[styles.btn, { backgroundColor: config.primary }]} onPress={handleForgot} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnTxt}>Send Reset Email</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setMode("signin")}>
                <Text style={styles.link}>Back to Sign In</Text>
              </TouchableOpacity>
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
  header: { alignItems: "center", marginBottom: 32, gap: 10 },
  logoWrap: { width: 88, height: 88, borderRadius: 20, overflow: "hidden", borderWidth: 1, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 16, elevation: 10 },
  logo: { width: "100%", height: "100%" },
  title: { fontSize: 32, fontWeight: "800", letterSpacing: 2 },
  subtitle: { fontSize: 13, color: "#666" },
  card: { width: "100%", borderRadius: 20, borderWidth: 1, padding: 20, backgroundColor: "rgba(255,255,255,0.03)" },
  col: { gap: 14 },
  modeTitle: { fontSize: 20, fontWeight: "700", color: "#fff" },
  modeSub: { fontSize: 12, color: "#666", marginTop: 2 },
  googleBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 14, borderRadius: 14, borderWidth: 1, backgroundColor: "rgba(255,255,255,0.03)" },
  googleText: { fontSize: 15, fontWeight: "600" },
  divider: { flexDirection: "row", alignItems: "center", gap: 12 },
  divLine: { flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.08)" },
  divText: { color: "#555", fontSize: 13 },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14 },
  btnTxt: { color: "#fff", fontSize: 15, fontWeight: "700" },
  outBtn: { paddingVertical: 14, borderRadius: 14, borderWidth: 1, alignItems: "center" },
  outTxt: { fontSize: 15, fontWeight: "600" },
  inp: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.04)" },
  inpIcon: { paddingLeft: 14 },
  inpTxt: { flex: 1, paddingHorizontal: 12, paddingVertical: 13, color: "#fff", fontSize: 15 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  link: { color: "#666", fontSize: 13 },
  footer: { marginTop: 32, color: "#333", fontSize: 12 }
});
