"use client";
import { useState, useEffect, useRef } from "react";

function getColorByRatio(ratio) {
  if (ratio >= 0.8) return "#FA5A50";
  if (ratio >= 0.5) return "#FAB9FF";
  if (ratio >= 0.2) return "#B4DCFA";
  return "#FFFFFF";
}

function getGlow(ratio, color) {
  if (ratio < 0.15) return "none";
  const intensity = Math.round(ratio * 65);
  const hex = intensity.toString(16).padStart(2, "0");
  const blur = 15 + ratio * 45;
  return `0 0 ${blur}px ${color}${hex}`;
}

function getFloatAnimation(fontSize, ratio) {
  if (ratio < 0.25) return "none";
  if (fontSize > 55) return "floatSlow 6s ease-in-out infinite";
  if (fontSize > 35) return "float 4s ease-in-out infinite";
  return "float 3s ease-in-out infinite";
}

function layoutWords(wordMap, width, height) {
  const entries = Object.entries(wordMap).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return [];

  const maxCount = Math.max(...entries.map((e) => e[1]));
  const minCount = Math.min(...entries.map((e) => e[1]));
  const placed = [];
  const cx = width / 2;
  const cy = height / 2;

  entries.forEach(([word, count]) => {
    const ratio = maxCount === minCount ? 1 : (count - minCount) / (maxCount - minCount);
    const fontSize = Math.max(14, Math.min(80, 14 + ratio * 66));
    const color = getColorByRatio(ratio);

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
        placed.push({ word, count, ratio, fontSize, color, ...box });
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
  const [pulsingWords, setPulsingWords] = useState(new Set());
  const containerRef = useRef(null);
  const seenWordsRef = useRef(new Set());

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
        setWordMap((prev) => {
          const boosted = new Set(
            Object.entries(data)
              .filter(([word, count]) => prev[word] && count > prev[word])
              .map(([word]) => word)
          );
          if (boosted.size > 0) {
            setPulsingWords(boosted);
            setTimeout(() => setPulsingWords(new Set()), 750);
          }
          return data;
        });
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
      seenWordsRef.current.clear();
      setShowReset(false);
    } catch {}
  };

  const words = layoutWords(wordMap, dims.w, dims.h - 110);
  const totalCount = Object.values(wordMap).reduce((a, b) => a + b, 0);
  const uniqueCount = Object.keys(wordMap).length;

  useEffect(() => {
    words.forEach((w) => seenWordsRef.current.add(w.word));
  });

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
        {words.map((w, i) => {
          const isNew = !seenWordsRef.current.has(w.word);
          const isPulsing = pulsingWords.has(w.word);

          let animation;
          if (isPulsing) {
            animation = "wordPulse 0.75s ease forwards";
          } else if (isNew) {
            animation = `wordAppear 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 0.04}s both`;
          } else {
            animation = getFloatAnimation(w.fontSize, w.ratio);
          }

          const fontWeight =
            w.ratio >= 0.8 ? 800 : w.ratio >= 0.5 ? 700 : w.ratio >= 0.2 ? 600 : 400;

          return (
            <div
              key={w.word}
              style={{
                position: "absolute",
                left: w.x,
                top: w.y,
                fontSize: w.fontSize,
                color: w.color,
                fontWeight,
                fontFamily: "'DM Sans', sans-serif",
                whiteSpace: "nowrap",
                animation,
                textShadow: getGlow(w.ratio, w.color),
                transition: isNew ? "none" : "left 0.5s ease, top 0.5s ease",
                opacity: isNew ? undefined : 1,
                transformOrigin: "center center",
              }}
            >
              {w.word}
            </div>
          );
        })}
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
