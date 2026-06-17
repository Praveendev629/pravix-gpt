import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

export default function SplashScreen() {
  const router = useRouter();
  const progress = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(progress, { toValue: 1, duration: 2200, useNativeDriver: false }),
    ]).start(async () => {
      const token = await AsyncStorage.getItem('pravix_token');
      router.replace(token ? '/chat' : '/auth/login');
    });
  }, []);

  const barWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity }]}>
        {/* Logo */}
        <View style={styles.logoBox}>
          <Text style={styles.logoText}>P</Text>
        </View>
        <Text style={styles.brand}>Pravix GPT</Text>
        <Text style={styles.sub}>Advanced AI Platform</Text>

        {/* Progress bar */}
        <View style={styles.barTrack}>
          <Animated.View style={[styles.barFill, { width: barWidth }]}/>
        </View>
      </Animated.View>

      {/* Watermark */}
      <Text style={styles.watermark}>developed by praveen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  content: { alignItems: 'center', gap: 16 },
  logoBox: { width: 80, height: 80, borderRadius: 24, backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center', marginBottom: 8, shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 20, elevation: 10 },
  logoText: { fontSize: 36, fontWeight: '900', color: '#fff' },
  brand: { fontSize: 36, fontWeight: '900', color: '#A78BFA' },
  sub: { fontSize: 12, color: 'rgba(255,255,255,0.3)', letterSpacing: 3, textTransform: 'uppercase' },
  barTrack: { width: 200, height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden', marginTop: 24 },
  barFill: { height: '100%', borderRadius: 4, backgroundColor: '#7C3AED' },
  watermark: { position: 'absolute', bottom: 24, fontSize: 11, color: 'rgba(255,255,255,0.2)', letterSpacing: 1 },
});
