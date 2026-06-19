import { useState, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Animated } from "react-native";
import { useRouter } from "expo-router";
import { auth } from "@/lib/firebase";
import { sendEmailVerification, reload } from "firebase/auth";
import { useTheme } from "@/context/ThemeContext";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";

export default function VerifyScreen() {
  const router = useRouter();
  const { config } = useTheme();
  const { user } = useAuth();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [verified, setVerified] = useState(false);
  const [checking, setChecking] = useState(false);
  const inputs = useRef<(TextInput | null)[]>([]);
  const scaleAnims = useRef(otp.map(() => new Animated.Value(1))).current;

  const handleChange = (i: number, v: string) => {
    if (!/^[0-9]?$/.test(v)) return;
    const next = [...otp];
    next[i] = v;
    setOtp(next);
    Animated.sequence([
      Animated.timing(scaleAnims[i], { toValue: 1.15, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnims[i], { toValue: 1, duration: 80, useNativeDriver: true })
    ]).start();
    if (v && i < 5) inputs.current[i + 1]?.focus();
  };

  const checkVerification = async () => {
    setChecking(true);
    try {
      if (auth.currentUser) {
        await reload(auth.currentUser);
        if (auth.currentUser.emailVerified) {
          setVerified(true);
          setTimeout(() => router.replace("/(tabs)"), 1500);
        } else {
          Alert.alert("Not Verified", "Please check your email and click the verification link.");
        }
      }
    } finally { setChecking(false); }
  };

  const resend = async () => {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
      Alert.alert("Sent", "Verification email resent!");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: "#000" }]}>
      <View style={styles.header}>
        <Feather name="mail" size={48} color={config.primary} />
        <Text style={[styles.title, { color: "#fff" }]}>Verify Email</Text>
        <Text style={styles.sub}>{user?.email}</Text>
      </View>

      <View style={styles.otpRow}>
        {otp.map((val, i) => (
          <Animated.View key={i} style={{ transform: [{ scale: scaleAnims[i] }] }}>
            <TextInput
              ref={el => { inputs.current[i] = el; }}
              style={[styles.otpBox, {
                borderColor: verified ? "#10B981" : val ? config.primary : "rgba(255,255,255,0.15)",
                backgroundColor: verified ? "rgba(16,185,129,0.1)" : val ? config.primary + "15" : "rgba(255,255,255,0.04)"
              }]}
              value={val}
              onChangeText={v => handleChange(i, v)}
              keyboardType="numeric" maxLength={1}
              textAlign="center"
              selectionColor={config.primary}
            />
          </Animated.View>
        ))}
      </View>

      {verified && (
        <View style={styles.successRow}>
          <Feather name="check-circle" size={24} color="#10B981" />
          <Text style={styles.successText}>Email Verified!</Text>
        </View>
      )}

      <TouchableOpacity style={[styles.btn, { backgroundColor: config.primary }]}
        onPress={checkVerification} disabled={checking || verified}>
        {checking ? (
          <Text style={styles.btnText}>Checking...</Text>
        ) : (
          <Text style={styles.btnText}>Verify Email</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={resend} style={styles.resendBtn}>
        <Text style={[styles.resendText, { color: config.primary }]}>Resend Email</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 24 },
  header: { alignItems: "center", gap: 12 },
  title: { fontSize: 26, fontWeight: "700" },
  sub: { color: "#666", fontSize: 14 },
  otpRow: { flexDirection: "row", gap: 10 },
  otpBox: { width: 46, height: 54, borderRadius: 12, borderWidth: 2, fontSize: 22, fontWeight: "700", color: "#fff" },
  successRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  successText: { color: "#10B981", fontSize: 16, fontWeight: "600" },
  btn: { width: "100%", paddingVertical: 15, borderRadius: 14, alignItems: "center" },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  resendBtn: { marginTop: 8 },
  resendText: { fontSize: 14 }
});
