"use client";
import { useState, useEffect } from "react";
import LogoCIT from "./components/LogoCIT";

export default function ParticipantPage() {
  const [word, setWord] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch("/api/words");
        const data = await res.json();
        setTotal(Object.values(data).reduce((a, b) => a + b, 0));
      } catch {}
    };
    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async () => {
    if (!word.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/words", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: word.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setTotal(Object.values(data).reduce((a, b) => a + b, 0));
        setSubmitted(true);
        setWord("");
        setTimeout(() => setSubmitted(false), 3000);
      }
    } catch {}
    setSending(false);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #000050 0%, #0a0a5c 50%, #69003744 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorative blobs */}
      <div
        style={{
          position: "absolute", top: -80, right: -80, width: 250, height: 250,
          borderRadius: "50%", background: "#FA5A50", opacity: 0.12,
        }}
      />
      <div
        style={{
          position: "absolute", bottom: -60, left: -60, width: 200, height: 200,
          borderRadius: "50%", background: "#FAB9FF", opacity: 0.1,
        }}
      />

      {/* Branding */}
      <div style={{ marginBottom: 44 }}>
        <LogoCIT size={56} />
      </div>

      {/* Question */}
      <h1
        style={{
          fontSize: "clamp(22px, 5vw, 34px)",
          fontFamily: "'DM Sans', sans-serif",
          color: "#fff",
          textAlign: "center",
          marginBottom: 10,
          lineHeight: 1.3,
        }}
      >
        Em uma palavra, o que o
        <br />
        bootcamp significou pra você?
      </h1>

      <div style={{ width: 50, height: 3, background: "#FA5A50", borderRadius: 2, marginBottom: 36 }} />

      {/* Input */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14, width: "100%", maxWidth: 440, alignItems: "center" }}>
        <input
          type="text"
          value={word}
          onChange={(e) => setWord(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Sua palavra..."
          maxLength={30}
          style={{
            width: "100%",
            padding: "16px 20px",
            fontSize: 18,
            fontFamily: "'DM Sans', sans-serif",
            background: "rgba(255,255,255,0.07)",
            border: `2px solid ${submitted ? "#FA5A50" : "rgba(255,255,255,0.12)"}`,
            borderRadius: 12,
            color: "#fff",
            outline: "none",
            transition: "all 0.3s ease",
            backdropFilter: "blur(10px)",
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={!word.trim() || sending}
          style={{
            padding: "14px 44px",
            fontSize: 15,
            fontWeight: 700,
            fontFamily: "'DM Sans', sans-serif",
            background: word.trim() ? "#FA5A50" : "rgba(255,255,255,0.08)",
            color: word.trim() ? "#fff" : "rgba(255,255,255,0.25)",
            border: "none",
            borderRadius: 10,
            cursor: word.trim() ? "pointer" : "default",
            transition: "all 0.3s ease",
            letterSpacing: 1.5,
          }}
        >
          {sending ? "ENVIANDO..." : "ENVIAR"}
        </button>
      </div>

      {/* Success */}
      {submitted && (
        <div
          style={{
            marginTop: 22,
            padding: "10px 24px",
            borderRadius: 8,
            background: "rgba(250,90,80,0.12)",
            border: "1px solid #FA5A50",
            color: "#FA5A50",
            fontSize: 14,
            fontFamily: "'DM Sans', sans-serif",
            animation: "fadeIn 0.3s ease",
          }}
        >
          ✓ Enviada! Pode enviar mais uma.
        </div>
      )}

      {/* Counter */}
      <div
        style={{
          position: "fixed",
          bottom: 20,
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: 13,
          color: "rgba(180,220,250,0.4)",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {total} {total === 1 ? "palavra enviada" : "palavras enviadas"}
      </div>

      <style>{`
        input::placeholder { color: rgba(180,220,250,0.3); }
        input:focus { border-color: #FA5A50 !important; background: rgba(255,255,255,0.1) !important; }
      `}</style>
    </div>
  );
}
