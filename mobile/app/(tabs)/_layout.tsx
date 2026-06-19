import { Tabs } from "expo-router";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { BlurView } from "expo-blur";

function TabIcon({ name, label, focused, color }: { name: any; label: string; focused: boolean; color: string }) {
  return (
    <View style={[styles.tabIcon, focused && { backgroundColor: color + "20" }]}>
      <Feather name={name} size={20} color={focused ? color : "#555"} />
      <Text style={[styles.tabLabel, { color: focused ? color : "#555" }]}>{label}</Text>
    </View>
  );
}

export default function TabsLayout() {
  const { config } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#0a0a0a",
          borderTopColor: "rgba(255,255,255,0.05)",
          height: 70,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarShowLabel: false,
      }}>
      <Tabs.Screen name="index" options={{
        tabBarIcon: ({ focused }) => <TabIcon name="home" label="Home" focused={focused} color={config.primary} />
      }} />
      <Tabs.Screen name="chat" options={{
        tabBarIcon: ({ focused }) => <TabIcon name="message-circle" label="Chat" focused={focused} color={config.primary} />
      }} />
      <Tabs.Screen name="history" options={{
        tabBarIcon: ({ focused }) => <TabIcon name="clock" label="History" focused={focused} color={config.primary} />
      }} />
      <Tabs.Screen name="profile" options={{
        tabBarIcon: ({ focused }) => <TabIcon name="user" label="Profile" focused={focused} color={config.primary} />
      }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIcon: { alignItems: "center", gap: 3, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  tabLabel: { fontSize: 10, fontWeight: "600" }
});
