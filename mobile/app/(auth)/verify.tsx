import { useState, useRef, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, Animated, ActivityIndicator
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "@/context/ThemeContext";
import { Feather } from "@expo/vector-icons";
import axios from "axios";

const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL || "http://localhost:5000";

export default function VerifyScreen() {
  const router = useRouter();
  const { config } = useTheme();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [email, setEmail] = useState("");
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [wrongOtp, setWrongOtp] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const inputs = useRef<(TextInput | null)[]>([]);
  const scaleAnims = useRef(Array(6).fill(null).map(() => new Animated.Value(1))).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    AsyncStorage.getItem("pravix-verify-email").then(e => {
      if (!e) { router.replace("/(auth)/login"); return; }
      setEmail(e);
    });
    const timer = setInterval(() => {
      setCountdown(p => { if (p <= 1) { clearInterval(timer); return 0; } return p - 1; });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const animateBox = (i: number) => {
    Animated.sequence([
      Animated.timing(scaleAnims[i], { toValue: 1.18, duration: 70, useNativeDriver: true }),
      Animated.timing(scaleAnims[i], { toValue: 1, duration: 70, useNativeDriver: true })
    ]).start();
  };

  const shakeBoxes = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleChange = (i: number, v: string) => {
    if (!/^[0-9]?$/.test(v)) return;
    setWrongOtp(false);
    const next = [...otp];
    next[i] = v;
    setOtp(next);
    animateBox(i);
    if (v && i < 5) inputs.current[i + 1]?.focus();
    if (v && i === 5 && next.every(d => d !== "")) {
      handleVerify(next.join(""));
    }
  };

  const handleVerify = async (code?: string) => {
    const otpStr = code || otp.join("");
    if (otpStr.length !== 6) { Alert.alert("Error", "Enter all 6 digits."); return; }
    setLoading(true);
    try {
      const res = await axios.post(`${BACKEND}/api/otp/verify`, { email, otp: otpStr });
      if (res.data.success) {
        setVerified(true);
        // Animate all green
        scaleAnims.forEach((anim, i) => {
          Animated.sequence([
            Animated.delay(i * 80),
            Animated.spring(anim, { toValue: 1.2, friction: 4, useNativeDriver: true }),
            Animated.spring(anim, { toValue: 1, friction: 4, useNativeDriver: true })
          ]).start();
        });
        setTimeout(async () => {
          await AsyncStorage.removeItem("pravix-verify-email");
          router.replace("/(tabs)");
        }, 2000);
      }
    } catch (e: any) {
      setWrongOtp(true);
      shakeBoxes();
      const msg = e.response?.data?.error || "Incorrect OTP. Try again.";
      Alert.alert("Verification Failed", msg);
      setTimeout(() => { setOtp(["", "", "", "", "", ""]); inputs.current[0]?.focus(); }, 500);
    } finally { setLoading(false); }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setResending(true);
    try {
      await axios.post(`${BACKEND}/api/otp/send`, { email });
      setOtp(["", "", "", "", "", ""]);
      setCountdown(60);
      inputs.current[0]?.focus();
      Alert.alert("Sent!", "New OTP sent to your email.");
      const timer = setInterval(() => {
        setCountdown(p => { if (p <= 1) { clearInterval(timer); return 0; } return p - 1; });
      }, 1000);
    } catch (e: any) {
      Alert.alert("Error", e.response?.data?.error || "Failed to resend OTP");
    } finally { setResending(false); }
  };

  const getBoxStyle = (i: number) => {
    if (verified) return { borderColor: "#10B981", backgroundColor: "rgba(16,185,129,0.15)" };
    if (wrongOtp && otp[i]) return { borderColor: "#EF4444", backgroundColor: "rgba(239,68,68,0.1)" };
    if (otp[i]) return { borderColor: config.primary, backgroundColor: config.primary + "15" };
    return { borderColor: "rgba(255,255,255,0.12)", backgroundColor: "rgba(255,255,255,0.04)" };
  };

  return (
    <View style={[styles.container, { backgroundColor: "#000" }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Feather name="mail" size={40} color={config.primary} />
          <Text style={[styles.title, { color: "#fff" }]}>Verify Email</Text>
          <Text style={styles.emailTxt}>{email}</Text>
          <Text style={styles.subTxt}>Enter the 6-digit OTP sent to your email</Text>
        </View>
      </View>

      {/* OTP Boxes */}
      <Animated.View style={[styles.otpRow, { transform: [{ translateX: shakeAnim }] }]}>
        {otp.map((val, i) => (
          <Animated.View key={i} style={{ transform: [{ scale: scaleAnims[i] }] }}>
            <TextInput
              ref={el => { inputs.current[i] = el; }}
              style={[styles.otpBox, getBoxStyle(i),
                { color: verified ? "#10B981" : wrongOtp && val ? "#EF4444" : "#fff" }
              ]}
              value={val}
              onChangeText={v => handleChange(i, v)}
              keyboardType="numeric"
              maxLength={1}
              textAlign="center"
              selectionColor={config.primary}
              editable={!verified}
            />
          </Animated.View>
        ))}
      </Animated.View>

      {/* Success state */}
      {verified && (
        <View style={styles.successRow}>
          <Feather name="check-circle" size={28} color="#10B981" />
          <Text style={styles.successTxt}>Email Verified! Redirecting...</Text>
        </View>
      )}

      {/* Verify button */}
      {!verified && (
        <TouchableOpacity
          style={[styles.verifyBtn, { backgroundColor: config.primary, opacity: otp.some(v => !v) ? 0.4 : 1 }]}
          onPress={() => handleVerify()} disabled={loading || otp.some(v => !v)}>
          {loading ? <ActivityIndicator color="#fff" /> : (
            <Text style={styles.verifyTxt}>Verify OTP</Text>
          )}
        </TouchableOpacity>
      )}

      {/* Resend */}
      {!verified && (
        <TouchableOpacity onPress={handleResend} disabled={countdown > 0 || resending} style={styles.resendRow}>
          {resending ? <ActivityIndicator size="small" color={config.primary} /> : <Feather name="refresh-cw" size={14} color={countdown > 0 ? "#444" : config.primary} />}
          <Text style={[styles.resendTxt, { color: countdown > 0 ? "#444" : config.primary }]}>
            {countdown > 0 ? `Resend in ${countdown}s` : "Resend OTP"}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 28 },
  header: { alignItems: "center", width: "100%" },
  backBtn: { position: "absolute", left: 0, top: 0, padding: 4 },
  headerCenter: { alignItems: "center", gap: 8 },
  title: { fontSize: 26, fontWeight: "700", marginTop: 4 },
  emailTxt: { color: "#666", fontSize: 14 },
  subTxt: { color: "#555", fontSize: 13, textAlign: "center" },
  otpRow: { flexDirection: "row", gap: 10 },
  otpBox: { width: 48, height: 58, borderRadius: 14, borderWidth: 2, fontSize: 24, fontWeight: "800" },
  successRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  successTxt: { color: "#10B981", fontSize: 16, fontWeight: "700" },
  verifyBtn: { width: "100%", paddingVertical: 15, borderRadius: 14, alignItems: "center" },
  verifyTxt: { color: "#fff", fontSize: 16, fontWeight: "700" },
  resendRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  resendTxt: { fontSize: 14, fontWeight: "500" }
});
