import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Truck,
  Package,
  ScanLine,
  BarChart3,
  FileDown,
  Search,
  Shield,
  Zap,
  ArrowRight,
  TrendingUp,
  Globe
} from "lucide-react";
import { cn } from "@/lib/utils";

const HERO_CARD_IMAGES = ["hero-1.jpeg", "hero-2.jpeg", "hero-3.jpeg", "hero-4.jpeg", "hero-5.jpeg"];
const HERO_SLIDE_INTERVAL_MS = 5000;

export default function Portfolio() {
  const [scrolled, setScrolled] = useState(false);
  const [heroIndex, setHeroIndex] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setHeroIndex((i) => (i + 1) % HERO_CARD_IMAGES.length);
    }, HERO_SLIDE_INTERVAL_MS);
    return () => clearInterval(t);
  }, []);

  const features = [
    {
      icon: ScanLine,
      title: "E-Way Bill Scanning",
      description: "Automated OCR extraction using advanced AI-powered image processing.",
      color: "from-blue-500 to-cyan-400"
    },
    {
      icon: Package,
      title: "Shipment Control",
      description: "End-to-end lifecycle management from booking to last-mile delivery.",
      color: "from-indigo-500 to-purple-400"
    },
    {
      icon: BarChart3,
      title: "Neural Analytics",
      description: "Deep insights into logistics performance and trend prediction.",
      color: "from-purple-500 to-pink-400"
    },
    {
      icon: FileDown,
      title: "Enterprise Export",
      description: "Seamless data migration and reporting in multiple industrial formats.",
      color: "from-pink-500 to-rose-400"
    },
    {
      icon: Search,
      title: "Real-time Radar",
      description: "Hyperscale tracking with sub-second status updates.",
      color: "from-orange-500 to-amber-400"
    },
    {
      icon: Shield,
      title: "Fortified Security",
      description: "Enterprise-grade RBAC with multi-layered authentication.",
      color: "from-emerald-500 to-teal-400"
    }
  ];

  return (
    <div className="min-h-screen bg-[#020202] text-white selection:bg-primary/30">
      {/* Dynamic Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Modern Navbar */}
      <nav className={cn(
        "fixed top-0 left-0 right-0 z-[100] transition-all duration-500",
        scrolled ? "bg-black/60 backdrop-blur-xl border-b border-white/10 py-4" : "bg-transparent py-8"
      )}>
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <div className="flex items-center justify-between">
            <Link to="/portfolio" className="flex items-center gap-3 group">
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 rounded-2xl shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform duration-300">
                <Truck className="w-6 rotate-[-10deg] h-6 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-black tracking-tighter text-white uppercase italic">SBDT</span>
                <span className="text-[8px] font-bold text-slate-500 tracking-[0.3em] uppercase">Logistics</span>
              </div>
            </Link>

            <div className="hidden md:flex items-center gap-10">
              {['Features', 'Solutions', 'Company'].map(item => (
                <a
                  key={item}
                  href={`#${item.toLowerCase()}`}
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById(item.toLowerCase())?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="text-sm font-bold text-slate-400 hover:text-white transition-colors relative group"
                >
                  {item}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
                </a>
              ))}
            </div>

            <div className="flex items-center gap-4">
              <Link to="/login" className="text-sm font-bold text-slate-300 hover:text-white transition-colors">Log In</Link>
              <Link
                to="/login"
                className="px-6 py-3 btn-premium text-white rounded-xl shadow-lg shadow-primary/20 transition-all font-black text-xs uppercase tracking-widest active:scale-95"
              >
                Launch App
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Premium Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-ping" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">India's Next-Gen Logistics OS</span>
              </div>

              <h1 className="text-6xl lg:text-8xl font-black leading-[0.9] tracking-tighter text-white italic">
                MOVE AT THE <br />
                <span className="text-gradient">SPEED OF LIGHT.</span>
              </h1>

              <p className="text-xl text-slate-400 leading-relaxed max-w-xl font-medium">
                The ultimate cloud operating system for logistics. Automate document extraction,
                track assets in real-time, and scale your operations without friction.
              </p>

              <div className="flex flex-col sm:flex-row gap-5">
                <Link
                  to="/login"
                  className="px-10 py-5 bg-white text-black rounded-2xl hover:bg-slate-100 transition-all font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 group shadow-2xl shadow-white/10"
                >
                  Start Scanning Free
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <button
                  type="button"
                  onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                  className="px-10 py-5 bg-white/5 text-white border border-white/10 rounded-2xl hover:bg-white/10 hover:border-white/20 transition-all font-black text-sm uppercase tracking-widest backdrop-blur-sm"
                >
                  Watch Demo
                </button>
              </div>

              <div className="flex items-center gap-6 pt-6 border-t border-white/5">
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="w-10 h-10 rounded-full border-2 border-[#020202] bg-slate-800 flex items-center justify-center overflow-hidden">
                      <img src={`https://i.pravatar.cc/100?u=${i}`} alt="" />
                    </div>
                  ))}
                </div>
                <div className="text-sm">
                  <span className="font-black text-white">5,000+</span>
                  <span className="text-slate-500 ml-1 font-medium">companies trust SBDT</span>
                </div>
              </div>
            </div>

            <div className="relative group lg:block hidden">
              <div className="absolute inset-0 bg-indigo-500/20 blur-[120px] rounded-full animate-float" />
              <div className="relative z-10 glass-card p-4 rounded-[2.5rem] border-white/10 rotate-3 group-hover:rotate-0 transition-transform duration-700">
                <div className="rounded-[2rem] overflow-hidden aspect-video shadow-2xl relative">
                  {HERO_CARD_IMAGES.map((img, i) => (
                    <img
                      key={img}
                      src={`/images/hero/${img}`}
                      alt=""
                      className={cn(
                        "absolute inset-0 w-full h-full object-cover grayscale-[0.2] brightness-75 group-hover:grayscale-0 group-hover:brightness-100 transition-all duration-700",
                        i === heroIndex ? "opacity-100 z-[1]" : "opacity-0 z-0 pointer-events-none"
                      )}
                      style={{ transition: "opacity 0.8s ease-in-out" }}
                    />
                  ))}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-8 z-[2] pointer-events-none">
                    <div className="space-y-1">
                      <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Platform Preview</span>
                      <p className="text-white font-bold tracking-tight">Real-time Command & Control Center</p>
                    </div>
                  </div>
                  {/* Dot indicators */}
                  <div className="absolute bottom-14 left-8 z-[3] flex gap-1.5">
                    {HERO_CARD_IMAGES.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setHeroIndex(i)}
                        className={cn(
                          "h-1 rounded-full transition-all duration-300",
                          i === heroIndex ? "w-6 bg-indigo-400" : "w-1 bg-white/30 hover:bg-white/50"
                        )}
                        aria-label={`Slide ${i + 1}`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Floating elements */}
              <div className="absolute -top-10 -right-10 glass-card p-6 rounded-3xl border-white/10 animate-float shadow-2xl" style={{ animationDelay: '1s' }}>
                <TrendingUp className="w-8 h-8 text-emerald-400" />
                <div className="mt-2 text-xl font-black">+85%</div>
                <div className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Efficiency</div>
              </div>

              <div className="absolute -bottom-5 -left-10 glass-card p-6 rounded-3xl border-white/10 animate-float shadow-2xl" style={{ animationDelay: '2s' }}>
                <Zap className="w-8 h-8 text-amber-400" />
                <div className="mt-2 text-xl font-black">25ms</div>
                <div className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">OCR Latency</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="max-w-7xl mx-auto px-6 lg:px-12 py-16 relative">
        <div className="text-center mb-10 space-y-2">
          <span className="text-[10px] font-black text-primary uppercase tracking-[0.4em]">Engineered for Growth</span>
          <h2 className="text-3xl lg:text-4xl font-black tracking-tighter italic">BEYOND <span className="text-gradient">LOGISTICS.</span></h2>
          <p className="text-sm text-slate-500 max-w-xl mx-auto font-medium">
            We've distilled complexity into a beautiful, high-performance interface.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature, index) => (
            <div
              key={index}
              className="glass-card group p-6 rounded-2xl border-white/5 hover:border-white/20 transition-all duration-500 relative overflow-hidden bg-slate-900/60 backdrop-blur-sm"
            >
              <div className={cn("absolute top-0 right-0 w-24 h-24 bg-gradient-to-br blur-[40px] opacity-0 group-hover:opacity-20 transition-opacity duration-500", feature.color)} />

              <div className={cn("inline-flex p-3 rounded-xl bg-gradient-to-br mb-4 shadow-lg", feature.color)}>
                <feature.icon className="w-5 h-5 text-white" />
              </div>

              <h3 className="text-xl font-black mb-2 text-white tracking-tight group-hover:translate-x-1 transition-transform">
                {feature.title}
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed font-medium group-hover:text-slate-400 transition-colors">
                {feature.description}
              </p>

              <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-400">Deep Dive</span>
                <MoveRight className="w-4 h-4 text-indigo-400" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Big Statement Section */}
      <section id="solutions" className="bg-indigo-50 text-black py-24 lg:py-32 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-100/80 to-slate-100/80 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />
        <div className="max-w-7xl mx-auto px-6 lg:px-12 relative z-10">
          <div className="flex flex-col items-center text-center space-y-10 pb-6">
            <div className="rounded-2xl bg-indigo-500/10 p-6">
              <Globe className="w-16 h-16 lg:w-20 lg:h-20 text-indigo-600" aria-hidden />
            </div>
            <h2 className="text-4xl lg:text-6xl font-black tracking-tight leading-tight italic uppercase">
              Built for India.
              <br />
              <span className="text-indigo-600">Moving on time.</span>
            </h2>
            <p className="text-lg font-bold max-w-2xl leading-relaxed text-slate-700">
              SBDT is more than just tracking. It's the nervous system for your entire supply chain.
            </p>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="max-w-7xl mx-auto px-6 lg:px-12 py-32">
        <div className="relative rounded-[3rem] overflow-hidden p-16 lg:p-24 text-center border border-white/10 group">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 via-purple-900/40 to-black/40 z-0" />
          <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle_at_center,#a855f715_0%,transparent_50%)] animate-pulse" />

          <div className="relative z-10 space-y-8">
            <h2 className="text-3xl lg:text-5xl font-black tracking-tighter text-white italic">
              THE FUTURE IS <br />
              <span className="text-gradient">WAITING FOR YOU.</span>
            </h2>
            <p className="text-base text-slate-400 max-w-xl mx-auto font-medium">
              Join the elite logistics networks already optimized with SBDT Logistics.
              Zero setup desk fees. Pay as you scale.
            </p>
            <div className="flex justify-center">
              <Link
                to="/login"
                className="px-12 py-6 bg-white text-black rounded-2xl hover:scale-105 hover:shadow-[0_0_50px_rgba(255,255,255,0.2)] transition-all font-black text-lg uppercase tracking-widest flex items-center gap-4 group"
              >
                Launch Your Empire
                <Zap className="w-6 h-6 fill-black" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Black Minimalism Footer */}
      <footer id="company" className="border-t border-white/5 py-24 bg-black">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-16">
            <div className="space-y-6 col-span-2">
              <div className="flex items-center gap-3">
                <div className="bg-white p-2 rounded-xl">
                  <Truck className="w-6 h-6 text-black" />
                </div>
                <span className="text-2xl font-black tracking-tighter uppercase italic">SBDT</span>
              </div>
              <p className="text-slate-500 max-w-xs font-semibold uppercase text-[10px] tracking-widest leading-loose">
                Engineering the backbone of Indian commerce. Built with precision in Bangalore for the world.
              </p>
            </div>

            <div className="space-y-8">
              <h5 className="text-[10px] font-black uppercase tracking-[0.4em] text-white">Platform</h5>
              <ul className="space-y-4">
                {['Dashboard', 'Neural Analytics', 'OCR Engine', 'Global Radar'].map(item => (
                  <li key={item}><a href="#" className="text-slate-500 hover:text-white transition-colors text-sm font-bold">{item}</a></li>
                ))}
              </ul>
            </div>

            <div className="space-y-8">
              <h5 className="text-[10px] font-black uppercase tracking-[0.4em] text-white">Legal</h5>
              <ul className="space-y-4">
                <li>
                  <Link to="/terms" className="text-slate-500 hover:text-white transition-colors text-sm font-bold">
                    Terms & Conditions
                  </Link>
                </li>
                <li>
                  <Link to="/privacy" className="text-slate-500 hover:text-white transition-colors text-sm font-bold">
                    Privacy Policy
                  </Link>
                </li>
              </ul>
            </div>

            <div className="space-y-8">
              <h5 className="text-[10px] font-black uppercase tracking-[0.4em] text-white">Contact</h5>
<ul className="space-y-4">
                <li><a href="mailto:sbdt.transport@gmail.com" className="text-slate-500 hover:text-white transition-colors text-sm font-bold">Support</a></li>
                <li><a href="#" className="text-slate-500 hover:text-white transition-colors text-sm font-bold">API Docs</a></li>
                <li><a href="#" className="text-slate-500 hover:text-white transition-colors text-sm font-bold">Status</a></li>
                <li><a href="#" className="text-slate-500 hover:text-white transition-colors text-sm font-bold">Security</a></li>
              </ul>
            </div>
          </div>

          <div className="mt-24 pt-12 border-t border-white/5 flex justify-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">© 2026 SBDT LOGISTICS. ALL RIGHTS RESERVED.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

const MoveRight = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
  </svg>
);
