import axios from "axios";
import { auth } from "./firebase";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

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

export interface AIModel { id: string; name: string; vision: boolean; }

export async function getModels(): Promise<AIModel[]> {
  try {
    const { data } = await API.get("/api/chat/models");
    return data.models || [];
  } catch {
    // Fallback free models if backend unreachable
    return [
      { id: "llama-3.1-8b-instant",          name: "Llama 3.1 8B (Fast - Free)",     vision: false },
      { id: "llama-3.3-70b-versatile",        name: "Llama 3.3 70B (Best - Free)",    vision: false },
      { id: "gemma2-9b-it",                   name: "Gemma 2 9B (Google - Free)",     vision: false },
      { id: "mixtral-8x7b-32768",             name: "Mixtral 8x7B (Long ctx - Free)", vision: false },
      { id: "deepseek-r1-distill-llama-70b",  name: "DeepSeek R1 (Reasoning - Free)", vision: false },
      { id: "llama-3.2-11b-vision-preview",   name: "Llama Vision (Images - Free)",   vision: true  },
    ];
  }
}

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

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Backend connection failed. Is the server running?" }));
    params.onError(err.error || "Connection failed");
    return;
  }

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
