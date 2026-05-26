"use client";
import { useEffect, useRef, useState } from "react";

// ─── Vertex shader ────────────────────────────────────────────────────────────
const VS_SRC = `attribute vec2 a_pos;
void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }`;

// ─── Shared fragment header (palette + helpers) ───────────────────────────────
const FS_HEADER = `precision highp float;
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
const vec3 PINK    = vec3(0.980, 0.725, 1.000);
const vec3 BLUE    = vec3(0.576, 0.772, 0.992);
const vec3 BLUEH   = vec3(0.729, 0.863, 0.980);
const vec3 SILVER  = vec3(0.910, 0.933, 1.000);
const vec3 WHITE   = vec3(1.000);

float hash11(float p){ p=fract(p*0.1031); p*=p+33.33; p*=p+p; return fract(p); }
float hash12(vec2 p){ vec3 p3=fract(vec3(p.xyx)*0.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
vec2  hash22(vec2 p){ vec3 p3=fract(vec3(p.xyx)*vec3(0.1031,0.1030,0.0973)); p3+=dot(p3,p3.yzx+33.33); return fract((p3.xx+p3.yz)*p3.zy); }

float noise(vec2 p){
  vec2 i=floor(p); vec2 f=fract(p); vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(hash12(i),hash12(i+vec2(1,0)),u.x),mix(hash12(i+vec2(0,1)),hash12(i+vec2(1,1)),u.x),u.y);
}

float fbm(vec2 p){
  float v=0.0; float a=0.5; mat2 m=mat2(1.6,1.2,-1.2,1.6);
  for(int i=0;i<5;i++){ v+=a*noise(p); p=m*p; a*=0.5; }
  return v;
}

float clickRings(vec2 uv, float speed, float width){
  float total=0.0;
  for(int i=0;i<6;i++){
    vec4 c=u_clicks[i]; if(c.w<0.001) continue;
    float t=u_time-c.z; if(t<0.0) continue;
    float r=t*speed; float d=distance(uv,c.xy);
    total+=exp(-pow((d-r)/max(width,0.0001),2.0))*exp(-t*0.9)*c.w;
  }
  return total;
}

float clickSplats(vec2 uv, float radius){
  float total=0.0;
  for(int i=0;i<6;i++){
    vec4 c=u_clicks[i]; if(c.w<0.001) continue;
    float t=u_time-c.z; if(t<0.0) continue;
    total+=exp(-pow(distance(uv,c.xy)/radius,2.0))*exp(-t*1.6)*c.w;
  }
  return total;
}

vec2 centeredUv(){
  vec2 uv=gl_FragCoord.xy/u_res.xy; uv-=0.5; uv.x*=u_res.x/u_res.y; return uv;
}
vec2 mouseCentered(){
  vec2 m=u_mouseSmooth-0.5; m.x*=u_res.x/u_res.y; return m;
}`;

// ─── Five fragment shaders ────────────────────────────────────────────────────
const FS_SOURCES = [
  // 0 — Aurora Drift
  `void main(){
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
  col=mix(col,DEEP,     smoothstep(0.05,0.45,f));
  col=mix(col,CORAL,    smoothstep(0.35,0.70,f)*0.95);
  col=mix(col,MAGENTA,  smoothstep(0.55,0.85,length(q))*0.85);
  col=mix(col,BLUE,     smoothstep(0.50,0.95,length(r))*0.55);
  col=mix(col,SILVER,   smoothstep(0.85,1.05,f)*0.7);
  col+=CORALH*exp(-dm*2.2)*0.25;
  col+=WHITE*ripple*0.6;
  col=mix(NAVY*0.6,col,smoothstep(1.2,0.2,length(uv)));
  gl_FragColor=vec4(col,1.0);
}`,

  // 1 — Plasma Bloom
  `void main(){
  vec2 uv=centeredUv(); vec2 m=mouseCentered();
  vec3 bg=mix(NAVY,DEEP,smoothstep(-0.7,0.6,uv.y));
  bg=mix(bg,NAVY*1.4,smoothstep(0.6,-0.8,uv.y)*0.4);
  float n=fbm(uv*1.6+vec2(u_time*0.08,-u_time*0.05));
  bg=mix(bg,mix(DEEP,CORAL,n),n*0.35);
  vec2 d=uv-m; float r=length(d);
  float swirl=fbm(d*3.5+vec2(u_time*0.4,u_time*0.3)+n*1.5);
  vec3 orb=mix(CORAL,CORALH,swirl);
  orb=mix(orb,PINK,smoothstep(0.4,0.9,swirl)*0.7);
  orb=mix(orb,WHITE,exp(-r*r*8.0));
  vec3 col=bg+orb*exp(-r*1.8)*0.9;
  col+=MAGENTA*(smoothstep(0.55,0.25,r)-smoothstep(0.25,0.0,r))*0.25;
  col+=mix(CORAL,WHITE,0.5)*clickRings(gl_FragCoord.xy/u_res.xy,0.45,0.012)*1.2;
  col+=(hash12(gl_FragCoord.xy+u_time*60.0)-0.5)*0.025;
  gl_FragColor=vec4(col,1.0);
}`,

  // 2 — Lattice Hum
  `vec4 hexCoords(vec2 uv){
  vec2 r=vec2(1.0,1.732); vec2 h=r*0.5;
  vec2 a=mod(uv,r)-h; vec2 b=mod(uv-h,r)-h;
  vec2 gv=dot(a,a)<dot(b,b)?a:b; return vec4(gv,uv-gv);
}
void main(){
  vec2 uv=centeredUv(); vec2 m=mouseCentered();
  vec3 bg=mix(NAVY*0.7,NAVY*1.3,smoothstep(-0.8,0.8,uv.y));
  bg=mix(bg,DEEP*0.6,smoothstep(0.9,0.0,length(uv-m))*0.4);
  vec4 hx=hexCoords(uv*16.0); vec2 gv=hx.xy; vec2 id=hx.zw/16.0;
  float dm=length(id-m);
  float wave=0.0;
  for(int i=0;i<6;i++){
    vec4 c=u_clicks[i]; if(c.w<0.001) continue;
    float t=u_time-c.z; if(t<0.0) continue;
    vec2 cp=c.xy-0.5; cp.x*=u_res.x/u_res.y;
    float r=t*0.6;
    wave+=exp(-pow((distance(id,cp)-r)*7.0,2.0))*exp(-t*0.8)*c.w;
  }
  float prox=exp(-dm*2.3);
  float radius=0.18+prox*0.28+wave*0.45+0.05*sin(u_time*0.7+hash12(id*13.0)*6.2831);
  float d=length(gv);
  float dot_=smoothstep(radius,radius-0.12,d);
  vec3 dotCol=mix(BLUE,SILVER,prox*0.6);
  dotCol=mix(dotCol,CORAL,smoothstep(0.0,0.25,prox));
  dotCol=mix(dotCol,MAGENTA,wave);
  float ring=smoothstep(radius+0.12,radius,d)-smoothstep(radius,radius-0.04,d);
  vec3 col=bg+dotCol*dot_+dotCol*ring*0.5;
  col+=CORAL*exp(-length(uv-m)*3.5)*0.15;
  gl_FragColor=vec4(col,1.0);
}`,

  // 3 — Voronoi Glass
  `vec3 voronoi(vec2 x){
  vec2 n=floor(x); vec2 f=fract(x);
  float d1=1e9; float d2=1e9; vec2 closest=vec2(0.0);
  for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){
    vec2 g=vec2(float(i),float(j));
    vec2 o=0.5+0.5*sin(u_time*0.45+6.2831*hash22(n+g));
    vec2 p=g+o-f; float d=dot(p,p);
    if(d<d1){ d2=d1; d1=d; closest=n+g; } else if(d<d2) d2=d;
  }
  return vec3(sqrt(d1),sqrt(d2),hash12(closest));
}
void main(){
  vec2 uv=centeredUv(); vec2 m=mouseCentered();
  vec2 p=uv*5.0+(uv-m)*0.6;
  vec3 v=voronoi(p);
  float edge=smoothstep(0.04,0.0,v.y-v.x);
  float dm=length(uv-m); float prox=exp(-dm*1.8);
  float rip=clickRings(gl_FragCoord.xy/u_res.xy,0.4,0.05);
  vec3 hot=mix(CORAL,MAGENTA,v.z);
  vec3 cool=mix(BLUE,PINK,smoothstep(0.3,0.9,v.z));
  vec3 col=mix(mix(NAVY,DEEP,0.6),cool,smoothstep(0.4,0.9,1.0-v.x)*0.55);
  col=mix(col,hot,prox*(0.4+0.6*v.z));
  col+=hot*rip*1.4;
  col=mix(col,WHITE,edge*0.7);
  col=mix(col,CORALH,edge*prox*0.8);
  col+=CORAL*exp(-dm*3.0)*0.18;
  col*=mix(0.6,1.0,smoothstep(1.4,0.2,length(uv)));
  gl_FragColor=vec4(col,1.0);
}`,

  // 4 — Nebula Field
  `void main(){
  vec2 uv=centeredUv(); vec2 m=mouseCentered();
  float t=u_time*0.04;
  float lA=fbm(uv*1.1+m*0.10+vec2(t,-t*0.4));
  float lB=fbm(uv*2.3+m*0.25+vec2(-t*1.3,t*0.8)+lA*1.8);
  float lC=fbm(uv*4.6+m*0.45+vec2(t*2.0,-t*1.4)+lB*1.5);
  vec3 col=NAVY*0.6;
  col=mix(col,DEEP,   smoothstep(0.15,0.65,lA));
  col=mix(col,CORAL,  smoothstep(0.40,0.85,lB)*0.95);
  col=mix(col,MAGENTA,smoothstep(0.55,0.90,lC)*0.8);
  col=mix(col,BLUE,   smoothstep(0.7,1.0,lA-lC*0.4)*0.45);
  col=mix(col,WHITE,  smoothstep(0.85,1.05,lC)*0.5);
  float star=hash12(floor(gl_FragCoord.xy*0.5));
  col+=WHITE*step(0.997,star)*(0.5+0.5*sin(u_time*4.0+star*40.0))*0.9;
  vec2 fragUv=gl_FragCoord.xy/u_res.xy;
  float nova=0.0; float tail=0.0;
  for(int i=0;i<6;i++){
    vec4 c=u_clicks[i]; if(c.w<0.001) continue;
    float tt=u_time-c.z; if(tt<0.0) continue;
    float d=distance(fragUv,c.xy); float r=tt*0.35;
    nova+=exp(-pow((d-r)*22.0,2.0))*exp(-tt*0.8)*c.w;
    tail+=exp(-d*4.0)*exp(-tt*1.4)*c.w;
  }
  col+=WHITE*nova*1.6+CORALH*tail*0.55+MAGENTA*tail*0.35;
  col+=CORAL*exp(-length(uv-m)*2.4)*0.18;
  gl_FragColor=vec4(col,1.0);
}`,
];

const META = [
  { id: "aurora",  titleHtml: "Aurora <em>Drift</em>",  desc: "Domain-warped noise reacts to your cursor. Click anywhere to fold the field." },
  { id: "plasma",  titleHtml: "Plasma <em>Bloom</em>",  desc: "A reflective coral orb chases the cursor. Clicks send a shockwave through the field." },
  { id: "lattice", titleHtml: "Lattice <em>Hum</em>",   desc: "A hex-grid of cells breathes in place. Move to ignite nearby dots, click to ripple the lattice." },
  { id: "cells",   titleHtml: "Voronoi <em>Glass</em>", desc: "Crystalline cells warp toward the cursor. Each click pulses a heat-front across the surface." },
  { id: "nebula",  titleHtml: "Nebula <em>Field</em>",  desc: "Layered clouds parallax with mouse motion. Click for a supernova bloom." },
];

const DOCK_ITEMS = [
  { label: "Aurora",  bg: "radial-gradient(120% 80% at 10% 10%,#FAB9FF 0%,transparent 55%),radial-gradient(120% 90% at 80% 70%,#60B4FF 0%,transparent 60%),linear-gradient(135deg,#690037,#000050)" },
  { label: "Plasma",  bg: "radial-gradient(60% 90% at 50% 60%,#FF7063 0%,#E84035 40%,#690037 75%,#000050 100%)" },
  { label: "Lattice", bg: "repeating-linear-gradient(60deg,rgba(255,255,255,0.06) 0 1px,transparent 1px 8px),repeating-linear-gradient(-60deg,rgba(255,255,255,0.06) 0 1px,transparent 1px 8px),radial-gradient(80% 80% at 50% 50%,#93C5FD 0%,#000050 75%)" },
  { label: "Cells",   bg: "radial-gradient(40% 60% at 25% 30%,#EE88FF 0%,transparent 70%),radial-gradient(40% 60% at 75% 70%,#FF8575 0%,transparent 70%),radial-gradient(50% 70% at 55% 40%,#BAE6FF 0%,transparent 80%),#000050" },
  { label: "Nebula",  bg: "radial-gradient(60% 100% at 30% 50%,#FF6458 0%,transparent 60%),radial-gradient(80% 100% at 75% 30%,#EE88FF 0%,transparent 65%),radial-gradient(100% 100% at 50% 100%,#7BC8F8 0%,transparent 70%),#000050" },
];

const PALETTE = [
  ["#FA5A50","#FF7063","#E84035","#FF8575","#FF6458"],
  ["#FAB9FF","#F0ABFC","#E879F9","#F5D0FE","#EE88FF"],
  ["#B4DCFA","#93C5FD","#7BC8F8","#60B4FF","#BAE6FF"],
  ["#FFFFFF","#E8EEFF","#D8E0FF","#C8D8FF"],
];

export default function WallpapersPage() {
  const canvasRef  = useRef(null);
  const currentRef = useRef(0);
  const [current, setCurrent] = useState(0);

  // Direct-DOM refs for high-frequency readout updates
  const rMouseRef  = useRef(null);
  const rFpsRef    = useRef(null);
  const rClicksRef = useRef(null);
  const rShaderRef = useRef(null);
  const eyebrowRef = useRef(null);
  const titleRef   = useRef(null);
  const descRef    = useRef(null);

  const selectShader = (i) => {
    currentRef.current = i;
    setCurrent(i);
    if (eyebrowRef.current) eyebrowRef.current.textContent = `Wallpaper · 0${i + 1} / 05`;
    if (titleRef.current)   titleRef.current.innerHTML = META[i].titleHtml;
    if (descRef.current)    descRef.current.textContent = META[i].desc;
    if (rShaderRef.current) rShaderRef.current.textContent = META[i].id;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas.getContext("webgl", { antialias: true, premultipliedAlpha: false });
    if (!gl) return;

    // ── compile ──────────────────────────────────────────────────────────────
    function compile(type, src) {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(sh), src);
      }
      return sh;
    }
    function makeProgram(fsSrc) {
      const vs = compile(gl.VERTEX_SHADER, VS_SRC);
      const fs = compile(gl.FRAGMENT_SHADER, FS_HEADER + "\n" + fsSrc);
      const p = gl.createProgram();
      gl.attachShader(p, vs); gl.attachShader(p, fs);
      gl.linkProgram(p);
      return p;
    }

    const programs = FS_SOURCES.map(makeProgram);

    // ── quad ─────────────────────────────────────────────────────────────────
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1
    ]), gl.STATIC_DRAW);

    function locs(p) {
      return {
        a_pos:         gl.getAttribLocation(p, "a_pos"),
        u_res:         gl.getUniformLocation(p, "u_res"),
        u_mouse:       gl.getUniformLocation(p, "u_mouse"),
        u_mouseSmooth: gl.getUniformLocation(p, "u_mouseSmooth"),
        u_time:        gl.getUniformLocation(p, "u_time"),
        u_clicks:      gl.getUniformLocation(p, "u_clicks[0]"),
      };
    }
    const allLocs = programs.map(locs);

    // ── state ─────────────────────────────────────────────────────────────────
    const mouse = { x: 0.5, y: 0.5 };
    const smooth = { x: 0.5, y: 0.5 };
    const clicks = new Float32Array(6 * 4);
    let clickHead = 0;
    let clickCount = 0;
    const start = performance.now();

    // ── resize ────────────────────────────────────────────────────────────────
    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.floor(window.innerWidth * dpr);
      const h = Math.floor(window.innerHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w; canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    }
    resize();
    window.addEventListener("resize", resize);

    // ── pointer ───────────────────────────────────────────────────────────────
    function onPointer(e) {
      const rect = canvas.getBoundingClientRect();
      const cx = e.touches ? e.touches[0].clientX : e.clientX;
      const cy = e.touches ? e.touches[0].clientY : e.clientY;
      mouse.x = (cx - rect.left) / rect.width;
      mouse.y = 1.0 - (cy - rect.top) / rect.height;
    }
    function addClick() {
      const i = clickHead * 4;
      clicks[i]   = mouse.x;
      clicks[i+1] = mouse.y;
      clicks[i+2] = (performance.now() - start) / 1000;
      clicks[i+3] = 1.0;
      clickHead = (clickHead + 1) % 6;
      clickCount++;
      if (rClicksRef.current) rClicksRef.current.textContent = String(clickCount);
    }

    canvas.addEventListener("mousemove", onPointer);
    canvas.addEventListener("touchmove", (e) => { onPointer(e); e.preventDefault(); }, { passive: false });
    canvas.addEventListener("mousedown", (e) => { onPointer(e); addClick(); });
    canvas.addEventListener("touchstart", (e) => { onPointer(e); addClick(); }, { passive: true });

    // ── keyboard ──────────────────────────────────────────────────────────────
    function onKey(e) {
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= 5) selectShader(n - 1);
    }
    window.addEventListener("keydown", onKey);

    // ── render loop ───────────────────────────────────────────────────────────
    let frame = 0, lastFpsT = performance.now(), animId;

    function render() {
      resize();
      const now = performance.now();
      const t = (now - start) / 1000;

      smooth.x += (mouse.x - smooth.x) * 0.12;
      smooth.y += (mouse.y - smooth.y) * 0.12;

      const idx = currentRef.current;
      const prog = programs[idx];
      const L = allLocs[idx];

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

      // readout
      if (rMouseRef.current) rMouseRef.current.textContent = `${smooth.x.toFixed(2)}, ${smooth.y.toFixed(2)}`;
      frame++;
      if (now - lastFpsT > 500) {
        if (rFpsRef.current) rFpsRef.current.textContent = String(Math.round(frame * 1000 / (now - lastFpsT)));
        frame = 0; lastFpsT = now;
      }

      animId = requestAnimationFrame(render);
    }
    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKey);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const mono = "'JetBrains Mono', 'SFMono-Regular', ui-monospace, monospace";
  const sans = "'Inter', 'Helvetica Neue', system-ui, sans-serif";

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000050", overflow: "hidden", color: "#E8EEFF", fontFamily: sans }}>
      <canvas
        ref={canvasRef}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", cursor: "crosshair", display: "block" }}
      />

      {/* ── Top bar ── */}
      <div style={{
        position: "absolute", top: 22, left: 24, right: 24,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        pointerEvents: "none", zIndex: 10,
        fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase",
        color: "rgba(232,238,255,0.7)",
      }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10, pointerEvents: "auto" }}>
          <div style={{
            width: 22, height: 22, borderRadius: 6, background: "#FA5A50",
            display: "grid", placeItems: "center",
            color: "#000050", fontWeight: 700, fontSize: 11, fontFamily: mono, letterSpacing: 0,
          }}>C</div>
          <span style={{ color: "#fff", fontWeight: 600 }}>CI&amp;T</span>
          <span style={{ opacity: 0.4 }}>/</span>
          <span>OS · Wallpapers</span>
        </div>

        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "6px 10px 6px 8px",
          background: "rgba(11,11,46,0.55)",
          border: "1px solid rgba(232,238,255,0.12)",
          borderRadius: 999,
          backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
          pointerEvents: "auto", fontFamily: mono, fontSize: 10, letterSpacing: "0.16em",
        }}>
          <div style={{
            width: 7, height: 7, borderRadius: "50%",
            background: "#4ADE80",
            animation: "liveDotPulse 1.6s infinite ease-out",
          }} />
          <span>LIVE · WebGL</span>
        </div>
      </div>

      {/* ── Palette strip ── */}
      <div style={{
        position: "absolute", right: 24, top: 64, zIndex: 10,
        display: "flex", flexDirection: "column", gap: 6, pointerEvents: "none",
      }}>
        {PALETTE.map((group, gi) => (
          <div key={gi} style={{ display: "flex", gap: 4 }}>
            {group.map((hex) => (
              <div key={hex} style={{
                width: 12, height: 12, borderRadius: 3,
                background: hex, border: "1px solid rgba(255,255,255,0.12)",
              }} />
            ))}
          </div>
        ))}
      </div>

      {/* ── Meta (left) ── */}
      <div style={{
        position: "absolute", left: 24, bottom: 130, zIndex: 10,
        maxWidth: 360, color: "#fff", pointerEvents: "none",
      }}>
        <div ref={eyebrowRef} style={{
          fontFamily: mono, fontSize: 11, letterSpacing: "0.22em",
          textTransform: "uppercase", color: "rgba(232,238,255,0.55)", marginBottom: 14,
        }}>Wallpaper · 01 / 05</div>
        <h1 ref={titleRef}
          className="wallpapers-title"
          style={{ fontSize: 44, lineHeight: 1.02, letterSpacing: "-0.025em", fontWeight: 500, marginBottom: 14 }}
          dangerouslySetInnerHTML={{ __html: META[0].titleHtml }}
        />
        <p ref={descRef} style={{ fontSize: 13.5, lineHeight: 1.55, color: "rgba(232,238,255,0.7)", maxWidth: 320 }}>
          {META[0].desc}
        </p>
      </div>

      {/* ── Readout (right) ── */}
      <div style={{
        position: "absolute", right: 24, bottom: 130, zIndex: 10,
        textAlign: "right", fontFamily: mono, fontSize: 11,
        letterSpacing: "0.06em", color: "rgba(232,238,255,0.55)",
        pointerEvents: "none", lineHeight: 1.7,
      }}>
        {[
          ["SHADER",  <b key="s" ref={rShaderRef} style={{ color: "#fff", fontWeight: 500 }}>aurora</b>],
          ["MOUSE",   <b key="m" ref={rMouseRef}  style={{ color: "#fff", fontWeight: 500 }}>0.50, 0.50</b>],
          ["FPS",     <b key="f" ref={rFpsRef}    style={{ color: "#fff", fontWeight: 500 }}>—</b>],
          ["CLICKS",  <b key="c" ref={rClicksRef} style={{ color: "#fff", fontWeight: 500 }}>0</b>],
        ].map(([label, val]) => (
          <div key={label} style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <span style={{ opacity: 0.55 }}>{label}</span>{val}
          </div>
        ))}
      </div>

      {/* ── Dock ── */}
      <div style={{
        position: "absolute", left: "50%", bottom: 28, transform: "translateX(-50%)",
        zIndex: 10, display: "flex", gap: 8, padding: 10,
        background: "rgba(11,11,46,0.55)",
        border: "1px solid rgba(232,238,255,0.12)",
        borderRadius: 22,
        backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
      }}>
        {DOCK_ITEMS.map((item, i) => (
          <button
            key={i}
            onClick={() => selectShader(i)}
            aria-label={item.label}
            style={{
              position: "relative", width: 92, height: 64,
              borderRadius: 13, overflow: "hidden", cursor: "pointer",
              background: "#0B0B2E", padding: 0,
              border: current === i
                ? "1px solid #FA5A50"
                : "1px solid rgba(232,238,255,0.1)",
              boxShadow: current === i
                ? "0 0 0 1px #FA5A50, 0 10px 30px rgba(250,90,80,0.35)"
                : "none",
              transition: "transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease",
            }}
            onMouseEnter={e => { if (current !== i) e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; }}
          >
            <span style={{ position: "absolute", inset: 0, background: item.bg }} />
            <span style={{
              position: "absolute", top: 5, left: 7,
              fontFamily: mono, fontSize: 9, color: "rgba(255,255,255,0.75)", letterSpacing: "0.05em",
            }}>0{i + 1}</span>
            <span style={{
              position: "absolute", left: 0, right: 0, bottom: 0,
              padding: "4px 8px 5px",
              fontFamily: mono, fontSize: 9, letterSpacing: "0.12em",
              textTransform: "uppercase", color: "#fff", textAlign: "left",
              background: "linear-gradient(to top, rgba(0,0,30,0.75), rgba(0,0,30,0))",
            }}>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
