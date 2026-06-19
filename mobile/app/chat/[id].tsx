import { useEffect, useState, useRef, useCallback } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Platform, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import API, { streamChat } from "@/lib/api";
import { useTheme } from "@/context/ThemeContext";
import { Feather } from "@expo/vector-icons";
import Markdown from "react-native-markdown-display";
import { v4 as uuidv4 } from "uuid";

interface Message { id: string; role: "user" | "assistant"; content: string; }

export default function ChatDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { config } = useTheme();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [loading, setLoading] = useState(true);
  const [model, setModel] = useState("llama-3.3-70b-versatile");
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await API.get(`/api/history/${id}/messages`);
        setMessages(data.messages.map((m: any) => ({ id: m._id || uuidv4(), role: m.role, content: m.content })));
      } catch { Alert.alert("Error", "Failed to load messages"); }
      finally { setLoading(false); }
    })();
  }, [id]);

  useEffect(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  const send = async () => {
    if (!input.trim() || streaming) return;
    const userMsg: Message = { id: uuidv4(), role: "user", content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    const assistantId = uuidv4();
    setMessages(prev => [...prev, { id: assistantId, role: "assistant", content: "" }]);
    setStreaming(true);
    try {
      await streamChat({
        chatId: id, message: userMsg.content, model,
        history: messages.slice(-16).map(m => ({ role: m.role, content: m.content })),
        onDelta: (text) => {
          setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: m.content + text } : m));
        },
        onDone: () => {}, onError: (err) => Alert.alert("Error", err)
      });
    } finally { setStreaming(false); }
  };

  const mkStyles = useCallback(() => ({
    body: { color: "#e5e5e5", fontSize: 14, lineHeight: 22 },
    code_inline: { backgroundColor: "rgba(139,92,246,0.2)", color: "#ddd", paddingHorizontal: 6, borderRadius: 4 },
    fence: { backgroundColor: "#1a1a2e", borderRadius: 8, padding: 12 },
    code_block: { color: "#e5e5e5", fontFamily: "monospace", fontSize: 12 },
    heading1: { color: "#fff", fontWeight: "700" as const },
    strong: { color: "#fff", fontWeight: "700" as const },
    link: { color: config.primary }
  }), [config.primary]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Chat</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={config.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={m => m.id}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          renderItem={({ item }) => (
            <View style={[styles.msgRow, item.role === "user" ? styles.userRow : styles.aiRow]}>
              {item.role === "assistant" && (
                <View style={[styles.aiAvatar, { shadowColor: config.primary }]}>
                  <Image source={require("../../assets/logo.jpg")} style={{ width: 28, height: 28 }} contentFit="cover" />
                </View>
              )}
              <View style={[styles.bubble,
                item.role === "user"
                  ? { backgroundColor: config.primary + "25", borderColor: config.primary + "40" }
                  : { backgroundColor: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)" }
              ]}>
                {item.role === "assistant" && item.content === "" && streaming ? (
                  <View style={styles.typingDots}>
                    {[0,1,2].map(i => <View key={i} style={[styles.dot, { backgroundColor: config.primary }]} />)}
                  </View>
                ) : item.role === "assistant" ? (
                  <Markdown style={mkStyles()}>{item.content}</Markdown>
                ) : (
                  <Text style={styles.userText}>{item.content}</Text>
                )}
              </View>
              {item.role === "user" && (
                <View style={[styles.userAvatar, { backgroundColor: config.primary + "30" }]}>
                  <Feather name="user" size={14} color={config.primary} />
                </View>
              )}
            </View>
          )}
        />
      )}

      <View style={[styles.inputBar, { borderColor: config.primary + "30" }]}>
        <TextInput style={styles.textInput} placeholder="Continue the conversation..." placeholderTextColor="#444"
          value={input} onChangeText={setInput} multiline maxLength={4000} />
        <TouchableOpacity style={[styles.sendBtn, { backgroundColor: config.primary }]}
          onPress={send} disabled={streaming || !input.trim()}>
          {streaming ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="send" size={16} color="#fff" />}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: "600", color: "#fff" },
  msgRow: { flexDirection: "row", gap: 8, alignItems: "flex-end" },
  userRow: { justifyContent: "flex-end" },
  aiRow: { justifyContent: "flex-start" },
  aiAvatar: { width: 30, height: 30, borderRadius: 8, overflow: "hidden", flexShrink: 0, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 8, elevation: 5 },
  userAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  bubble: { maxWidth: "82%", borderRadius: 16, padding: 12, borderWidth: 1 },
  userText: { color: "#fff", fontSize: 14, lineHeight: 20 },
  typingDots: { flexDirection: "row", gap: 5, alignItems: "center", height: 20 },
  dot: { width: 7, height: 7, borderRadius: 4, opacity: 0.8 },
  inputBar: { flexDirection: "row", alignItems: "flex-end", margin: 12, borderRadius: 18, borderWidth: 1, backgroundColor: "rgba(255,255,255,0.03)", paddingHorizontal: 8, paddingVertical: 8, gap: 8 },
  textInput: { flex: 1, color: "#fff", fontSize: 15, maxHeight: 100, paddingTop: 4, paddingBottom: 4 },
  sendBtn: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" }
});
