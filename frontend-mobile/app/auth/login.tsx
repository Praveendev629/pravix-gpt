import { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithCredential, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import axios from 'axios';

const API = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};
const fbApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(fbApp);

export default function LoginScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [loading, setLoading] = useState(false);

  const handleEmailLogin = async () => {
    if (!email || !password) { Alert.alert('Error', 'Please enter email and password'); return; }
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/api/auth/login`, { email, password });
      await AsyncStorage.setItem('pravix_token', data.token);
      await AsyncStorage.setItem('pravix_user', JSON.stringify(data.user));
      router.replace('/chat');
    } catch (e: any) { Alert.alert('Error', e.response?.data?.error || 'Login failed'); }
    finally { setLoading(false); }
  };

  const handleSendOTP = async () => {
    if (!phone) { Alert.alert('Error', 'Enter phone number'); return; }
    setLoading(true);
    try {
      // Phone auth needs firebase auth flow
      Alert.alert('OTP', `OTP will be sent to ${countryCode}${phone}. Use the web app for full phone auth or integrate @firebase/auth properly with Expo.`);
      // In production: use expo-firebase-recaptcha or similar
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {/* Logo */}
      <View style={styles.logoBox}><Text style={styles.logoText}>P</Text></View>
      <Text style={styles.brand}>Pravix GPT</Text>
      <Text style={styles.sub}>Sign in to continue</Text>

      {/* Tab */}
      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tab, tab === 'email' && styles.tabActive]} onPress={() => setTab('email')}>
          <Text style={[styles.tabText, tab === 'email' && styles.tabTextActive]}>Email</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'phone' && styles.tabActive]} onPress={() => setTab('phone')}>
          <Text style={[styles.tabText, tab === 'phone' && styles.tabTextActive]}>Phone</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        {tab === 'email' ? (
          <>
            <TextInput style={styles.input} placeholder="Email" placeholderTextColor="rgba(255,255,255,0.3)" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none"/>
            <TextInput style={styles.input} placeholder="Password" placeholderTextColor="rgba(255,255,255,0.3)" value={password} onChangeText={setPassword} secureTextEntry/>
            <TouchableOpacity style={styles.btn} onPress={handleEmailLogin} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff"/> : <Text style={styles.btnText}>Sign In</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.phoneRow}>
              <TextInput style={[styles.input, { width: 80 }]} value={countryCode} onChangeText={setCountryCode} placeholder="+91" placeholderTextColor="rgba(255,255,255,0.3)"/>
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="Phone number" placeholderTextColor="rgba(255,255,255,0.3)" value={phone} onChangeText={setPhone} keyboardType="phone-pad"/>
            </View>
            <TouchableOpacity style={styles.btn} onPress={handleSendOTP} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff"/> : <Text style={styles.btnText}>Send OTP</Text>}
            </TouchableOpacity>
          </>
        )}
      </View>

      <Text style={styles.watermark}>developed by praveen</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  logoBox: { width: 64, height: 64, borderRadius: 20, backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 28, fontWeight: '900', color: '#fff' },
  brand: { fontSize: 28, fontWeight: '900', color: '#A78BFA' },
  sub: { fontSize: 13, color: 'rgba(255,255,255,0.4)' },
  tabRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 4, width: '100%' },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: '#7C3AED' },
  tabText: { color: 'rgba(255,255,255,0.4)', fontWeight: '600', fontSize: 14 },
  tabTextActive: { color: '#fff' },
  card: { width: '100%', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 20, padding: 20, gap: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  input: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 14, color: '#fff', fontSize: 14, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)' },
  phoneRow: { flexDirection: 'row', gap: 8 },
  btn: { backgroundColor: '#7C3AED', borderRadius: 12, padding: 15, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  watermark: { fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 16 },
});
