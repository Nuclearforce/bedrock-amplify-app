import { useState } from "react";
import amplifyOutputs from "../amplify_outputs.json";
import "./App.css";

const API_BASE_URL =
  amplifyOutputs?.custom?.CHAT_API?.endpoint?.replace(/\/$/, "") || "";
const CHAT_PATH = amplifyOutputs?.custom?.CHAT_API?.path || "/chat";
const API_URL = API_BASE_URL ? `${API_BASE_URL}${CHAT_PATH}` : "";

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const sendMessage = async (e) => {
    e.preventDefault();
    setError("");

    const trimmed = input.trim();
    if (!trimmed) return;

    // Add user message to local state
    const newMessages = [...messages, { role: "user", content: trimmed }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          history: newMessages,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }

      const data = await res.json();

      if (data.reply) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.reply },
        ]);
      } else {
        setError("No reply field in response");
        console.error("Unexpected response:", data);
      }
    } catch (err) {
      console.error("Error calling chat API:", err);
      setError(err.message || "Error calling chat API");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-container">
      <h1>Sand Bedrock LLM POC</h1>

      {!API_URL && (
        <div className="error">API endpoint is not set in amplify_outputs.json.</div>
      )}

      <div className="chat-box">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`msg ${
              m.role === "user" ? "msg-user" : "msg-assistant"
            }`}
          >
            <strong>{m.role === "user" ? "You" : "Llama"}</strong>
            <p>{m.content}</p>
          </div>
        ))}
        {loading && <div className="typing">LLM is thinking...</div>}
      </div>

      {error && <div className="error">{error}</div>}

      <form onSubmit={sendMessage} className="input-row">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="RAG still in progress..."
          disabled={!API_URL || loading}
        />
        <button type="submit" disabled={!API_URL || loading}>
          Send
        </button>
      </form>
    </div>
  );
}

export default App;
