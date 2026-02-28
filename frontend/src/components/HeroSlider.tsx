
import { useState, useEffect, useRef } from "react";
import { MoveRight } from "lucide-react";

const HERO_SLIDE_INTERVAL_MS = 6000;
const HERO_IMAGES = ["hero-1.jpeg", "hero-2.jpeg", "hero-3.jpeg", "hero-4.jpeg", "hero-5.jpeg"];

export default function HeroSlider() {
  const [heroIndex, setHeroIndex] = useState(0);
  const heroIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    heroIntervalRef.current = setInterval(() => {
      setHeroIndex((i) => (i + 1) % HERO_IMAGES.length);
    }, HERO_SLIDE_INTERVAL_MS);
    return () => {
      if (heroIntervalRef.current) clearInterval(heroIntervalRef.current);
    };
  }, []);

  return (
    <div
      className="hero-slider-manager relative w-full overflow-hidden rounded-2xl border border-slate-300 shadow-lg"
      style={{
        height: "220px",
        minHeight: "220px",
        backgroundColor: "#0f172a",
        backgroundImage: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, rgba(20, 83, 75, 0.3) 100%)",
      }}
    >
      {/* Background Images (optional; fallback above ensures visibility) */}
      {HERO_IMAGES.map((img, i) => (
        <div
          key={img}
          className="absolute inset-0 transition-all duration-1000 ease-in-out pointer-events-none"
          style={{
            opacity: i === heroIndex ? 1 : 0,
            scale: i === heroIndex ? "1" : "1.05",
            zIndex: 1,
          }}
        >
          <img
            src={`/images/hero/${img}`}
            alt=""
            className="w-full h-full object-cover"
            style={{ filter: "brightness(0.5) contrast(1.05)" }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
      ))}

      {/* Solid dark overlay so text is always readable */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 2,
          background: "linear-gradient(to right, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.5) 50%, transparent 100%)",
        }}
      />

      {/* Hero content */}
      <div
        className="absolute inset-0 flex flex-col justify-center px-8 sm:px-12 pointer-events-none"
        style={{ zIndex: 10 }}
      >
        <div className="max-w-xl space-y-3">
          <div
            className="hero-slider-badge inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
            style={{ color: "#f8fafc", border: "1px solid rgba(20, 184, 166, 0.5)", backgroundColor: "rgba(20, 184, 166, 0.2)" }}
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: "#14b8a6" }} />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ backgroundColor: "#14b8a6" }} />
            </span>
            Real-time Logistics Sync
          </div>
          <h2 className="text-2xl sm:text-4xl font-bold leading-tight tracking-tight" style={{ color: "#ffffff" }}>
            Smart Logistics <span className="hero-slider-teal" style={{ color: "#2dd4bf", fontWeight: 800 }}>Redefined.</span>
          </h2>
          <p className="hero-slider-desc text-sm max-w-md leading-relaxed" style={{ color: "#e2e8f0" }}>
            SBDT Logistics — efficient clearance and fast transit across India.
          </p>
          <div className="pt-1 flex items-center gap-3 pointer-events-auto">
            <span
              className="px-5 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-2 shadow"
              style={{ backgroundColor: "#0d9488", color: "#f0fdfa" }}
            >
              Explore Services <MoveRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </div>

      {/* Dot indicators */}
      <div className="absolute bottom-6 left-10 flex gap-2 pointer-events-auto" style={{ zIndex: 20 }}>
        {HERO_IMAGES.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setHeroIndex(i)}
            className="h-1.5 rounded-full transition-all duration-500"
            style={{
              width: i === heroIndex ? "2.5rem" : "6px",
              backgroundColor: i === heroIndex ? "#14b8a6" : "rgba(255,255,255,0.3)",
            }}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
