"use client";
import { useState, useEffect, useRef } from "react";

const WORD_COLORS = [
  "#FA5A50", "#B4DCFA", "#FAB9FF", "#FFFFFF",
  "#FA5A50", "#B4DCFA", "#FAB9FF", "#FFFFFF",
];

function layoutWords(wordMap, width, height) {
  const entries = Object.entries(wordMap).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return [];

  const maxCount = Math.max(...entries.map((e) => e[1]));
  const minCount = Math.min(...entries.map((e) => e[1]));
  const placed = [];
  const cx = width / 2;
  const cy = height / 2;

  entries.forEach(([word, count], idx) => {
    const ratio = maxCount === minCount ? 1 : (count - minCount) / (maxCount - minCount);
    const fontSize = Math.max(14, Math.min(80, 14 + ratio * 66));
    const color = WORD_COLORS[idx % WORD_COLORS.length];

    for (let attempt = 0; attempt < 350; attempt++) {
      const angle = attempt * 0.3;
      const radius = attempt * 2;
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle) * 0.55;
      const estW = word.length * fontSize * 0.52;
      const estH = fontSize * 1.25;
      const box = { x: x - estW / 2, y: y - estH / 2, w: estW, h: estH };

      if (box.x < 5 || box.x + box.w > width - 5 || box.y < 5 || box.y + box.h > height - 5)
        continue;

      const overlap = placed.some(
        (p) =>
          !(box.x > p.x + p.w + 6 || box.x + box.w < p.x - 6 || box.y > p.y + p.h + 3 || box.y + box.h < p.y - 3)
      );

      if (!overlap) {
        placed.push({ word, count, fontSize, color, ...box, delay: idx * 0.035 });
        break;
      }
    }
  });

  return placed;
}

export default function PresenterPage() {
  const [wordMap, setWordMap] = useState({});
  const [dims, setDims] = useState({ w: 1200, h: 700 });
  const [showReset, setShowReset] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const resize = () => {
      if (containerRef.current) {
        setDims({ w: containerRef.current.offsetWidth, h: containerRef.current.offsetHeight });
      }
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch("/api/words");
        const data = await res.json();
        setWordMap(data);
      } catch {}
    };
    poll();
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleReset = async () => {
    try {
      await fetch("/api/words", { method: "DELETE" });
      setWordMap({});
      setShowReset(false);
    } catch {}
  };

  const words = layoutWords(wordMap, dims.w, dims.h - 110);
  const totalCount = Object.values(wordMap).reduce((a, b) => a + b, 0);
  const uniqueCount = Object.keys(wordMap).length;

  return (
    <div
      ref={containerRef}
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: "radial-gradient(ellipse at 30% 40%, #0a0a5c 0%, #000050 55%, #020020 100%)",
        position: "relative",
      }}
    >
      {/* Decorative */}
      <div
        style={{
          position: "absolute", top: -140, right: -140, width: 450, height: 450,
          borderRadius: "50%", background: "#FA5A50", opacity: 0.04,
        }}
      />
      <div
        style={{
          position: "absolute", bottom: -110, left: -110, width: 380, height: 380,
          borderRadius: "50%", background: "#FAB9FF", opacity: 0.03,
        }}
      />

      {/* Header */}
      <div
        style={{
          position: "absolute", top: 0, left: 0, right: 0,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "22px 36px", zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
          <span
            style={{
              fontSize: 15, fontWeight: 700, color: "#FA5A50",
              fontFamily: "'DM Sans', sans-serif", letterSpacing: 3,
            }}
          >
            NEXT-GEN BOOTCAMP
          </span>
          <span
            style={{
              fontSize: 12, color: "rgba(180,220,250,0.35)",
              fontFamily: "'DM Sans', sans-serif", letterSpacing: 2,
            }}
          >
            CI&T
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <span
            style={{
              fontSize: 14, color: "rgba(180,220,250,0.45)",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {totalCount} {totalCount === 1 ? "resposta" : "respostas"} · {uniqueCount}{" "}
            {uniqueCount === 1 ? "palavra" : "palavras"}
          </span>
          <div
            style={{
              width: 9, height: 9, borderRadius: "50%",
              background: "#4ADE80", animation: "pulse 2s ease infinite",
            }}
          />
        </div>
      </div>

      {/* Question */}
      <div style={{ position: "absolute", top: 60, left: 0, right: 0, textAlign: "center", zIndex: 10 }}>
        <p
          style={{
            fontSize: 17, color: "rgba(180,220,250,0.4)",
            fontFamily: "'DM Sans', sans-serif", fontWeight: 400,
          }}
        >
          Em uma palavra, o que o bootcamp significou pra você?
        </p>
      </div>

      {/* Word Cloud */}
      <div style={{ position: "absolute", top: 100, left: 0, right: 0, bottom: 50 }}>
        {words.length === 0 && (
          <div
            style={{
              position: "absolute", top: "50%", left: "50%",
              transform: "translate(-50%, -50%)", textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 56, color: "rgba(255,255,255,0.05)",
                fontFamily: "'DM Sans', sans-serif", fontWeight: 700, marginBottom: 14,
              }}
            >
              · · ·
            </div>
            <div
              style={{
                fontSize: 17, color: "rgba(180,220,250,0.2)",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Aguardando as primeiras palavras...
            </div>
          </div>
        )}
        {words.map((w, i) => (
          <div
            key={`${w.word}-${i}`}
            style={{
              position: "absolute",
              left: w.x,
              top: w.y,
              fontSize: w.fontSize,
              color: w.color,
              fontWeight: w.count > 2 ? 700 : 400,
              fontFamily:
                w.fontSize > 44
                  ? "'DM Sans', sans-serif"
                  : "'DM Sans', sans-serif",
              whiteSpace: "nowrap",
              opacity: 0,
              animation: `wordAppear 0.6s ease ${w.delay}s forwards`,
              textShadow: w.fontSize > 44 ? `0 0 50px ${w.color}18` : "none",
              transition: "all 0.5s ease",
            }}
          >
            {w.word}
          </div>
        ))}
      </div>

      {/* Bottom controls */}
      <div
        style={{
          position: "absolute", bottom: 14, left: 0, right: 0,
          display: "flex", justifyContent: "flex-end", alignItems: "center",
          padding: "0 36px", zIndex: 10,
        }}
      >
        {!showReset ? (
          <button
            onClick={() => setShowReset(true)}
            style={{
              padding: "6px 16px", fontSize: 11,
              fontFamily: "'DM Sans', sans-serif",
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 6, color: "rgba(255,255,255,0.18)",
              cursor: "pointer", letterSpacing: 1,
            }}
          >
            RESETAR
          </button>
        ) : (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span
              style={{
                fontSize: 11, color: "rgba(255,255,255,0.35)",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Tem certeza?
            </span>
            <button
              onClick={handleReset}
              style={{
                padding: "6px 16px", fontSize: 11,
                fontFamily: "'DM Sans', sans-serif",
                background: "#FA5A50", border: "none",
                borderRadius: 6, color: "#fff", cursor: "pointer", fontWeight: 700,
              }}
            >
              SIM, RESETAR
            </button>
            <button
              onClick={() => setShowReset(false)}
              style={{
                padding: "6px 16px", fontSize: 11,
                fontFamily: "'DM Sans', sans-serif",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 6, color: "rgba(255,255,255,0.35)", cursor: "pointer",
              }}
            >
              CANCELAR
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
