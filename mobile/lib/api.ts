import axios from "axios";
import { auth } from "./firebase";

const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL || "http://localhost:5000";

const API = axios.create({ baseURL: BACKEND });

API.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default API;

export async function streamChat(params: {
  chatId?: string;
  message: string;
  model: string;
  history: { role: string; content: string }[];
  imageBase64?: string;
  onDelta: (text: string) => void;
  onDone: (chatId: string) => void;
  onError: (err: string) => void;
}) {
  const token = await auth.currentUser?.getIdToken();
  const response = await fetch(`${BACKEND}/api/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      chatId: params.chatId,
      message: params.message,
      model: params.model,
      history: params.history,
      imageBase64: params.imageBase64
    })
  });
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  if (!reader) return;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value);
    const lines = text.split("\n").filter((l: string) => l.startsWith("data: "));
    for (const line of lines) {
      try {
        const json = JSON.parse(line.slice(6));
        if (json.type === "delta") params.onDelta(json.content);
        if (json.type === "done") params.onDone(json.chatId);
        if (json.type === "error") params.onError(json.error);
      } catch {}
    }
  }
}
