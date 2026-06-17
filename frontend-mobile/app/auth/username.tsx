import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';

export default function UsernameScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!username.trim() || username.trim().length < 2) { Alert.alert('Error', 'Username must be at least 2 characters'); return; }
    setLoading(true);
    try {
      const firebaseToken = await AsyncStorage.getItem('pravix_firebase_token');
      if (!firebaseToken) { router.replace('/auth/login'); return; }
      const { data } = await axios.post(`${API}/api/auth/firebase`, { idToken: firebaseToken, chatUsername: username.trim() });
      await AsyncStorage.setItem('pravix_token', data.token);
      await AsyncStorage.setItem('pravix_user', JSON.stringify(data.user));
      // chatUsername stays in memory / session only
      await AsyncStorage.removeItem('pravix_firebase_token');
      router.replace('/chat');
    } catch (e: any) { Alert.alert('Error', e.response?.data?.error || 'Something went wrong'); }
    finally { setLoading(false); }
  };

  return (
    <View style={styles.container}>
      <View style={styles.icon}><Text style={styles.iconText}>👤</Text></View>
      <Text style={styles.title}>Set Your Name</Text>
      <Text style={styles.sub}>Choose a display name for chatting</Text>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>This name is only used during your current session and is not stored in our database.</Text>
      </View>

      <TextInput
        style={styles.input}
        placeholder="e.g. Alex, Dev123..."
        placeholderTextColor="rgba(255,255,255,0.3)"
        value={username}
        onChangeText={setUsername}
        maxLength={30}
        autoFocus
      />

      <TouchableOpacity style={[styles.btn, (!username.trim() || loading) && styles.btnDisabled]} onPress={handleContinue} disabled={!username.trim() || loading}>
        {loading ? <ActivityIndicator color="#fff"/> : <Text style={styles.btnText}>Continue to Pravix GPT</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  icon: { width: 72, height: 72, borderRadius: 22, backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center' },
  iconText: { fontSize: 32 },
  title: { fontSize: 24, fontWeight: '800', color: '#fff' },
  sub: { fontSize: 13, color: 'rgba(255,255,255,0.4)' },
  infoBox: { backgroundColor: 'rgba(124,58,237,0.1)', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(124,58,237,0.3)', width: '100%' },
  infoText: { color: 'rgba(255,255,255,0.55)', fontSize: 12, lineHeight: 18 },
  input: { width: '100%', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 14, color: '#fff', fontSize: 15, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)' },
  btn: { backgroundColor: '#7C3AED', borderRadius: 14, paddingVertical: 15, paddingHorizontal: 32, width: '100%', alignItems: 'center' },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
