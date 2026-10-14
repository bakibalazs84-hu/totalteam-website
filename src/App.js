import { useState, useEffect, useRef } from "react";

/* ── ADATOK ─────────────────────────────────────────── */
const NAV = [
  { label: "Munkáink", href: "#works" },
  { label: "Csapat", href: "#team" },
  { label: "Hírek", href: "#news" },
  { label: "Raktár", href: "#raktar" },
  { label: "Kapcsolat", href: "#contact" },
];

const WORKS = [
  { year: "2026", type: "Film", title: "Az Örökös", role: "Díszlettervező", img: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&q=80", wide: true },
  { year: "2026", type: "Reklám", title: "Dior — Élvonal", role: "Berendező", img: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80", wide: false },
  { year: "2025", type: "Film", title: "Holdfény felett", role: "Látványtervező", img: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=800&q=80", wide: false },
  { year: "2025", type: "Reklám", title: "MOL — Energia", role: "Set design", img: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80", wide: true },
  { year: "2025", type: "Videóklip", title: "ANNA — Visszhang", role: "Art direction", img: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80", wide: false },
  { year: "2024", type: "Videóklip", title: "Márton — Szív", role: "Kellékek", img: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80", wide: false },
];

const TEAM = [
  { name: "Kovács Eszter", role: "Vezető látványtervező", img: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=500&q=80", credits: "120+ produkció" },
  { name: "Nagy Bálint", role: "Art Director", img: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=500&q=80", credits: "Cannes 2023" },
  { name: "Fekete Réka", role: "Berendező", img: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=500&q=80", credits: "Film & Reklám" },
  { name: "Horváth Dávid", role: "Kellékfelelős", img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&q=80", credits: "2500 m² raktár" },
];

const NEWS = [
  { date: "2026. március 11.", tag: "Hírek", title: "Stúdióhelységet bérelünk Budán", excerpt: "1000 m²-es stúdiónk mostantól bérhető filmprodukcióhoz és rendezvényekhez is." },
  { date: "2026. január 22.", tag: "Karrier", title: "Raktáros munkatársat keresünk", excerpt: "Csapatunk bővül — keresünk tapasztalt raktárost a budai telephelyünkre." },
  { date: "2025. május 21.", tag: "Díj", title: "Canadian Screen Awards jelölés", excerpt: "Kollégánkat a Rumours c. filmmel jelölték 'Achievement in Art Direction' kategóriában." },
];

const AWARDS = ["Magyar Filmszemle", "Festival de Cannes", "Epica Awards", "Cannes Corporate", "Emmy Awards", "Nederlands Film Festival"];

const FILTERS = ["Összes", "Film", "Reklám", "Videóklip"];

/* ── HOOK ───────────────────────────────────────────── */
function useInView(ref, threshold = 0.12) {
  const [v, setV] = useState(false);
  useEffect(() => {
    const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) setV(true); }, { threshold });
    if (ref.current) o.observe(ref.current);
    return () => o.disconnect();
  }, []);
  return v;
}

function Reveal({ children, delay = 0, y = 24, className = "", style = {} }) {
  const ref = useRef(null);
  const v = useInView(ref);
  return (
    <div ref={ref} className={className} style={{
      opacity: v ? 1 : 0,
      transform: v ? "translateY(0)" : `translateY(${y}px)`,
      transition: `opacity 0.65s ease ${delay}s, transform 0.65s ease ${delay}s`,
      ...style,
    }}>{children}</div>
  );
}

/* ── KOMPONENSEK ─────────────────────────────────────── */
function WorkCard({ w, i }) {
  const [hov, setHov] = useState(false);
  return (
    <Reveal delay={i * 0.08} style={{ gridColumn: w.wide ? "span 2" : "span 1" }}>
      <div
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{ position: "relative", overflow: "hidden", cursor: "pointer", background: "#E8EBF0", aspectRatio: w.wide ? "16/7" : "4/3" }}
      >
        <img src={w.img} alt={w.title} style={{
          width: "100%", height: "100%", objectFit: "cover", display: "block",
          transform: hov ? "scale(1.04)" : "scale(1)",
          transition: "transform 0.55s ease",
          filter: hov ? "brightness(0.35)" : "brightness(0.9)",
        }} />
        {/* Type badge */}
        <div style={{ position: "absolute", top: 16, left: 16, background: "rgba(255,255,255,0.92)", padding: "4px 10px", fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#1C1C1C", fontWeight: 600 }}>
          {w.type}
        </div>
        {/* Hover info */}
        <div style={{
          position: "absolute", inset: 0, display: "flex", flexDirection: "column",
          justifyContent: "flex-end", padding: 24,
          opacity: hov ? 1 : 0, transition: "opacity 0.35s ease",
        }}>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginBottom: 6, letterSpacing: 1 }}>{w.role} · {w.year}</p>
          <h3 style={{ fontSize: 22, fontFamily: "'DM Serif Display', serif", color: "#fff", margin: 0, lineHeight: 1.2 }}>{w.title}</h3>
        </div>
        {/* Always-visible title bottom */}
        <div style={{
          position: "absolute", bottom: 16, left: 16,
          opacity: hov ? 0 : 1, transition: "opacity 0.3s ease",
        }}>
          <h3 style={{ fontSize: 18, fontFamily: "'DM Serif Display', serif", color: "#fff", margin: 0, textShadow: "0 1px 8px rgba(0,0,0,0.4)" }}>{w.title}</h3>
        </div>
      </div>
    </Reveal>
  );
}

/* ── FŐKOMPONENS ─────────────────────────────────────── */
export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [filter, setFilter] = useState("Összes");
  const [tickerPause, setTickerPause] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const scrollTo = (href) => {
    setMenuOpen(false);
    document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
  };

  const filtered = filter === "Összes" ? WORKS : WORKS.filter(w => w.type === filter);

  return (
    <div style={{ background: "#FFFFFF", color: "#1C1C1C", fontFamily: "'Inter', sans-serif", minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        ::selection { background: #1C1C1C; color: #fff; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: #1C1C1C; }
        a { text-decoration: none; color: inherit; }
        button { font-family: inherit; }
        @keyframes ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        @keyframes fadeUp { from { opacity:0; transform: translateY(20px); } to { opacity:1; transform: translateY(0); } }
        .nav-link { font-size: 12px; letter-spacing: 1.5px; text-transform: uppercase; color: #666; background: none; border: none; cursor: pointer; padding: 4px 0; transition: color 0.2s; }
        .nav-link:hover { color: #1C1C1C; }
        @media (max-width: 768px) {
          .works-grid { grid-template-columns: 1fr !important; }
          .works-grid > * { grid-column: span 1 !important; }
          .team-grid { grid-template-columns: 1fr 1fr !important; }
          .hero-title { font-size: clamp(52px, 14vw, 100px) !important; }
          .hero-subtitle { font-size: 16px !important; }
          .footer-inner { flex-direction: column !important; gap: 32px !important; }
          .contact-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* ── NAV ── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 200,
        height: 60, display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 40px",
        background: scrolled ? "rgba(255,255,255,0.96)" : "transparent",
        backdropFilter: scrolled ? "blur(10px)" : "none",
        borderBottom: scrolled ? "1px solid #E8EBF0" : "none",
        transition: "all 0.3s ease",
      }}>
        <button onClick={() => scrollTo("#hero")} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "'DM Serif Display', serif", fontSize: 20, color: "#1C1C1C", letterSpacing: 1 }}>
          Total Team
        </button>
        <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
          {NAV.map(l => <button key={l.label} className="nav-link" onClick={() => scrollTo(l.href)}>{l.label}</button>)}
        </div>
        {/* Burger */}
        <button onClick={() => setMenuOpen(o => !o)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", gap: 5 }}>
          {[0,1,2].map(i => (
            <span key={i} style={{
              display: "block", width: 22, height: 1.5, background: "#1C1C1C", transition: "all 0.3s",
              transform: menuOpen ? (i===0 ? "rotate(45deg) translate(4.5px,4.5px)" : i===2 ? "rotate(-45deg) translate(4px,-4px)" : "scaleX(0)") : "none",
              opacity: menuOpen && i===1 ? 0 : 1,
            }} />
          ))}
        </button>
      </nav>

      {/* Mobile menu */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 190, background: "#fff",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 40,
        opacity: menuOpen ? 1 : 0, pointerEvents: menuOpen ? "all" : "none",
        transition: "opacity 0.3s",
      }}>
        {NAV.map(l => (
          <button key={l.label} onClick={() => scrollTo(l.href)} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "'DM Serif Display', serif", fontSize: 36, color: "#1C1C1C" }}>
            {l.label}
          </button>
        ))}
      </div>

      {/* ── HERO ── */}
      <section id="hero" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "0 40px 72px", background: "#F5F4F2", position: "relative", overflow: "hidden" }}>
        {/* Deco line */}
        <div style={{ position: "absolute", top: 0, right: "12%", width: 1, height: "45%", background: "linear-gradient(to bottom, transparent, #D0D3D8)" }} />

        <div style={{ maxWidth: 1100, animation: "fadeUp 0.9s ease both" }}>
          <p style={{ fontSize: 11, letterSpacing: 4, textTransform: "uppercase", color: "#999", marginBottom: 28 }}>
            Budapest · Látványtervezés · Díszlet · Kellékek
          </p>
          <h1 className="hero-title" style={{ fontFamily: "'DM Serif Display', serif", fontSize: "clamp(64px, 10vw, 130px)", lineHeight: 0.95, color: "#1C1C1C", marginBottom: 20, maxWidth: 900 }}>
            Világokat<br /><span style={{ fontStyle: "italic", color: "#555" }}>teremtünk.</span>
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 20, margin: "36px 0" }}>
            <div style={{ width: 48, height: 1, background: "#1C1C1C" }} />
            <p className="hero-subtitle" style={{ fontSize: 17, color: "#666", fontWeight: 300, lineHeight: 1.6, maxWidth: 460 }}>
              Díjnyertes produkciós csapat filmekhez, reklámokhoz és videóklipekhez — 2500 m² raktárral és 15 év tapasztalattal.
            </p>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button onClick={() => scrollTo("#works")} style={{ background: "#1C1C1C", color: "#fff", border: "none", padding: "13px 28px", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", cursor: "pointer", transition: "background 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.background = "#333"}
              onMouseLeave={e => e.currentTarget.style.background = "#1C1C1C"}
            >Munkáink</button>
            <button onClick={() => scrollTo("#contact")} style={{ background: "transparent", color: "#1C1C1C", border: "1px solid #C0C4CC", padding: "13px 28px", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", cursor: "pointer", transition: "border-color 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "#1C1C1C"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "#C0C4CC"}
            >Kapcsolat</button>
          </div>
        </div>

        <div style={{ position: "absolute", bottom: 32, right: 40, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 10, letterSpacing: 3, color: "#aaa", textTransform: "uppercase", writingMode: "vertical-rl" }}>Scroll</span>
          <div style={{ width: 1, height: 40, background: "linear-gradient(to bottom, #aaa, transparent)" }} />
        </div>
      </section>

      {/* ── AWARDS TICKER ── */}
      <div style={{ borderTop: "1px solid #E8EBF0", borderBottom: "1px solid #E8EBF0", overflow: "hidden", padding: "14px 0" }}
        onMouseEnter={() => setTickerPause(true)}
        onMouseLeave={() => setTickerPause(false)}
      >
        <div style={{ display: "flex", gap: 64, whiteSpace: "nowrap", animation: `ticker 18s linear infinite`, animationPlayState: tickerPause ? "paused" : "running" }}>
          {[...AWARDS, ...AWARDS].map((a, i) => (
            <span key={i} style={{ fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: "#999", display: "inline-flex", alignItems: "center", gap: 16 }}>
              <span style={{ fontSize: 6, color: "#C0C4CC" }}>◆</span>{a}
            </span>
          ))}
        </div>
      </div>

      {/* ── INTRO QUOTE ── */}
      <section style={{ padding: "80px 40px", maxWidth: 960, margin: "0 auto" }}>
        <Reveal>
          <blockquote style={{ borderLeft: "2px solid #1C1C1C", paddingLeft: 32 }}>
            <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: "clamp(20px, 2.5vw, 28px)", lineHeight: 1.55, color: "#1C1C1C", fontStyle: "italic", marginBottom: 20 }}>
              "A Total Team csapata díjnyertes díszleteket, szetteket és dekorációkat készít a mozgóképipar minden területére – legyen szó reklámról, filmről vagy videóklipről. Kreatív látásmóddal, tehetséges emberekkel és egy 2500 m²-es raktárral."
            </p>
            <cite style={{ fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: "#999", fontStyle: "normal" }}>Total Team — Budapest</cite>
          </blockquote>
        </Reveal>
      </section>

      {/* ── WORKS ── */}
      <section id="works" style={{ padding: "80px 40px", background: "#F5F4F2" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <Reveal>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 40, flexWrap: "wrap", gap: 20 }}>
              <div>
                <p style={{ fontSize: 11, letterSpacing: 4, textTransform: "uppercase", color: "#999", marginBottom: 10 }}>Portfólió</p>
                <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "clamp(36px, 5vw, 56px)", lineHeight: 1 }}>Munkáink</h2>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {FILTERS.map(f => (
                  <button key={f} onClick={() => setFilter(f)} style={{
                    background: filter === f ? "#1C1C1C" : "transparent",
                    color: filter === f ? "#fff" : "#999",
                    border: `1px solid ${filter === f ? "#1C1C1C" : "#D0D3D8"}`,
                    padding: "7px 16px", fontSize: 11, letterSpacing: 2, textTransform: "uppercase",
                    cursor: "pointer", transition: "all 0.2s",
                  }}>{f}</button>
                ))}
              </div>
            </div>
          </Reveal>

          <div className="works-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 3 }}>
            {filtered.map((w, i) => <WorkCard key={w.title + i} w={w} i={i} />)}
          </div>

          <Reveal delay={0.2}>
            <div style={{ textAlign: "center", marginTop: 40 }}>
              <button style={{ background: "none", border: "1px solid #C0C4CC", padding: "12px 32px", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", cursor: "pointer", color: "#1C1C1C", transition: "border-color 0.2s" }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "#1C1C1C"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "#C0C4CC"}
              >Összes munka megtekintése</button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── TEAM ── */}
      <section id="team" style={{ padding: "100px 40px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Reveal>
            <p style={{ fontSize: 11, letterSpacing: 4, textTransform: "uppercase", color: "#999", marginBottom: 10 }}>Kik vagyunk</p>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "clamp(36px, 5vw, 56px)", marginBottom: 56 }}>Csapat</h2>
          </Reveal>
          <div className="team-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 28 }}>
            {TEAM.map((m, i) => (
              <Reveal key={m.name} delay={i * 0.1}>
                <div>
                  <div style={{ aspectRatio: "3/4", overflow: "hidden", marginBottom: 14, background: "#E8EBF0" }}>
                    <img src={m.img} alt={m.name} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "grayscale(20%)", transition: "filter 0.4s, transform 0.4s" }}
                      onMouseEnter={e => { e.target.style.filter = "grayscale(0%)"; e.target.style.transform = "scale(1.03)"; }}
                      onMouseLeave={e => { e.target.style.filter = "grayscale(20%)"; e.target.style.transform = "scale(1)"; }}
                    />
                  </div>
                  <h4 style={{ fontSize: 15, fontWeight: 600, marginBottom: 3 }}>{m.name}</h4>
                  <p style={{ fontSize: 12, color: "#888", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>{m.role}</p>
                  <p style={{ fontSize: 11, color: "#bbb" }}>{m.credits}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── NEWS ── */}
      <section id="news" style={{ padding: "100px 40px", background: "#F5F4F2", borderTop: "1px solid #E8EBF0" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Reveal>
            <p style={{ fontSize: 11, letterSpacing: 4, textTransform: "uppercase", color: "#999", marginBottom: 10 }}>Friss</p>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "clamp(36px, 5vw, 56px)", marginBottom: 48 }}>Hírek</h2>
          </Reveal>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {NEWS.map((n, i) => (
              <Reveal key={n.title} delay={i * 0.1}>
                <div style={{ borderTop: "1px solid #E0E3E8", padding: "28px 0", display: "grid", gridTemplateColumns: "160px 1fr auto", gap: 24, alignItems: "start", cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.querySelector(".news-title").style.color = "#555"}
                  onMouseLeave={e => e.currentTarget.querySelector(".news-title").style.color = "#1C1C1C"}
                >
                  <div>
                    <span style={{ fontSize: 11, background: "#E8EBF0", padding: "3px 8px", letterSpacing: 1, textTransform: "uppercase", color: "#666" }}>{n.tag}</span>
                    <p style={{ fontSize: 12, color: "#bbb", marginTop: 8 }}>{n.date}</p>
                  </div>
                  <div>
                    <h3 className="news-title" style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, marginBottom: 8, transition: "color 0.2s" }}>{n.title}</h3>
                    <p style={{ fontSize: 14, color: "#888", lineHeight: 1.6 }}>{n.excerpt}</p>
                  </div>
                  <span style={{ fontSize: 20, color: "#C0C4CC", marginTop: 2 }}>→</span>
                </div>
              </Reveal>
            ))}
            <div style={{ borderTop: "1px solid #E0E3E8" }} />
          </div>
        </div>
      </section>

      {/* ── RAKTÁR ── */}
      <section id="raktar" style={{ padding: "100px 40px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, maxWidth: "100%" }}>
        <div style={{ background: "#1C1C1C", padding: "64px 56px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <Reveal>
            <p style={{ fontSize: 11, letterSpacing: 4, textTransform: "uppercase", color: "#888", marginBottom: 16 }}>Kellékbérlés</p>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "clamp(32px, 4vw, 48px)", color: "#fff", marginBottom: 24, lineHeight: 1.2 }}>
              Raktár &<br /><span style={{ fontStyle: "italic", color: "#aaa" }}>Kellékek</span>
            </h2>
            <p style={{ fontSize: 15, color: "#888", lineHeight: 1.8, marginBottom: 36, maxWidth: 380 }}>
              2500 m²-es kellék- és bútortárunk elérhető minden produkció és rendezvény számára. Online katalógusunkban böngészhetsz és regisztráció után foglalhatsz is.
            </p>
            <div style={{ display: "flex", gap: 28, marginBottom: 36 }}>
              {[["2500 m²", "raktárterület"], ["5000+", "kellék"], ["1 nap", "kiszállítás"]].map(([n, l]) => (
                <div key={l}>
                  <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28, color: "#fff" }}>{n}</div>
                  <div style={{ fontSize: 11, color: "#666", letterSpacing: 2, textTransform: "uppercase", marginTop: 4 }}>{l}</div>
                </div>
              ))}
            </div>
            <button style={{ background: "#fff", color: "#1C1C1C", border: "none", padding: "13px 28px", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", cursor: "pointer", alignSelf: "flex-start", transition: "background 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.background = "#E8EBF0"}
              onMouseLeave={e => e.currentTarget.style.background = "#fff"}
            >Katalógus megnyitása</button>
          </Reveal>
        </div>
        <div style={{ overflow: "hidden", minHeight: 480 }}>
          <img src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=900&q=80" alt="Raktár" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        </div>
      </section>

      {/* ── CONTACT ── */}
      <section id="contact" style={{ padding: "100px 40px", background: "#F5F4F2", borderTop: "1px solid #E8EBF0" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Reveal>
            <p style={{ fontSize: 11, letterSpacing: 4, textTransform: "uppercase", color: "#999", marginBottom: 10 }}>Dolgozzunk együtt</p>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "clamp(36px, 5vw, 64px)", marginBottom: 56 }}>Kapcsolat</h2>
          </Reveal>
          <div className="contact-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64 }}>
            <Reveal>
              <div>
                <p style={{ fontSize: 15, color: "#777", lineHeight: 1.8, marginBottom: 40 }}>
                  Legyen szó filmprodukcióról, reklámforgatásról vagy egyedi kreatív projektről — keresse csapatunkat. Szívesen meghallgatjuk elképzeléseit.
                </p>
                {[
                  { l: "Iroda", v: "info@totalteam.hu" },
                  { l: "Raktár", v: "raktar@totalteam.hu" },
                  { l: "Telefon", v: "+36 30 869 2454" },
                  { l: "Cím", v: "1037 Budapest, Csillaghegyi út 24/B" },
                  { l: "Nyitva", v: "H–P: 08:00–16:00" },
                ].map(c => (
                  <div key={c.l} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #E0E3E8", padding: "14px 0" }}>
                    <span style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#bbb" }}>{c.l}</span>
                    <span style={{ fontSize: 14, color: "#1C1C1C" }}>{c.v}</span>
                  </div>
                ))}
              </div>
            </Reveal>
            <Reveal delay={0.15}>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {[["Neve", "text"], ["Email", "email"], ["Telefon", "tel"]].map(([label, type]) => (
                  <div key={label}>
                    <label style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#aaa", display: "block", marginBottom: 8 }}>{label}</label>
                    <input type={type} style={{ width: "100%", background: "#fff", border: "1px solid #E0E3E8", padding: "12px 14px", fontSize: 14, color: "#1C1C1C", fontFamily: "'Inter', sans-serif", outline: "none", transition: "border-color 0.2s" }}
                      onFocus={e => e.target.style.borderColor = "#1C1C1C"}
                      onBlur={e => e.target.style.borderColor = "#E0E3E8"}
                    />
                  </div>
                ))}
                <div>
                  <label style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#aaa", display: "block", marginBottom: 8 }}>Üzenet</label>
                  <textarea rows={4} style={{ width: "100%", background: "#fff", border: "1px solid #E0E3E8", padding: "12px 14px", fontSize: 14, color: "#1C1C1C", fontFamily: "'Inter', sans-serif", outline: "none", resize: "vertical", transition: "border-color 0.2s" }}
                    onFocus={e => e.target.style.borderColor = "#1C1C1C"}
                    onBlur={e => e.target.style.borderColor = "#E0E3E8"}
                  />
                </div>
                <button style={{ background: "#1C1C1C", color: "#fff", border: "none", padding: "14px", fontSize: 12, letterSpacing: 3, textTransform: "uppercase", cursor: "pointer", fontFamily: "'Inter', sans-serif", transition: "background 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#333"}
                  onMouseLeave={e => e.currentTarget.style.background = "#1C1C1C"}
                >Üzenet küldése</button>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ padding: "36px 40px", borderTop: "1px solid #E8EBF0" }}>
        <div className="footer-inner" style={{ maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: "#1C1C1C" }}>Total Team</span>
          <div style={{ display: "flex", gap: 24 }}>
            {["Instagram", "Facebook", "YouTube", "LinkedIn"].map(s => (
              <a key={s} href="#" style={{ fontSize: 11, color: "#bbb", letterSpacing: 1.5, textTransform: "uppercase", transition: "color 0.2s" }}
                onMouseEnter={e => e.target.style.color = "#1C1C1C"}
                onMouseLeave={e => e.target.style.color = "#bbb"}
              >{s}</a>
            ))}
          </div>
          <p style={{ fontSize: 11, color: "#ccc" }}>© 2026 Total Team · totalteam.hu</p>
        </div>
      </footer>
    </div>
  );
}
