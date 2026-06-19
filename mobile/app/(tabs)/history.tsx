import { useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, FlatList, TextInput, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import API from "@/lib/api";
import { useTheme } from "@/context/ThemeContext";
import { Feather } from "@expo/vector-icons";

interface Chat { chatId: string; title: string; updatedAt: string; model?: string; }

export default function HistoryScreen() {
  const { config } = useTheme();
  const router = useRouter();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const loadChats = useCallback(async () => {
    try {
      const { data } = await API.get("/api/history");
      setChats(data.chats);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadChats(); }, [loadChats]);

  const deleteChat = async (chatId: string) => {
    Alert.alert("Delete Chat", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        await API.delete(`/api/history/${chatId}`);
        setChats(prev => prev.filter(c => c.chatId !== chatId));
      }}
    ]);
  };

  const renameChat = async (chatId: string) => {
    await API.patch(`/api/history/${chatId}`, { title: editTitle });
    setChats(prev => prev.map(c => c.chatId === chatId ? { ...c, title: editTitle } : c));
    setEditingId(null);
  };

  const filtered = chats.filter(c => c.title.toLowerCase().includes(search.toLowerCase()));

  const grouped = {
    today: filtered.filter(c => new Date(c.updatedAt).toDateString() === new Date().toDateString()),
    yesterday: filtered.filter(c => {
      const d = new Date(c.updatedAt);
      const y = new Date(); y.setDate(y.getDate() - 1);
      return d.toDateString() === y.toDateString();
    }),
    older: filtered.filter(c => {
      const d = new Date(c.updatedAt);
      const y = new Date(); y.setDate(y.getDate() - 1);
      return d < y && d.toDateString() !== y.toDateString();
    })
  };

  const renderGroup = (label: string, items: Chat[]) => {
    if (!items.length) return null;
    return (
      <View key={label}>
        <Text style={styles.groupLabel}>{label}</Text>
        {items.map(chat => (
          <View key={chat.chatId} style={[styles.chatRow, { borderColor: config.primary + "15" }]}>
            {editingId === chat.chatId ? (
              <TextInput style={[styles.renameInput, { borderColor: config.primary, color: "#fff" }]}
                value={editTitle} onChangeText={setEditTitle} autoFocus
                onSubmitEditing={() => renameChat(chat.chatId)}
                onBlur={() => renameChat(chat.chatId)} />
            ) : (
              <TouchableOpacity style={styles.chatTitle} onPress={() => router.push(`/chat/${chat.chatId}`)}>
                <Text style={styles.chatTitleText} numberOfLines={1}>{chat.title}</Text>
                <Text style={styles.chatDate}>{new Date(chat.updatedAt).toLocaleDateString()}</Text>
              </TouchableOpacity>
            )}
            <View style={styles.chatActions}>
              <TouchableOpacity onPress={() => { setEditingId(chat.chatId); setEditTitle(chat.title); }}
                style={styles.actionBtn}>
                <Feather name="edit-2" size={14} color="#555" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deleteChat(chat.chatId)} style={styles.actionBtn}>
                <Feather name="trash-2" size={14} color="#555" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.pageTitle}>History</Text>
        <TouchableOpacity onPress={loadChats}>
          <Feather name="refresh-cw" size={18} color="#555" />
        </TouchableOpacity>
      </View>

      <View style={[styles.searchWrap, { borderColor: config.primary + "30" }]}>
        <Feather name="search" size={15} color="#555" />
        <TextInput style={styles.searchInput} placeholder="Search chats..." placeholderTextColor="#444"
          value={search} onChangeText={setSearch} />
        {search ? <TouchableOpacity onPress={() => setSearch("")}><Feather name="x" size={14} color="#555" /></TouchableOpacity> : null}
      </View>

      {loading ? (
        <ActivityIndicator color={config.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={[]}
          renderItem={() => null}
          ListHeaderComponent={() => (
            <View style={{ gap: 8 }}>
              {renderGroup("Today", grouped.today)}
              {renderGroup("Yesterday", grouped.yesterday)}
              {renderGroup("Older", grouped.older)}
              {!filtered.length && <Text style={styles.emptyText}>No chats found</Text>}
            </View>
          )}
          contentContainerStyle={{ padding: 16 }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16 },
  pageTitle: { fontSize: 22, fontWeight: "700", color: "#fff" },
  searchWrap: { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 16, marginBottom: 12, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 1, backgroundColor: "rgba(255,255,255,0.03)" },
  searchInput: { flex: 1, color: "#fff", fontSize: 14 },
  groupLabel: { color: "#555", fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, marginTop: 8 },
  chatRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1, backgroundColor: "rgba(255,255,255,0.02)", marginBottom: 6 },
  chatTitle: { flex: 1 },
  chatTitleText: { color: "#ddd", fontSize: 14, fontWeight: "500" },
  chatDate: { color: "#555", fontSize: 11, marginTop: 2 },
  chatActions: { flexDirection: "row", gap: 8 },
  actionBtn: { padding: 6 },
  renameInput: { flex: 1, borderBottomWidth: 1, paddingVertical: 2, fontSize: 14 },
  emptyText: { color: "#444", textAlign: "center", marginTop: 40, fontSize: 14 }
});
