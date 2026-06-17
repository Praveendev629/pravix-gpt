import { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function OTPScreen() {
  const router = useRouter();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState('');
  const inputs = useRef<(TextInput | null)[]>([]);
  const shakes = useRef(otp.map(() => new Animated.Value(0))).current;
  const scales = useRef(otp.map(() => new Animated.Value(1))).current;

  const handleChange = (text: string, idx: number) => {
    if (!/^\d*$/.test(text)) return;
    const newOtp = [...otp];
    newOtp[idx] = text.slice(-1);
    setOtp(newOtp);
    if (text && idx < 5) inputs.current[idx + 1]?.focus();
    if (newOtp.every(d => d)) verifyOTP(newOtp.join(''));
  };

  const verifyOTP = async (code: string) => {
    // In production: call firebase confirmation.confirm(code)
    if (code === '123456') { // demo fallback
      setVerified(true);
      otp.forEach((_, i) => {
        setTimeout(() => Animated.spring(scales[i], { toValue: 1.15, useNativeDriver: true, friction: 5 }).start(() =>
          Animated.spring(scales[i], { toValue: 1, useNativeDriver: true }).start()), i * 80);
      });
      setTimeout(() => router.push('/auth/username'), 1400);
    } else {
      setError('Invalid OTP');
      setOtp(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.icon, verified && styles.iconVerified]}>
        <Ionicons name={verified ? 'checkmark-circle' : 'shield-checkmark'} size={36} color="#fff"/>
      </View>
      <Text style={styles.title}>{verified ? 'Verified!' : 'Enter OTP'}</Text>
      <Text style={styles.sub}>{verified ? 'Phone verified successfully' : 'Enter the 6-digit OTP sent to your phone'}</Text>

      <View style={styles.otpRow}>
        {otp.map((digit, i) => (
          <Animated.View key={i} style={{ transform: [{ scale: scales[i] }] }}>
            <TextInput
              ref={el => { inputs.current[i] = el; }}
              style={[styles.otpBox, digit && styles.otpBoxFilled, verified && styles.otpBoxVerified]}
              value={verified ? '' : digit}
              onChangeText={t => handleChange(t, i)}
              keyboardType="number-pad"
              maxLength={1}
              editable={!verified}
            />
            {verified && <Ionicons name="checkmark" size={20} color="#22c55e" style={styles.tick}/>}
          </Animated.View>
        ))}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={styles.btn} onPress={() => {
        const code = otp.join('');
        if (code.length === 6) verifyOTP(code);
      }}>
        <Text style={styles.btnText}>Verify OTP</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.resend}>Resend OTP</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  icon: { width: 72, height: 72, borderRadius: 22, backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center' },
  iconVerified: { backgroundColor: '#22c55e' },
  title: { fontSize: 24, fontWeight: '800', color: '#fff' },
  sub: { fontSize: 13, color: 'rgba(255,255,255,0.4)', textAlign: 'center' },
  otpRow: { flexDirection: 'row', gap: 10, marginVertical: 16 },
  otpBox: { width: 48, height: 56, borderRadius: 12, borderWidth: 2, borderColor: 'rgba(124,58,237,0.5)', backgroundColor: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 22, fontWeight: '700', textAlign: 'center' },
  otpBoxFilled: { borderColor: '#A78BFA', backgroundColor: 'rgba(124,58,237,0.15)' },
  otpBoxVerified: { borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.12)', color: 'transparent' },
  tick: { position: 'absolute', top: '50%', left: '50%', marginTop: -10, marginLeft: -10 },
  error: { color: '#EF4444', fontSize: 13 },
  btn: { backgroundColor: '#7C3AED', borderRadius: 14, paddingVertical: 15, paddingHorizontal: 40 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  resend: { color: '#A78BFA', fontSize: 13, marginTop: 8 },
});
