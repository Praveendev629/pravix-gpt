import { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';

const API = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';

export default function ChatScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [chatId, setChatId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const flatRef = useRef<FlatList>(null);

  useEffect(() => {
    (async () => {
      const u = await AsyncStorage.getItem('pravix_user');
      const t = await AsyncStorage.getItem('pravix_token');
      if (!t) { router.replace('/auth/login'); return; }
      if (u) setUser(JSON.parse(u));
    })();
  }, []);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const text = input.trim();
    setInput('');
    setLoading(true);
    const token = await AsyncStorage.getItem('pravix_token');
    const headers = { Authorization: `Bearer ${token}` };

    const userMsg = { id: Date.now(), role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);

    try {
      let cId = chatId;
      if (!cId) {
        const { data } = await axios.post(`${API}/api/chat`, { title: text.slice(0, 60) }, { headers });
        cId = data._id;
        setChatId(cId);
      }

      // Streaming via fetch
      const resp = await fetch(`${API}/api/chat/${cId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: text }),
      });

      const reader = resp.body?.getReader();
      const decoder = new TextDecoder();
      const aiMsgId = Date.now() + 1;
      setMessages(prev => [...prev, { id: aiMsgId, role: 'assistant', content: '' }]);
      let full = '';

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        decoder.decode(value).split('\n').forEach(line => {
          if (line.startsWith('data: ')) {
            try {
              const p = JSON.parse(line.slice(6));
              if (p.delta) { full += p.delta; setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, content: full } : m)); }
            } catch { }
          }
        });
      }
    } catch { setMessages(prev => [...prev, { id: Date.now(), role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }]); }
    finally { setLoading(false); }
  };

  const renderMessage = ({ item }: { item: any }) => (
    <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.aiBubble]}>
      {item.role === 'assistant' && (
        <View style={styles.aiAvatar}><Text style={styles.aiAvatarText}>P</Text></View>
      )}
      <View style={[styles.bubbleContent, item.role === 'user' && styles.userContent]}>
        <Text style={styles.msgText}>{item.content}</Text>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoSmall}><Text style={styles.logoSmallText}>P</Text></View>
        <Text style={styles.headerTitle}>Pravix GPT</Text>
        <TouchableOpacity onPress={async () => { await AsyncStorage.clear(); router.replace('/auth/login'); }}>
          <Ionicons name="log-out-outline" size={22} color="rgba(255,255,255,0.4)"/>
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={item => item.id.toString()}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}><Text style={{ fontSize: 28 }}>⚡</Text></View>
            <Text style={styles.emptyTitle}>How can I help you?</Text>
            <Text style={styles.emptySub}>Ask me anything — code, analysis, writing...</Text>
          </View>
        )}
      />

      {/* Input */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Ask Pravix AI anything..."
          placeholderTextColor="rgba(255,255,255,0.3)"
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={2000}
        />
        <TouchableOpacity style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]} onPress={sendMessage} disabled={!input.trim() || loading}>
          {loading ? <ActivityIndicator color="#fff" size="small"/> : <Ionicons name="send" size={18} color="#fff"/>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)', paddingTop: 52 },
  logoSmall: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center' },
  logoSmallText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  headerTitle: { flex: 1, color: '#A78BFA', fontWeight: '800', fontSize: 17 },
  messageList: { padding: 16, gap: 12 },
  bubble: { flexDirection: 'row', gap: 10, maxWidth: '90%' },
  userBubble: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  aiBubble: { alignSelf: 'flex-start' },
  aiAvatar: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 },
  aiAvatarText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  bubbleContent: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', flex: 1 },
  userContent: { backgroundColor: 'rgba(124,58,237,0.7)', borderColor: 'transparent' },
  msgText: { color: '#fff', fontSize: 14, lineHeight: 20 },
  inputRow: { flexDirection: 'row', gap: 10, padding: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', alignItems: 'flex-end' },
  input: { flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: 12, color: '#fff', fontSize: 14, maxHeight: 100, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  sendBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.5 },
  emptyState: { alignItems: 'center', gap: 12, paddingTop: 80 },
  emptyIcon: { width: 64, height: 64, borderRadius: 20, backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#A78BFA' },
  emptySub: { fontSize: 13, color: 'rgba(255,255,255,0.4)', textAlign: 'center' },
});
