import { useState, useRef, useEffect, useCallback } from "react";
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { streamChat } from "@/lib/api";
import { streamChat as streamChatFn } from "@/lib/api";
import { Feather } from "@expo/vector-icons";
import Markdown from "react-native-markdown-display";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { v4 as uuidv4 } from "uuid";

const MODELS = [
  { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B" },
  { id: "deepseek-r1-distill-llama-70b", name: "DeepSeek R1" },
  { id: "gemma2-9b-it", name: "Gemma 2 9B" },
  { id: "qwen-qwq-32b", name: "Qwen QwQ 32B" },
  { id: "llama-3.2-11b-vision-preview", name: "Llama Vision" },
];

interface Message { id: string; role: "user" | "assistant"; content: string; }

export default function ChatScreen() {
  const { config } = useTheme();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [chatId, setChatId] = useState<string | undefined>();
  const [model, setModel] = useState(MODELS[0].id);
  const [showModels, setShowModels] = useState(false);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.7
    });
    if (!result.canceled && result.assets[0].base64) {
      const mime = result.assets[0].mimeType || "image/jpeg";
      setAttachedImage(`data:${mime};base64,${result.assets[0].base64}`);
      setModel("llama-3.2-11b-vision-preview");
      Alert.alert("Image Attached", "Ask a question about the image.");
    }
  };

  const send = async () => {
    if ((!input.trim() && !attachedImage) || streaming) return;
    const userContent = input.trim() || "Analyze this image.";
    const userMsg: Message = { id: uuidv4(), role: "user", content: userContent };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    const imgB64 = attachedImage;
    setAttachedImage(null);

    const assistantId = uuidv4();
    setMessages(prev => [...prev, { id: assistantId, role: "assistant", content: "" }]);
    setStreaming(true);

    try {
      await streamChatFn({
        chatId,
        message: userContent,
        model,
        history: messages.slice(-16).map(m => ({ role: m.role, content: m.content })),
        imageBase64: imgB64 || undefined,
        onDelta: (text) => {
          setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: m.content + text } : m));
        },
        onDone: (cId) => setChatId(cId),
        onError: (err) => Alert.alert("Error", err)
      });
    } finally { setStreaming(false); }
  };

  const mkStyles = useCallback(() => ({
    body: { color: "#e5e5e5", fontSize: 14, lineHeight: 22 },
    code_inline: { backgroundColor: "rgba(139,92,246,0.2)", color: "#ddd", paddingHorizontal: 6, borderRadius: 4, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
    fence: { backgroundColor: "#1a1a2e", borderRadius: 8, padding: 12 },
    code_block: { color: "#e5e5e5", fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", fontSize: 12 },
    heading1: { color: "#fff", fontWeight: "700" as const },
    heading2: { color: "#fff", fontWeight: "700" as const },
    strong: { color: "#fff", fontWeight: "700" as const },
    link: { color: config.primary }
  }), [config.primary]);

  const renderMessage = ({ item }: { item: Message }) => (
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
        {item.role === "assistant" && item.content && (
          <TouchableOpacity style={styles.copyBtn}
            onPress={() => Alert.alert("Copied", "Message copied to clipboard")}>
            <Feather name="copy" size={12} color="#555" />
          </TouchableOpacity>
        )}
      </View>
      {item.role === "user" && (
        <View style={[styles.userAvatar, { backgroundColor: config.primary + "30" }]}>
          <Feather name="user" size={14} color={config.primary} />
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={[styles.modelBtn, { borderColor: config.primary + "40" }]}
          onPress={() => setShowModels(!showModels)}>
          <Feather name="cpu" size={14} color={config.primary} />
          <Text style={[styles.modelText, { color: config.primary }]}>{MODELS.find(m => m.id === model)?.name}</Text>
          <Feather name="chevron-down" size={14} color={config.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { setMessages([]); setChatId(undefined); }}
          style={[styles.newBtn, { backgroundColor: config.primary + "20" }]}>
          <Feather name="plus" size={18} color={config.primary} />
        </TouchableOpacity>
      </View>

      {/* Model dropdown */}
      {showModels && (
        <View style={[styles.modelMenu, { borderColor: config.primary + "30" }]}>
          {MODELS.map(m => (
            <TouchableOpacity key={m.id} style={[styles.modelItem, model === m.id && { backgroundColor: config.primary + "15" }]}
              onPress={() => { setModel(m.id); setShowModels(false); }}>
              {model === m.id && <Feather name="check" size={12} color={config.primary} />}
              <Text style={[styles.modelItemText, model === m.id && { color: config.primary }]}>{m.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={m => m.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.msgList}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <View style={[styles.emptyLogo, { shadowColor: config.primary, borderColor: config.primary + "40" }]}>
              <Image source={require("../../assets/logo.jpg")} style={{ width: 60, height: 60 }} contentFit="cover" />
            </View>
            <Text style={[styles.emptyTitle, { color: config.primary }]}>PRAVIX AI</Text>
            <Text style={styles.emptySubtitle}>How can I help you today?</Text>
          </View>
        )}
      />

      {/* Input */}
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {attachedImage && (
          <View style={styles.attachRow}>
            <Image source={{ uri: attachedImage }} style={styles.thumbPreview} contentFit="cover" />
            <Text style={styles.attachName}>Image attached</Text>
            <TouchableOpacity onPress={() => setAttachedImage(null)}>
              <Feather name="x" size={16} color="#555" />
            </TouchableOpacity>
          </View>
        )}
        <View style={[styles.inputBar, { borderColor: config.primary + "30" }]}>
          <TouchableOpacity style={styles.attachBtn} onPress={pickImage}>
            <Feather name="image" size={18} color="#555" />
          </TouchableOpacity>
          <TextInput
            style={styles.textInput}
            placeholder="Message PRAVIX AI..."
            placeholderTextColor="#444"
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={4000}
            onSubmitEditing={send}
          />
          <TouchableOpacity style={[styles.sendBtn, { backgroundColor: config.primary }]}
            onPress={send} disabled={streaming || (!input.trim() && !attachedImage)}>
            {streaming ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="send" size={16} color="#fff" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" },
  modelBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12, borderWidth: 1 },
  modelText: { fontSize: 13, fontWeight: "600" },
  newBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  modelMenu: { position: "absolute", top: 60, left: 16, zIndex: 999, backgroundColor: "#111", borderRadius: 14, borderWidth: 1, padding: 6, minWidth: 200 },
  modelItem: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 },
  modelItemText: { color: "#ccc", fontSize: 13 },
  msgList: { padding: 16, gap: 12, paddingBottom: 8 },
  msgRow: { flexDirection: "row", gap: 8, alignItems: "flex-end" },
  userRow: { justifyContent: "flex-end" },
  aiRow: { justifyContent: "flex-start" },
  aiAvatar: { width: 30, height: 30, borderRadius: 8, overflow: "hidden", flexShrink: 0, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 8, elevation: 5 },
  userAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  bubble: { maxWidth: "82%", borderRadius: 16, padding: 12, borderWidth: 1 },
  userText: { color: "#fff", fontSize: 14, lineHeight: 20 },
  typingDots: { flexDirection: "row", gap: 5, alignItems: "center", height: 20 },
  dot: { width: 7, height: 7, borderRadius: 4, opacity: 0.8 },
  copyBtn: { marginTop: 8 },
  inputBar: { flexDirection: "row", alignItems: "flex-end", margin: 12, borderRadius: 18, borderWidth: 1, backgroundColor: "rgba(255,255,255,0.03)", paddingHorizontal: 8, paddingVertical: 8, gap: 8 },
  attachBtn: { padding: 8 },
  textInput: { flex: 1, color: "#fff", fontSize: 15, maxHeight: 120, paddingTop: 4, paddingBottom: 4 },
  sendBtn: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  attachRow: { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 16, marginBottom: 4, padding: 10, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  thumbPreview: { width: 36, height: 36, borderRadius: 8 },
  attachName: { flex: 1, color: "#ccc", fontSize: 13 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 12 },
  emptyLogo: { width: 72, height: 72, borderRadius: 18, overflow: "hidden", borderWidth: 1, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 16, elevation: 10 },
  emptyTitle: { fontSize: 26, fontWeight: "800", letterSpacing: 1 },
  emptySubtitle: { color: "#555", fontSize: 14 }
});
