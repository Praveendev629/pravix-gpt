import { useEffect } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";

export default function SplashPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { config } = useTheme();
  const opacity = new Animated.Value(0);
  const scale = new Animated.Value(0.7);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: true })
    ]).start();
  }, []);

  useEffect(() => {
    if (!loading) {
      setTimeout(() => {
        router.replace(user ? "/(tabs)" : "/(auth)/login");
      }, 1800);
    }
  }, [user, loading]);

  return (
    <View style={styles.container}>
      <View style={[styles.bgGrad, { backgroundColor: "#000" }]} />
      <Animated.View style={[styles.content, { opacity, transform: [{ scale }] }]}>
        <View style={[styles.logoContainer, { shadowColor: config.primary, borderColor: config.primary + "40" }]}>
          <Image source={require("../assets/logo.jpg")} style={styles.logo} contentFit="cover" />
        </View>
        <Text style={[styles.title, { color: config.primary }]}>PRAVIX AI</Text>
        <Text style={styles.sub}>Advanced AI Assistant</Text>
        <View style={styles.dots}>
          {[0, 1, 2].map(i => (
            <View key={i} style={[styles.dot, { backgroundColor: config.primary }]} />
          ))}
        </View>
      </Animated.View>
      <Text style={styles.watermark}>Developed By Praveen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center" },
  bgGrad: { ...StyleSheet.absoluteFillObject },
  content: { alignItems: "center", gap: 16 },
  logoContainer: {
    width: 100, height: 100, borderRadius: 24, overflow: "hidden",
    borderWidth: 1, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 20, elevation: 10
  },
  logo: { width: "100%", height: "100%" },
  title: { fontSize: 36, fontWeight: "800", letterSpacing: 2 },
  sub: { fontSize: 14, color: "#666" },
  dots: { flexDirection: "row", gap: 8, marginTop: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, opacity: 0.8 },
  watermark: { position: "absolute", bottom: 32, fontSize: 12, color: "#333" }
});
