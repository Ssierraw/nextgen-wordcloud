"use client";
import { useState, useEffect, useRef } from "react";
import LogoCIT from "./components/LogoCIT";

const AURORA_VS = `attribute vec2 a_pos;
void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }`;

const AURORA_FS = `precision highp float;
uniform vec2  u_res;
uniform vec2  u_mouse;
uniform vec2  u_mouseSmooth;
uniform float u_time;

const vec3 NAVY    = vec3(0.000, 0.000, 0.314);
const vec3 DEEP    = vec3(0.412, 0.000, 0.216);
const vec3 CORAL   = vec3(0.980, 0.353, 0.314);
const vec3 CORALH  = vec3(1.000, 0.522, 0.459);
const vec3 MAGENTA = vec3(0.933, 0.533, 1.000);
const vec3 BLUE    = vec3(0.576, 0.772, 0.992);
const vec3 SILVER  = vec3(0.910, 0.933, 1.000);

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

vec2 centeredUv(){ vec2 uv=gl_FragCoord.xy/u_res.xy; uv-=0.5; uv.x*=u_res.x/u_res.y; return uv; }
vec2 mouseCentered(){ vec2 m=u_mouseSmooth-0.5; m.x*=u_res.x/u_res.y; return m; }

void main(){
  vec2 uv=centeredUv(); vec2 m=mouseCentered();
  float t=u_time*0.08;
  vec2 toMouse=uv-m; float dm=length(toMouse);
  vec2 pull=toMouse/(dm+0.4)*0.45;
  vec2 p=uv*1.4+pull*0.6+vec2(t*0.7,-t*0.4);
  vec2 q=vec2(fbm(p),fbm(p+vec2(5.2,1.3)));
  vec2 r=vec2(fbm(p+1.8*q+vec2(1.7,9.2)+t),fbm(p+1.8*q+vec2(8.3,2.8)+t*1.1));
  float f=fbm(p+2.0*r);
  vec3 col=NAVY;
  col=mix(col,DEEP,    smoothstep(0.05,0.45,f));
  col=mix(col,CORAL,   smoothstep(0.35,0.70,f)*0.95);
  col=mix(col,MAGENTA, smoothstep(0.55,0.85,length(q))*0.85);
  col=mix(col,BLUE,    smoothstep(0.50,0.95,length(r))*0.55);
  col=mix(col,SILVER,  smoothstep(0.85,1.05,f)*0.7);
  col+=CORALH*exp(-dm*2.2)*0.25;
  col=mix(NAVY*0.6,col,smoothstep(1.2,0.2,length(uv)));
  gl_FragColor=vec4(col,1.0);
}`;

export default function ParticipantPage() {
  const [word, setWord] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [total, setTotal] = useState(0);
  const glCanvasRef = useRef(null);

  // Aurora WebGL background
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
    };

    const mouse = { x: 0.5, y: 0.5 }, smooth = { x: 0.5, y: 0.5 };
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
        background: "#000050",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Aurora canvas */}
      <canvas
        ref={glCanvasRef}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", zIndex: 0 }}
      />

      {/* Dark scrim */}
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,20,0.28)", zIndex: 1 }} />

      {/* Content */}
      <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
        {/* Branding */}
        <div style={{ marginBottom: 44 }}>
          <LogoCIT height={90} />
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
      </div>

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
          zIndex: 2,
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
