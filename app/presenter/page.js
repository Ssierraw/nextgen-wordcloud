"use client";
import { useState, useEffect, useRef } from "react";
import LogoCIT from "../components/LogoCIT";

// ─── Aurora WebGL shader ──────────────────────────────────────────────────────
const AURORA_VS = `attribute vec2 a_pos;
void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }`;

const AURORA_FS = `precision highp float;
uniform vec2  u_res;
uniform vec2  u_mouse;
uniform vec2  u_mouseSmooth;
uniform float u_time;
uniform vec4  u_clicks[6];

const vec3 NAVY    = vec3(0.000, 0.000, 0.314);
const vec3 DEEP    = vec3(0.412, 0.000, 0.216);
const vec3 CORAL   = vec3(0.980, 0.353, 0.314);
const vec3 CORALH  = vec3(1.000, 0.522, 0.459);
const vec3 MAGENTA = vec3(0.933, 0.533, 1.000);
const vec3 BLUE    = vec3(0.576, 0.772, 0.992);
const vec3 SILVER  = vec3(0.910, 0.933, 1.000);
const vec3 WHITE   = vec3(1.000);

float hash12(vec2 p){ vec3 p3=fract(vec3(p.xyx)*0.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }

float noise(vec2 p){
  vec2 i=floor(p); vec2 f=fract(p); vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(hash12(i),hash12(i+vec2(1,0)),u.x),mix(hash12(i+vec2(0,1)),hash12(i+vec2(1,1)),u.x),u.y);
}

float fbm(vec2 p){
  float v=0.0; float a=0.5; mat2 m=mat2(1.6,1.2,-1.2,1.6);
  for(int i=0;i<5;i++){ v+=a*noise(p); p=m*p; a*=0.5; }
  return v;
}

float clickRings(vec2 uv,float speed,float width){
  float total=0.0;
  for(int i=0;i<6;i++){
    vec4 c=u_clicks[i]; if(c.w<0.001) continue;
    float t=u_time-c.z; if(t<0.0) continue;
    float r=t*speed; float d=distance(uv,c.xy);
    total+=exp(-pow((d-r)/max(width,0.0001),2.0))*exp(-t*0.9)*c.w;
  }
  return total;
}

vec2 centeredUv(){ vec2 uv=gl_FragCoord.xy/u_res.xy; uv-=0.5; uv.x*=u_res.x/u_res.y; return uv; }
vec2 mouseCentered(){ vec2 m=u_mouseSmooth-0.5; m.x*=u_res.x/u_res.y; return m; }

void main(){
  vec2 uv=centeredUv(); vec2 m=mouseCentered();
  float t=u_time*0.08;
  float ripple=clickRings(gl_FragCoord.xy/u_res.xy,0.35,0.06);
  vec2 toMouse=uv-m; float dm=length(toMouse);
  vec2 pull=toMouse/(dm+0.4)*0.45;
  vec2 p=uv*1.4+pull*0.6+vec2(t*0.7,-t*0.4);
  vec2 q=vec2(fbm(p),fbm(p+vec2(5.2,1.3)));
  vec2 r=vec2(fbm(p+1.8*q+vec2(1.7,9.2)+t),fbm(p+1.8*q+vec2(8.3,2.8)+t*1.1));
  float f=fbm(p+2.0*r+ripple*2.0);
  vec3 col=NAVY;
  col=mix(col,DEEP,    smoothstep(0.05,0.45,f));
  col=mix(col,CORAL,   smoothstep(0.35,0.70,f)*0.95);
  col=mix(col,MAGENTA, smoothstep(0.55,0.85,length(q))*0.85);
  col=mix(col,BLUE,    smoothstep(0.50,0.95,length(r))*0.55);
  col=mix(col,SILVER,  smoothstep(0.85,1.05,f)*0.7);
  col+=CORALH*exp(-dm*2.2)*0.25;
  col+=WHITE*ripple*0.6;
  col=mix(NAVY*0.6,col,smoothstep(1.2,0.2,length(uv)));
  gl_FragColor=vec4(col,1.0);
}`;

// ─── Word cloud helpers ───────────────────────────────────────────────────────
function wordHash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
    h = h >>> 0;
  }
  return h;
}

// Text: white-family per tier. Glow: CI&T color stays, but in the halo — not the text.
const TIER_COLORS = [
  { text: "#FFFFFF",                 glow: "#FA5A50" },  // top — white + coral glow
  { text: "#FFF0EE",                 glow: "#FAB9FF" },  // mid — warm white + pink glow
  { text: "#EEF4FF",                 glow: "#93C5FD" },  // lower — cool white + blue glow
  { text: "rgba(255,255,255,0.65)",  glow: null       },  // bottom — translucent, no glow
];

function getTierIdx(ratio) {
  return ratio >= 0.75 ? 0 : ratio >= 0.45 ? 1 : ratio >= 0.2 ? 2 : 3;
}

function getGlow(ratio, tierIdx) {
  const glowColor = TIER_COLORS[tierIdx]?.glow;
  if (!glowColor || ratio < 0.2) return "none";
  const intensity = Math.round(ratio * 80);
  const hex = intensity.toString(16).padStart(2, "0");
  return `0 0 ${20 + ratio * 45}px ${glowColor}${hex}`;
}

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

// 8 discrete size scales — clearer visual hierarchy
const FONT_SCALES = [13, 18, 24, 32, 42, 54, 68, 86];

function getFontSize(ratio) {
  const idx = Math.min(7, Math.floor(Math.pow(ratio, 1.3) * 8));
  return FONT_SCALES[idx];
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
  const cx = width / 2, cy = height / 2;

  entries.forEach(([word, count]) => {
    const ratio = maxCount === minCount ? 1 : (count - minCount) / (maxCount - minCount);
    const hash = wordHash(word);
    const fontSize = getFontSize(ratio);
    const tierIdx = getTierIdx(ratio);
    const color = TIER_COLORS[tierIdx].text;
    const startAngle = (hash % 628) / 100;
    const angleStep  = 0.27 + (hash % 12) * 0.01;
    const vCompress  = 0.48 + (hash % 18) * 0.01;

    for (let attempt = 0; attempt < 450; attempt++) {
      const angle = startAngle + attempt * angleStep;
      const radius = attempt * 2.1;
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle) * vCompress;
      const estW = word.length * fontSize * 0.52;
      const estH = fontSize * 1.25;
      const box = { x: x - estW / 2, y: y - estH / 2, w: estW, h: estH };

      if (box.x < 8 || box.x + box.w > width - 8 || box.y < 8 || box.y + box.h > height - 8) continue;
      const overlap = placed.some(
        (p) => !(box.x > p.x + p.w + 8 || box.x + box.w < p.x - 8 || box.y > p.y + p.h + 5 || box.y + box.h < p.y - 5)
      );
      if (!overlap) { placed.push({ word, count, ratio, tierIdx, fontSize, color, ...box }); break; }
    }
  });
  return placed;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function PresenterPage() {
  const [wordMap, setWordMap] = useState({});
  const [dims, setDims] = useState({ w: 1200, h: 700 });
  const [showReset, setShowReset] = useState(false);
  const [pulsingWords, setPulsingWords] = useState(new Set());
  const containerRef = useRef(null);
  const glCanvasRef  = useRef(null);
  const seenWordsRef = useRef(new Set());

  // ── Aurora WebGL background ──────────────────────────────────────────────
  useEffect(() => {
    const canvas = glCanvasRef.current;
    const gl = canvas.getContext("webgl", { antialias: true });
    if (!gl) return;

    function compile(type, src) {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src); gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(sh));
      return sh;
    }
    const vs = compile(gl.VERTEX_SHADER, AURORA_VS);
    const fs = compile(gl.FRAGMENT_SHADER, AURORA_FS);
    const prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);

    const L = {
      a_pos:         gl.getAttribLocation(prog, "a_pos"),
      u_res:         gl.getUniformLocation(prog, "u_res"),
      u_mouse:       gl.getUniformLocation(prog, "u_mouse"),
      u_mouseSmooth: gl.getUniformLocation(prog, "u_mouseSmooth"),
      u_time:        gl.getUniformLocation(prog, "u_time"),
      u_clicks:      gl.getUniformLocation(prog, "u_clicks[0]"),
    };

    const mouse = { x: 0.5, y: 0.5 }, smooth = { x: 0.5, y: 0.5 };
    const clicks = new Float32Array(24);
    const start = performance.now();

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.floor(window.innerWidth * dpr);
      const h = Math.floor(window.innerHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h);
      }
    }
    resize();
    window.addEventListener("resize", resize);

    function onMove(e) {
      mouse.x = e.clientX / window.innerWidth;
      mouse.y = 1.0 - e.clientY / window.innerHeight;
    }
    window.addEventListener("mousemove", onMove);

    let animId;
    function render() {
      resize();
      const t = (performance.now() - start) / 1000;
      smooth.x += (mouse.x - smooth.x) * 0.07;
      smooth.y += (mouse.y - smooth.y) * 0.07;

      gl.useProgram(prog);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(L.a_pos);
      gl.vertexAttribPointer(L.a_pos, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(L.u_res, canvas.width, canvas.height);
      gl.uniform2f(L.u_mouse, mouse.x, mouse.y);
      gl.uniform2f(L.u_mouseSmooth, smooth.x, smooth.y);
      gl.uniform1f(L.u_time, t);
      if (L.u_clicks) gl.uniform4fv(L.u_clicks, clicks);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      animId = requestAnimationFrame(render);
    }
    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  // ── Resize observer ──────────────────────────────────────────────────────
  useEffect(() => {
    const resize = () => {
      if (containerRef.current)
        setDims({ w: containerRef.current.offsetWidth, h: containerRef.current.offsetHeight });
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // ── Word polling ─────────────────────────────────────────────────────────
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

  useEffect(() => { words.forEach((w) => seenWordsRef.current.add(w.word)); });

  return (
    <div
      ref={containerRef}
      style={{ width: "100vw", height: "100vh", overflow: "hidden", background: "#000050", position: "relative" }}
    >
      {/* Aurora canvas */}
      <canvas
        ref={glCanvasRef}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", zIndex: 0 }}
      />

      {/* Dark scrim — keeps words readable over bright aurora areas */}
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,20,0.28)", zIndex: 1 }} />

      {/* Header */}
      <div
        style={{
          position: "absolute", top: 0, left: 0, right: 0,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "22px 36px", zIndex: 10,
        }}
      >
        <LogoCIT height={52} />
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <span style={{ fontSize: 14, color: "rgba(180,220,250,0.45)", fontFamily: "'DM Sans', sans-serif" }}>
            {totalCount} {totalCount === 1 ? "resposta" : "respostas"} · {uniqueCount}{" "}
            {uniqueCount === 1 ? "palavra" : "palavras"}
          </span>
          <div style={{ width: 9, height: 9, borderRadius: "50%", background: "#4ADE80", animation: "pulse 2s ease infinite" }} />
        </div>
      </div>

      {/* Question */}
      <div style={{ position: "absolute", top: 60, left: 0, right: 0, textAlign: "center", zIndex: 10 }}>
        <p style={{ fontSize: 17, color: "rgba(180,220,250,0.5)", fontFamily: "'DM Sans', sans-serif", fontWeight: 400 }}>
          Em uma palavra, o que o bootcamp significou pra você?
        </p>
      </div>

      {/* Word Cloud */}
      <div style={{ position: "absolute", top: 100, left: 0, right: 0, bottom: 50, zIndex: 2 }}>
        {words.length === 0 && (
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center" }}>
            <div style={{ fontSize: 56, color: "rgba(255,255,255,0.05)", fontFamily: "'DM Sans', sans-serif", fontWeight: 700, marginBottom: 14 }}>
              · · ·
            </div>
            <div style={{ fontSize: 17, color: "rgba(180,220,250,0.2)", fontFamily: "'DM Sans', sans-serif" }}>
              Aguardando as primeiras palavras...
            </div>
          </div>
        )}
        {words.map((w, i) => {
          const isNew     = !seenWordsRef.current.has(w.word);
          const isPulsing = pulsingWords.has(w.word);
          let animation;
          if (isPulsing)   animation = "wordPulse 0.75s ease forwards";
          else if (isNew)  animation = `wordAppear 0.7s cubic-bezier(0.34,1.56,0.64,1) ${i * 0.04}s both`;
          else             animation = getFloatAnimation(w.fontSize, w.ratio);

          const fontWeight = w.ratio >= 0.8 ? 800 : w.ratio >= 0.5 ? 700 : w.ratio >= 0.2 ? 600 : 400;

          return (
            <div
              key={w.word}
              style={{
                position: "absolute",
                left: w.x, top: w.y,
                fontSize: w.fontSize,
                color: w.color,
                fontWeight,
                fontFamily: "'DM Sans', sans-serif",
                whiteSpace: "nowrap",
                animation,
                textShadow: getGlow(w.ratio, w.tierIdx),
                transition: isNew ? "none" : "left 0.5s ease, top 0.5s ease",
                opacity: isNew ? undefined : 1,
                transformOrigin: "center center",
              }}
            >
              {capitalize(w.word)}
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
              padding: "6px 16px", fontSize: 11, fontFamily: "'DM Sans', sans-serif",
              background: "transparent", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 6, color: "rgba(255,255,255,0.18)", cursor: "pointer", letterSpacing: 1,
            }}
          >RESETAR</button>
        ) : (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Sans', sans-serif" }}>
              Tem certeza?
            </span>
            <button
              onClick={handleReset}
              style={{
                padding: "6px 16px", fontSize: 11, fontFamily: "'DM Sans', sans-serif",
                background: "#FA5A50", border: "none", borderRadius: 6,
                color: "#fff", cursor: "pointer", fontWeight: 700,
              }}
            >SIM, RESETAR</button>
            <button
              onClick={() => setShowReset(false)}
              style={{
                padding: "6px 16px", fontSize: 11, fontFamily: "'DM Sans', sans-serif",
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 6, color: "rgba(255,255,255,0.35)", cursor: "pointer",
              }}
            >CANCELAR</button>
          </div>
        )}
      </div>
    </div>
  );
}
