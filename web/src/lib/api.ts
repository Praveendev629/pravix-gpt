import axios from "axios";
import { auth } from "./firebase";

const API = axios.create({ baseURL: process.env.NEXT_PUBLIC_BACKEND_URL });

API.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default API;

export async function getHistory() {
  const { data } = await API.get("/api/history");
  return data.chats;
}

export async function getMessages(chatId: string) {
  const { data } = await API.get(`/api/history/${chatId}/messages`);
  return data.messages;
}

export async function deleteChat(chatId: string) {
  await API.delete(`/api/history/${chatId}`);
}

export async function renameChat(chatId: string, title: string) {
  await API.patch(`/api/history/${chatId}`, { title });
}

export async function analyzeFile(file: File, question: string) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("question", question);
  const { data } = await API.post("/api/upload/analyze", formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return data;
}

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
  const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/chat/stream`, {
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
    const lines = text.split("\n").filter(l => l.startsWith("data: "));
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
