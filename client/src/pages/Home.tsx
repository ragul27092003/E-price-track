import { useEffect, useRef, useState, type MouseEvent } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useMotionValue,
  useSpring,
  useInView,
  AnimatePresence,
} from "framer-motion";
import {
  ArrowRight,
  Play,
  Check,
  Sparkles,
  LineChart,
  Bell,
  Globe2,
  Bot,
  Layers,
  Zap,
  ShieldCheck,
  Boxes,
  BarChart3,
  Cpu,
  ChevronDown,
  Star,
  ArrowUpRight,
  TrendingUp,
  Search,
  Target,
  Rocket,
  Database,
} from "lucide-react";
import { Link } from "react-router-dom";
import "../styles/landing.css";
import Logo from "/src/services/assets/main-logo.png";
import { ROUTE } from "../utils/urls";

const NAV_LINKS = [
  { label: "Product", href: "#product" },
  { label: "Solutions", href: "#solutions" },
  { label: "Customers", href: "#customers" },
  { label: "Docs", href: "#docs" },
] as const;

function scrollToHash(hash: string) {
  if (hash === "#" || hash === "#top") {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  const id = hash.replace("#", "");
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

/* ------------------------------------------------------------------ */
/* NAV                                                                 */
/* ------------------------------------------------------------------ */
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 20);
    on();
    window.addEventListener("scroll", on);
    return () => window.removeEventListener("scroll", on);
  }, []);

  const onNavClick = (e: MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    scrollToHash(href);
    window.history.replaceState(null, "", href === "#top" ? window.location.pathname : href);
  };

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
        scrolled ? "py-3" : "py-5"
      }`}
    >
      <div className="mx-auto max-w-7xl px-6">
        <div
          className={`flex items-center justify-between rounded-2xl px-5 py-3 transition-all duration-500 ${
            scrolled ? "glass" : "bg-transparent"
          }`}
        >
          <a
            href="#top"
            onClick={(e) => onNavClick(e, "#top")}
            className="flex items-center gap-3"
          >
            <img
              src={Logo}
              alt="ePriceTrack"
              className="h-8 w-auto object-contain"
            />
          </a>
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            {NAV_LINKS.map((l) => (
              <a
                key={l.label}
                href={l.href}
                onClick={(e) => onNavClick(e, l.href)}
                className="hover:text-foreground transition-colors"
              >
                {l.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link
              to={ROUTE.login}
              className="inline-flex items-center gap-1.5 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium px-4 py-2 hover:opacity-90 transition"
            >
              Sign in <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* HERO                                                                */
/* ------------------------------------------------------------------ */
function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 60, damping: 20 });
  const sy = useSpring(my, { stiffness: 60, damping: 20 });

  useEffect(() => {
    const on = (e: MouseEvent) => {
      const r = ref.current?.getBoundingClientRect();
      if (!r) return;
      mx.set(((e.clientX - r.left) / r.width - 0.5) * 30);
      my.set(((e.clientY - r.top) / r.height - 0.5) * 30);
    };
    window.addEventListener("mousemove", on);
    return () => window.removeEventListener("mousemove", on);
  }, [mx, my]);

  return (
    <section ref={ref} id="top" className="relative scroll-mt-28 pt-40 pb-32 overflow-hidden">
      {/* background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 grid-bg" />
        <motion.div
          style={{ x: sx, y: sy }}
          className="absolute inset-0 opacity-80"
        >
          <div className="absolute -top-32 -left-24 h-[500px] w-[500px] rounded-full bg-primary/30 blur-3xl" />
          <div className="absolute top-20 right-0 h-[600px] w-[600px] rounded-full bg-accent/40 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-[420px] w-[420px] rounded-full bg-success/25 blur-3xl" />
        </motion.div>
        {/* particles */}
        {Array.from({ length: 22 }).map((_, i) => {
          const r1 = ((i * 9301 + 49297) % 233280) / 233280;
          const r2 = ((i * 15731 + 789221) % 233280) / 233280;
          const r3 = ((i * 22571 + 3571) % 233280) / 233280;
          const r4 = ((i * 12345 + 6789) % 233280) / 233280;
          return (
            <motion.span
              key={i}
              initial={{ opacity: 0 }}
              animate={{
                opacity: [0, 1, 0],
                y: [0, -40 - r1 * 60],
                x: [0, (r2 - 0.5) * 40],
              }}
              transition={{ duration: 6 + r3 * 4, repeat: Infinity, delay: i * 0.3 }}
              className="absolute h-1 w-1 rounded-full bg-primary/60"
              style={{
                left: `${r4 * 100}%`,
                top: `${20 + r1 * 70}%`,
              }}
            />
          );
        })}
      </div>

      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-4xl text-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs font-medium text-secondary">
            <span className="relative flex h-2 w-2">
              <span className="absolute inset-0 rounded-full bg-success animate-ping" />
              <span className="relative h-2 w-2 rounded-full bg-success" />
            </span>
            Real-time pricing intelligence · v4.0
          </div>

          <h1 className="mt-8 text-5xl md:text-7xl lg:text-8xl font-display font-medium leading-[0.95] tracking-tight text-secondary">
            Monitor Competitor <br />
            <span className="italic text-gradient">Prices.</span>{" "}
            <span className="whitespace-nowrap">Win Every Market.</span>
          </h1>

          <p className="mt-8 mx-auto max-w-2xl text-lg md:text-xl text-muted-foreground leading-relaxed">
            Track competitors, monitor marketplaces, receive real-time pricing insights, and grow
            revenue with enterprise-grade pricing intelligence.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to={ROUTE.login}
              className="group inline-flex items-center gap-2 rounded-xl bg-secondary text-secondary-foreground px-6 py-3.5 text-sm font-medium shadow-[var(--shadow-elegant)] hover:translate-y-[-1px] transition-all"
            >
              Sign in
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <button className="group inline-flex items-center gap-2 rounded-xl glass px-6 py-3.5 text-sm font-medium text-secondary hover:bg-white transition">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-white">
                <Play className="h-3 w-3 fill-current" />
              </div>
              Watch Product Tour
            </button>
          </div>
        </motion.div>

        {/* Floating dashboard */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          style={{ x: sx, y: sy }}
          className="relative mt-20 mx-auto max-w-5xl"
        >
          <div className="relative rounded-3xl glass p-3 shadow-[var(--shadow-elegant)]">
            <DashboardMock />
          </div>

          {/* floating cards */}
          <motion.div
            animate={{ y: [0, -14, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="hidden md:flex absolute -left-10 top-16 items-center gap-3 rounded-2xl glass px-4 py-3 shadow-[var(--shadow-soft)]"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/15 text-success">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div className="text-left">
              <div className="text-xs text-muted-foreground">Revenue lift</div>
              <div className="text-sm font-semibold text-secondary">+18.4% MoM</div>
            </div>
          </motion.div>

          <motion.div
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            className="hidden md:flex absolute -right-8 top-8 items-center gap-3 rounded-2xl glass px-4 py-3"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Bell className="h-4 w-4" />
            </div>
            <div className="text-left">
              <div className="text-xs text-muted-foreground">Price alert</div>
              <div className="text-sm font-semibold text-secondary">27 SKUs undercut</div>
            </div>
          </motion.div>

          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="hidden md:flex absolute -right-6 -bottom-6 items-center gap-3 rounded-2xl glass px-4 py-3"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/20 text-accent">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="text-left">
              <div className="text-xs text-muted-foreground">Recommendation</div>
              <div className="text-sm font-semibold text-secondary">Repricing 12 items</div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function DashboardMock() {
  return (
    <div className="rounded-2xl bg-white overflow-hidden border border-border">
      {/* top bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/70">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
        <div className="ml-4 flex-1 max-w-md rounded-md bg-muted/70 px-3 py-1 text-xs text-muted-foreground">
          app.epricetrack.com/dashboard
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4 p-6">
        {/* sidebar */}
        <div className="col-span-3 space-y-1.5">
          {[
            { icon: BarChart3, label: "Overview", active: true },
            { icon: Boxes, label: "Products" },
            { icon: Search, label: "Competitors" },
            { icon: Bot, label: "Automations" },
            { icon: Bell, label: "Alerts" },
            { icon: ShieldCheck, label: "Rules" },
          ].map((i) => (
            <div
              key={i.label}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${
                i.active ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground"
              }`}
            >
              <i.icon className="h-3.5 w-3.5" />
              {i.label}
            </div>
          ))}
        </div>

        {/* main */}
        <div className="col-span-9 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { l: "Products tracked", v: "128,402", d: "+2.3%" },
              { l: "Competitors", v: "1,284", d: "+12" },
              { l: "Margin uplift", v: "₹17.5 Cr", d: "+18.4%" },
            ].map((s) => (
              <div key={s.l} className="rounded-xl border border-border p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {s.l}
                </div>
                <div className="mt-1 text-lg font-semibold text-secondary">{s.v}</div>
                <div className="text-[10px] text-success">{s.d}</div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-border p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-secondary">Competitive index</div>
                <div className="text-xs text-muted-foreground">Last 30 days</div>
              </div>
              <div className="flex gap-1 text-[10px]">
                {["1D", "7D", "30D", "90D"].map((t, i) => (
                  <span
                    key={t}
                    className={`rounded-md px-2 py-1 ${
                      i === 2 ? "bg-secondary text-white" : "text-muted-foreground"
                    }`}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <LiveChart />
          </div>
        </div>
      </div>
    </div>
  );
}

function LiveChart() {
  const pts = [8, 24, 18, 40, 32, 58, 46, 70, 62, 82, 74, 92, 78, 96];
  const w = 640, h = 160;
  const max = 100;
  const step = w / (pts.length - 1);
  const d = pts
    .map((p, i) => `${i === 0 ? "M" : "L"} ${i * step} ${h - (p / max) * h}`)
    .join(" ");
  const area = `${d} L ${w} ${h} L 0 ${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-3 w-full h-40">
      <defs>
        <linearGradient id="area" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.56 0.22 262)" stopOpacity="0.4" />
          <stop offset="100%" stopColor="oklch(0.56 0.22 262)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="line" x1="0" x2="1">
          <stop offset="0%" stopColor="oklch(0.56 0.22 262)" />
          <stop offset="100%" stopColor="oklch(0.72 0.14 200)" />
        </linearGradient>
      </defs>
      <motion.path
        d={area}
        fill="url(#area)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.6 }}
      />
      <motion.path
        d={d}
        fill="none"
        stroke="url(#line)"
        strokeWidth="2.5"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.6, ease: "easeInOut" }}
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* TRUSTED                                                             */
/* ------------------------------------------------------------------ */
function Trusted() {
  const logos = [
    "NORDSTROM", "LUMEN", "ARCADIA", "MERIDIAN", "OCTAVE",
    "FIELDNOTE", "PARALLEL", "VANTAGE", "NOVA RETAIL", "CIRCA",
  ];
  return (
    <section className="py-24 border-y border-border/60">
      <div className="mx-auto max-w-7xl px-6">
        <p className="text-center text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Trusted by pricing teams at 1,200+ retailers
        </p>
        <div className="relative mt-10 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
          <div className="flex gap-4 animate-marquee w-max">
            {[...logos, ...logos].map((l, i) => (
              <div
                key={i}
                className="glass rounded-2xl px-8 py-5 text-sm font-semibold tracking-[0.2em] text-secondary/70 hover:text-secondary transition-colors"
              >
                {l}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* PROBLEM (storytelling flow)                                         */
/* ------------------------------------------------------------------ */
function Problem() {
  const steps = [
    { t: "Manual Pricing", bad: true, d: "Spreadsheets, guesswork, delays" },
    { t: "Slow Decisions", bad: true, d: "Prices change faster than reviews" },
    { t: "Revenue Loss", bad: true, d: "Every hour costs margin" },
    { t: "ePrice Track", bad: false, d: "Autonomous market intelligence" },
    { t: "Smart Pricing", bad: false, d: "Optimal prices, always" },
  ];
  return (
    <section className="relative py-32 overflow-hidden">
      <div
        className="absolute inset-0 -z-10 opacity-80"
        style={{
          background:
            "radial-gradient(ellipse at top, oklch(0.66 0.22 35 / 0.08), transparent 60%)",
        }}
      />
      <div className="mx-auto max-w-4xl px-6 text-center">
        <span className="text-xs uppercase tracking-[0.3em] text-primary">The old way is broken</span>
        <h2 className="mt-4 text-4xl md:text-6xl font-display text-secondary leading-tight">
          Pricing decisions should not feel like <span className="italic text-gradient">guesswork</span>.
        </h2>
      </div>

      <div className="mx-auto mt-20 max-w-3xl px-6 space-y-3">
        {steps.map((s, i) => (
          <motion.div
            key={s.t}
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className={`flex items-center gap-5 rounded-2xl p-5 ${
              s.bad
                ? "bg-white border border-border"
                : "bg-secondary text-white shadow-[var(--shadow-elegant)]"
            }`}
          >
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl font-medium ${
                s.bad ? "bg-destructive/10 text-destructive" : "bg-success/20 text-success"
              }`}
            >
              {s.bad ? "✕" : "✓"}
            </div>
            <div className="flex-1 text-left">
              <div className={`text-lg font-semibold ${s.bad ? "text-secondary" : "text-white"}`}>
                {s.t}
              </div>
              <div className={`text-sm ${s.bad ? "text-muted-foreground" : "text-white/70"}`}>
                {s.d}
              </div>
            </div>
            {i < steps.length - 1 && (
              <motion.div
                initial={{ scaleY: 0 }}
                whileInView={{ scaleY: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 + 0.3 }}
                className="absolute"
              />
            )}
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* FEATURES — interactive network                                      */
/* ------------------------------------------------------------------ */
function FeatureNetwork() {
  // Equal spacing every 45°; 0° = east (right), -90° = north (top)
  const nodes = [
    { label: "API", icon: Cpu, angle: -90 },
    { label: "Product Matching", icon: Target, angle: -45 },
    { label: "Competitor Monitoring", icon: Search, angle: 0 },
    { label: "Google Shopping", icon: Globe2, angle: 45 },
    { label: "Amazon", icon: Boxes, angle: 90 },
    { label: "Flipkart", icon: Layers, angle: 135 },
    { label: "Reports", icon: BarChart3, angle: 180 },
    { label: "Alerts", icon: Bell, angle: 225 },
  ];
  const SIZE = 560;
  const RADIUS = 200;

  return (
    <section id="product" className="relative scroll-mt-28 overflow-hidden py-32">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <span className="text-xs uppercase tracking-[0.3em] text-primary">Platform</span>
        <h2 className="mt-4 text-4xl font-display text-secondary md:text-6xl">
          One intelligent <span className="italic text-gradient">network</span> for pricing.
        </h2>
        <p className="mt-6 text-lg text-muted-foreground">
          Every data source, every marketplace, every insight — orchestrated by a single pricing engine.
        </p>
      </div>

      <div className="mx-auto mt-16 flex justify-center px-4">
        <div
          className="relative shrink-0"
          style={{ width: SIZE, height: SIZE, maxWidth: "100%" }}
        >
          {/* decorative rings */}
          {/* <div
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/15 animate-spin-slow"
            style={{ width: RADIUS * 2 + 40, height: RADIUS * 2 + 40 }}
          /> */}
          {/* <div
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent/20 animate-spin-reverse"
            style={{ width: RADIUS * 1.4, height: RADIUS * 1.4 }}
          /> */}

          {/* connection lines */}
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            aria-hidden
          >
            {nodes.map((n, i) => {
              const rad = (n.angle * Math.PI) / 180;
              const cx = SIZE / 2;
              const cy = SIZE / 2;
              return (
                <motion.line
                  key={n.label}
                  x1={cx}
                  y1={cy}
                  x2={cx + Math.cos(rad) * RADIUS}
                  y2={cy + Math.sin(rad) * RADIUS}
                  stroke="url(#netline)"
                  strokeWidth="1.25"
                  initial={{ pathLength: 0, opacity: 0 }}
                  whileInView={{ pathLength: 1, opacity: 0.55 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.2, delay: i * 0.08 }}
                />
              );
            })}
            <defs>
              <linearGradient id="netline" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="oklch(0.56 0.22 262)" stopOpacity="0.8" />
                <stop offset="100%" stopColor="oklch(0.72 0.14 200)" stopOpacity="0.2" />
              </linearGradient>
            </defs>
          </svg>

          {/* center hub */}
          <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="relative"
            >
              <span className="absolute inset-0 rounded-full bg-primary/30 blur-2xl" />
              <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-gradient-primary text-white shadow-[var(--shadow-glow)]">
                <div className="text-center">
                  <Bot className="mx-auto h-8 w-8" />
                  <div className="mt-1 text-xs font-semibold">Pricing Engine</div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* orbiting nodes — outer layer = orbit position; inner = motion */}
          {nodes.map((n, i) => (
            <div
              key={n.label}
              className="absolute z-20"
              style={{
                left: `${SIZE / 2 + Math.cos((n.angle * Math.PI) / 180) * RADIUS}px`,
                top: `${SIZE / 2 + Math.sin((n.angle * Math.PI) / 180) * RADIUS}px`,
                transform: "translate(-50%, -50%)",
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 + i * 0.08 }}
                whileHover={{ scale: 1.06 }}
              >
                <div className="group flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-2xl glass px-4 py-2.5 shadow-[var(--shadow-soft)]">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-all group-hover:bg-primary group-hover:text-white">
                    <n.icon className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium text-secondary">{n.label}</span>
                </div>
              </motion.div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* DASHBOARD SHOWCASE                                                  */
/* ------------------------------------------------------------------ */
function LaptopShowcase() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const rotate = useTransform(scrollYProgress, [0, 0.5, 1], [12, 0, -8]);
  const y = useTransform(scrollYProgress, [0, 1], [50, -50]);

  return (
    <section ref={ref} className="relative py-32 overflow-hidden bg-secondary text-white">
      <div className="absolute inset-0 -z-0 opacity-30">
        <div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-primary blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-accent blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-4xl px-6 text-center">
        <span className="text-xs uppercase tracking-[0.3em] text-accent">Live dashboard</span>
        <h2 className="mt-4 text-4xl md:text-6xl font-display leading-tight">
          Every price. Every competitor. <br />
          <span className="italic text-accent">In one screen.</span>
        </h2>
      </div>

      <motion.div
        style={{ rotateX: rotate, y }}
        className="relative mx-auto mt-20 max-w-5xl px-6 [perspective:2000px]"
      >
        <div className="rounded-t-3xl bg-gradient-to-b from-white/10 to-white/5 p-3 border border-white/10">
          <div className="rounded-2xl overflow-hidden">
            <DashboardMock />
          </div>
        </div>
        {/* laptop base */}
        <div className="h-4 bg-gradient-to-b from-white/20 to-white/5 rounded-b-[40px] mx-[-40px]" />

        {/* floating widgets */}
        <motion.div
          animate={{ y: [0, -18, 0] }}
          transition={{ duration: 5, repeat: Infinity }}
          className="absolute -left-4 md:-left-16 top-24 glass-dark rounded-2xl p-4 w-52 hidden sm:block"
        >
          <div className="text-xs text-white/60">SKU-40219</div>
          <div className="mt-1 text-sm font-semibold">Sony WH-1000XM5</div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-accent">₹24,990</span>
            <span className="text-xs text-success">-6% vs market</span>
          </div>
        </motion.div>

        <motion.div
          animate={{ y: [0, 20, 0] }}
          transition={{ duration: 6, repeat: Infinity, delay: 0.5 }}
          className="absolute -right-4 md:-right-16 top-40 glass-dark rounded-2xl p-4 w-56 hidden sm:block"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            <span className="text-xs font-medium text-accent">Smart Insight</span>
          </div>
          <p className="mt-2 text-sm text-white/80">
            Raise price by <b>4.2%</b> on 218 SKUs to capture ₹34L margin this week.
          </p>
        </motion.div>
      </motion.div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* PRICING INTELLIGENCE                                                */
/* ------------------------------------------------------------------ */
function AIIntelligence() {
  return (
    <section className="relative py-32 overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <span className="text-xs uppercase tracking-[0.3em] text-primary">Intelligence</span>
          <h2 className="mt-4 text-4xl md:text-6xl font-display text-secondary leading-tight">
            Insights that <span className="italic text-gradient">think</span> ahead of the market.
          </h2>
          <p className="mt-6 text-lg text-muted-foreground">
            Our pricing engine detects patterns across billions of price points, tracks
            demand shifts, and surfaces optimal moves — all in real time.
          </p>

          <div className="mt-10 space-y-4">
            {[
              "Elasticity modeling across 40+ markets",
              "Explainable recommendations",
              "Auto-repricing with guardrails",
            ].map((t) => (
              <div key={t} className="flex items-center gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-success/15 text-success">
                  <Check className="h-3.5 w-3.5" />
                </div>
                <span className="text-sm text-secondary">{t}</span>
              </div>
            ))}
          </div>
        </div>


        {/* neural viz */}
        <div className="relative h-[500px]">
          <NeuralNet />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="absolute top-6 left-6 glass rounded-2xl p-4 w-64"
          >
            <div className="flex items-center gap-2 text-xs text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Recommendation
            </div>
            <p className="mt-1.5 text-sm text-secondary">
              Increase price of "Nike Air Max 90" by ₹375 — 87% confidence.
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="absolute bottom-10 right-2 glass rounded-2xl p-4 w-60"
          >
            <div className="flex items-center gap-2 text-xs text-accent">
              <Zap className="h-3.5 w-3.5" /> Forecast
            </div>
            <p className="mt-1.5 text-sm text-secondary">
              Demand +23% this weekend across 4 categories.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function NeuralNet() {
  const layers = [4, 6, 6, 3];
  const w = 500, h = 500;
  const positions: { x: number; y: number }[][] = layers.map((count, li) => {
    const x = (li / (layers.length - 1)) * (w - 80) + 40;
    return Array.from({ length: count }).map((_, ni) => ({
      x,
      y: (h / (count + 1)) * (ni + 1),
    }));
  });
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full">
      <defs>
        <linearGradient id="nline" x1="0" x2="1">
          <stop offset="0%" stopColor="oklch(0.56 0.22 262)" stopOpacity="0.6" />
          <stop offset="100%" stopColor="oklch(0.72 0.14 200)" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      {positions.slice(0, -1).map((layer, li) =>
        layer.map((a, ai) =>
          positions[li + 1].map((b, bi) => (
            <motion.line
              key={`${li}-${ai}-${bi}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="url(#nline)"
              strokeWidth="0.7"
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.5, delay: li * 0.2 + (ai + bi) * 0.02 }}
            />
          ))
        )
      )}
      {positions.map((layer, li) =>
        layer.map((p, ni) => (
          <motion.circle
            key={`${li}-${ni}`}
            cx={p.x}
            cy={p.y}
            r="7"
            fill="white"
            stroke="oklch(0.56 0.22 262)"
            strokeWidth="2"
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: li * 0.15 + ni * 0.05, type: "spring" }}
          />
        ))
      )}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* HOW IT WORKS — circular                                             */
/* ------------------------------------------------------------------ */
function HowItWorks() {
  const steps = [
    { t: "Import Products", d: "CSV, API, or feeds", icon: Database },
    { t: "Track Competitors", d: "24/7 monitoring", icon: Search },
    { t: "Market Analysis", d: "Deep market signals", icon: Bot },
    { t: "Price Optimization", d: "Guardrail-safe", icon: Target },
    { t: "Business Growth", d: "Measurable lift", icon: Rocket },
  ];
  const SIZE = 520;
  const R = 190;

  return (
    <section id="solutions" className="relative scroll-mt-28 overflow-hidden bg-muted/40 py-32">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <span className="text-xs uppercase tracking-[0.3em] text-primary">Workflow</span>
        <h2 className="mt-4 text-4xl font-display text-secondary md:text-6xl">
          A closed loop of <span className="italic text-gradient">continuous</span> optimization.
        </h2>
      </div>

      <div className="mx-auto mt-16 flex justify-center px-4 sm:mt-20">
        <div className="relative shrink-0" style={{ width: SIZE, height: SIZE, maxWidth: "100%" }}>
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            aria-hidden
          >
            <motion.circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              fill="none"
              stroke="oklch(0.56 0.22 262)"
              strokeWidth="1.5"
              strokeDasharray="6 8"
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 2 }}
            />
          </svg>

          {steps.map((s, i) => {
            // Start at top (-90°), then equal steps of 72°
            const angle = -90 + (i * 360) / steps.length;
            return (
              <div
                key={s.t}
                className="absolute left-1/2 top-1/2 z-10 w-40 text-center"
                style={{
                  transform: `translate(-50%, -50%) rotate(${angle}deg) translate(${R}px) rotate(${-angle}deg)`,
                }}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.6 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 }}
                >
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-white shadow-[var(--shadow-soft)]">
                    <s.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="mt-2 text-xs font-semibold text-primary">STEP {i + 1}</div>
                  <div className="text-sm font-semibold text-secondary">{s.t}</div>
                  <div className="text-xs text-muted-foreground">{s.d}</div>
                </motion.div>
              </div>
            );
          })}

          <div className="absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2 text-center">
            <div className="font-display text-5xl italic text-gradient">Loop</div>
            <div className="mt-1 text-xs text-muted-foreground">Runs 24 / 7 / 365</div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* STATS — count-up                                                    */
/* ------------------------------------------------------------------ */
function CountUp({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    const dur = 1600;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(to * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to]);
  const formatted =
    to >= 1_000_000_000
      ? (val / 1_000_000_000).toFixed(1)
      : to >= 1_000_000
      ? (val / 1_000_000).toFixed(1)
      : to >= 100
      ? Math.round(val).toString()
      : val.toFixed(1);
  return <span ref={ref}>{formatted}{suffix}</span>;
}

function Stats() {
  const items = [
    { v: 2_000_000, s: "M+", l: "Products tracked" },
    { v: 120, s: "+", l: "Countries covered" },
    { v: 99.9, s: "%", l: "Match accuracy" },
    { v: 5_000_000_000, s: "B+", l: "Price updates / mo" },
  ];
  return (
    <section className="relative py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <span className="text-xs uppercase tracking-[0.3em] text-primary">By the numbers</span>
          <h2 className="mt-4 text-4xl md:text-6xl font-display text-secondary">
            Enterprise scale. <span className="italic text-gradient">Zero compromise.</span>
          </h2>
        </div>

        <div className="mt-20 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {items.map((s, i) => (
            <motion.div
              key={s.l}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="relative rounded-3xl glass p-8 overflow-hidden group"
            >
              <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-primary/20 blur-2xl group-hover:bg-primary/40 transition-colors" />
              <div className="relative">
                <div className="text-5xl md:text-6xl font-display text-secondary">
                  <CountUp to={s.v} suffix={s.s} />
                </div>
                <div className="mt-3 text-sm text-muted-foreground">{s.l}</div>
                <MiniRing delay={i * 0.2} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function MiniRing({ delay = 0 }) {
  return (
    <svg viewBox="0 0 100 100" className="mt-6 h-16 w-16">
      <circle cx="50" cy="50" r="40" fill="none" stroke="oklch(0.92 0.01 255)" strokeWidth="8" />
      <motion.circle
        cx="50"
        cy="50"
        r="40"
        fill="none"
        stroke="url(#ringg)"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray="251"
        initial={{ strokeDashoffset: 251 }}
        whileInView={{ strokeDashoffset: 50 }}
        viewport={{ once: true }}
        transition={{ duration: 1.6, delay }}
        transform="rotate(-90 50 50)"
      />
      <defs>
        <linearGradient id="ringg" x1="0" x2="1">
          <stop stopColor="oklch(0.56 0.22 262)" />
          <stop offset="1" stopColor="oklch(0.72 0.14 200)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* INDUSTRIES — map with pins                                          */
/* ------------------------------------------------------------------ */
function Industries() {
  const pins = [
    { x: 22, y: 42, label: "Electronics", cities: "SF, Austin, Seattle" },
    { x: 48, y: 34, label: "Fashion", cities: "London, Paris, Milan" },
    { x: 55, y: 44, label: "Furniture", cities: "Berlin, Warsaw" },
    { x: 68, y: 52, label: "Automotive", cities: "Tokyo, Seoul" },
    { x: 30, y: 58, label: "Healthcare", cities: "Mexico City, Bogotá" },
    { x: 72, y: 62, label: "Beauty", cities: "Bangkok, Singapore" },
    { x: 50, y: 66, label: "FMCG", cities: "Lagos, Nairobi" },
    { x: 82, y: 58, label: "Retail", cities: "Sydney, Melbourne" },
  ];
  const [active, setActive] = useState(0);
  return (
    <section className="relative py-32 bg-secondary text-white overflow-hidden">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <span className="text-xs uppercase tracking-[0.3em] text-accent">Industries</span>
        <h2 className="mt-4 text-4xl md:text-6xl font-display leading-tight">
          Built for every market <br /> <span className="italic text-accent">on Earth.</span>
        </h2>
      </div>

      <div className="relative mx-auto mt-16 max-w-6xl px-6">
        <div className="relative aspect-[2/1] rounded-3xl glass-dark p-6 overflow-hidden">
          <WorldDots />
          {pins.map((p, i) => (
            <button
              key={p.label}
              onMouseEnter={() => setActive(i)}
              onClick={() => setActive(i)}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
            >
              <span className="absolute inset-0 rounded-full bg-accent" style={{ animation: "pulse-ring 2.4s ease-out infinite" }} />
              <span
                className={`relative block h-3 w-3 rounded-full ${
                  active === i ? "bg-accent scale-125" : "bg-white"
                } transition-transform`}
              />
              {active === i && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: -14 }}
                  className="absolute left-1/2 -translate-x-1/2 -top-2 whitespace-nowrap glass-dark rounded-lg px-3 py-1.5 text-xs"
                >
                  <div className="font-semibold text-accent">{p.label}</div>
                  <div className="text-white/60 text-[10px]">{p.cities}</div>
                </motion.div>
              )}
            </button>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {pins.map((p, i) => (
            <button
              key={p.label}
              onClick={() => setActive(i)}
              className={`rounded-full px-4 py-2 text-xs transition-all ${
                active === i
                  ? "bg-accent text-secondary font-semibold"
                  : "glass-dark text-white/70 hover:text-white"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function WorldDots() {
  // stylized dotted world
  const dots: [number, number][] = [];
  for (let y = 5; y < 95; y += 4) {
    for (let x = 2; x < 98; x += 2) {
      const n = Math.sin(x * 0.13) * Math.cos(y * 0.15) + Math.sin((x + y) * 0.07);
      const r = Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
      if (n > 0.2 && r > 0.35) dots.push([x, y]);
    }
  }
  return (
    <svg viewBox="0 0 100 50" className="w-full h-full">
      {dots.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y * 0.5} r="0.28" fill="white" opacity="0.25" />
      ))}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* INTEGRATIONS — orbit                                                */
/* ------------------------------------------------------------------ */
function IntegrationOrbit() {
  const items = ["Shopify", "WooCommerce", "Magento", "Amazon", "Flipkart", "Google Shopping", "API", "CSV/XML"];
  const inner = items.slice(0, 4);
  const outer = items.slice(4);
  return (
    <section className="relative py-32 overflow-hidden">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <span className="text-xs uppercase tracking-[0.3em] text-primary">Integrations</span>
        <h2 className="mt-4 text-4xl md:text-6xl font-display text-secondary">
          Plugs into every <span className="italic text-gradient">tool</span> you already use.
        </h2>
      </div>

      <div className="relative mx-auto mt-24 h-[520px] max-w-3xl">
        {/* orbits */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative h-[220px] w-[220px] rounded-full border border-primary/20 animate-spin-slow">
            {inner.map((n, i) => {
              const a = (i / inner.length) * Math.PI * 2;
              return (
                <div
                  key={n}
                  className="absolute -translate-x-1/2 -translate-y-1/2 animate-spin-reverse"
                  style={{
                    left: `calc(50% + ${Math.cos(a) * 110}px)`,
                    top: `calc(50% + ${Math.sin(a) * 110}px)`,
                  }}
                >
                  <div className="glass rounded-xl px-3 py-2 text-xs font-medium text-secondary shadow-[var(--shadow-soft)]">
                    {n}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative h-[440px] w-[440px] rounded-full border border-accent/20 animate-spin-reverse">
            {outer.map((n, i) => {
              const a = (i / outer.length) * Math.PI * 2;
              return (
                <div
                  key={n}
                  className="absolute -translate-x-1/2 -translate-y-1/2 animate-spin-slow"
                  style={{
                    left: `calc(50% + ${Math.cos(a) * 220}px)`,
                    top: `calc(50% + ${Math.sin(a) * 220}px)`,
                  }}
                >
                  <div className="glass rounded-xl px-3 py-2 text-xs font-medium text-secondary shadow-[var(--shadow-soft)]">
                    {n}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-28 w-28 items-center justify-center rounded-full bg-gradient-primary text-white shadow-[var(--shadow-glow)]">
            <div className="text-center text-xs font-bold">
              ePrice<br />Track
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* TESTIMONIALS                                                        */
/* ------------------------------------------------------------------ */
function Testimonials() {
  const items = [
    {
      quote:
        "ePrice Track paid for itself in six weeks. We finally have a real-time view of the market.",
      name: "Amelia Chen",
      role: "VP Pricing, Nova Retail",
      x: "5%",
      y: "5%",
      rot: -4,
      delay: 0,
    },
    {
      quote:
        "ePrice Track catches things our analysts would take days to find. It is like a superpower.",
      name: "Marcus Konig",
      role: "Head of E-commerce, Arcadia",
      x: "58%",
      y: "0%",
      rot: 3,
      delay: 0.4,
    },
    {
      quote:
        "We moved from Excel gymnastics to autonomous pricing across 40 countries in one quarter.",
      name: "Priya Rao",
      role: "Director, Meridian Group",
      x: "30%",
      y: "35%",
      rot: -1,
      delay: 0.8,
    },
    {
      quote:
        "The most polished pricing platform we evaluated. Enterprise-ready from day one.",
      name: "Diego Alvarez",
      role: "CTO, Circa Commerce",
      x: "0%",
      y: "55%",
      rot: 2,
      delay: 1.2,
    },
    {
      quote: "Product matching accuracy is off the charts. It just works.",
      name: "Sophie Laurent",
      role: "Pricing Lead, Octave",
      x: "62%",
      y: "50%",
      rot: -3,
      delay: 1.6,
    },
  ];

  return (
    <section
      id="customers"
      className="relative scroll-mt-28 overflow-hidden bg-muted/40 py-32"
    >
      <div className="mx-auto max-w-4xl px-6 text-center">
        <span className="text-xs uppercase tracking-[0.3em] text-primary">
          Loved by leaders
        </span>
        <h2 className="mt-4 font-display text-4xl text-secondary md:text-6xl">
          Enterprise teams,{" "}
          <span className="italic text-gradient">unanimous</span>.
        </h2>
      </div>

      <div className="relative mx-auto mt-16 h-[440px] max-w-6xl px-6">
        {items.map((t, i) => (
          <motion.div
            key={t.name}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="absolute w-72 md:w-80"
            style={{
              left: t.x,
              top: t.y,
              rotate: t.rot,
            }}
          >
            <motion.div
              animate={{ y: [0, -12, 0] }}
              transition={{
                duration: 6 + i,
                repeat: Infinity,
                delay: t.delay,
              }}
              className="glass rounded-2xl p-5 shadow-[var(--shadow-soft)]"
            >
              <div className="flex gap-0.5 text-accent">
                {Array.from({ length: 5 }).map((_, k) => (
                  <Star key={k} className="h-3.5 w-3.5 fill-current" />
                ))}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-secondary">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="mt-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-primary text-xs font-semibold text-white">
                  {t.name[0]}
                </div>
                <div>
                  <div className="text-xs font-semibold text-secondary">
                    {t.name}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {t.role}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* FAQ                                                                 */
/* ------------------------------------------------------------------ */
function FAQ() {
  const faqs = [
    {
      q: "How quickly can we onboard?",
      a: "Most teams are live in under 7 days. Enterprise implementations with SSO, dedicated infra, and complex feeds typically take 2–4 weeks with a dedicated CSM.",
    },
    {
      q: "How accurate is product matching?",
      a: "Our proprietary matching engine achieves 99.9% precision across categories, combining image, text, and attribute signals with a human-in-the-loop review layer.",
    },
    {
      q: "Which marketplaces do you cover?",
      a: "Amazon, Google Shopping, Flipkart, MercadoLibre, Allegro, Zalando, Bol, Otto, and 200+ regional marketplaces. Custom sources on request.",
    },
    {
      q: "Is auto-repricing safe?",
      a: "Yes. Every rule runs inside strict guardrails you define: margin floors, MAP compliance, brand tiers, competitor caps, and human approval workflows.",
    },
    {
      q: "What about data security?",
      a: "SOC 2 Type II, ISO 27001, GDPR-compliant. Regional data residency, SSO, RBAC, and audit logs available on Enterprise.",
    },
  ];
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="docs" className="relative scroll-mt-28 py-32">
      <div className="mx-auto max-w-3xl px-6">
        <div className="text-center">
          <span className="text-xs uppercase tracking-[0.3em] text-primary">FAQ</span>
          <h2 className="mt-4 text-4xl md:text-6xl font-display text-secondary">
            Questions, <span className="italic text-gradient">answered</span>.
          </h2>
        </div>

        <div className="mt-16 space-y-3">
          {faqs.map((f, i) => (
            <div
              key={i}
              className={`rounded-2xl border transition-all ${
                open === i ? "border-primary/30 bg-white shadow-[var(--shadow-soft)]" : "border-border"
              }`}
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between p-6 text-left"
              >
                <span className="text-base md:text-lg font-medium text-secondary">{f.q}</span>
                <motion.div
                  animate={{ rotate: open === i ? 45 : 0 }}
                  transition={{ duration: 0.3 }}
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    open === i ? "bg-primary text-white" : "bg-muted text-secondary"
                  }`}
                >
                  <span className="text-lg leading-none">+</span>
                </motion.div>
              </button>
              <AnimatePresence>
                {open === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <p className="px-6 pb-6 text-sm text-muted-foreground leading-relaxed">{f.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* FINAL CTA                                                           */
/* ------------------------------------------------------------------ */
function FinalCTA() {
  return (
    <section className="relative py-32 overflow-hidden">
      <div className="mx-auto max-w-6xl px-6">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-secondary text-white p-12 md:p-20 text-center">
          <div
            className="absolute inset-0 opacity-70 animate-gradient"
            style={{
              backgroundImage:
                "linear-gradient(120deg, oklch(0.56 0.22 262) 0%, oklch(0.72 0.14 200) 50%, oklch(0.68 0.16 160) 100%)",
              backgroundSize: "200% 200%",
            }}
          />
          <div className="absolute inset-0 bg-secondary/50 mix-blend-multiply" />
          <div className="absolute inset-0 grid-bg opacity-40" />

          <div className="relative">
            <h2 className="text-4xl md:text-7xl font-display leading-[1] tracking-tight">
              Ready to outsmart <br /> your <span className="italic">competitors?</span>
            </h2>
            <p className="mt-6 mx-auto max-w-xl text-white/70">
              Join 1,200+ enterprise teams turning pricing into a growth engine.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to={ROUTE.login}
                className="inline-flex items-center gap-2 rounded-xl bg-white text-secondary px-6 py-3.5 text-sm font-semibold hover:scale-[1.02] transition-transform"
              >
                Sign in <ArrowUpRight className="h-4 w-4" />
              </Link>
              <Link
                to={ROUTE.login}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-6 py-3.5 text-sm font-medium hover:bg-white/10 transition"
              >
                Talk to sales
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* FOOTER                                                              */
/* ------------------------------------------------------------------ */
function Footer() {
  return (
    <footer className="relative bg-secondary text-white overflow-hidden">
      {/* stars */}
      <div className="absolute inset-0">
        {Array.from({ length: 60 }).map((_, i) => {
          const a = ((i * 9301 + 49297) % 233280) / 233280;
          const b = ((i * 15731 + 789221) % 233280) / 233280;
          const c = ((i * 22571 + 3571) % 233280) / 233280;
          const d = ((i * 12345 + 6789) % 233280) / 233280;
          return (
            <motion.span
              key={i}
              className="absolute h-0.5 w-0.5 rounded-full bg-white"
              style={{ left: `${a * 100}%`, top: `${b * 100}%` }}
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ duration: 2 + c * 3, repeat: Infinity, delay: d * 3 }}
            />
          );
        })}
      </div>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent" />

      <div className="relative mx-auto max-w-7xl px-6 py-20">
        <div className="grid md:grid-cols-5 gap-10">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-primary" />
              <span className="font-semibold">ePrice<span className="text-accent">Track</span></span>
            </div>
            <p className="mt-4 max-w-sm text-sm text-white/60">
              Enterprise-grade pricing intelligence. Trusted by leading retailers in 120+ countries.
            </p>
            <div className="mt-6 flex gap-3">
              {["X", "in", "GH", "YT"].map((s) => (
                <a
                  key={s}
                  href="#"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-xs text-white/70 hover:border-accent hover:text-accent transition"
                >
                  {s}
                </a>
              ))}
            </div>
          </div>

          {[
            { t: "Product", i: ["Platform", "Automations", "Integrations", "API", "Changelog"] },
            { t: "Solutions", i: ["Retail", "Marketplaces", "FMCG", "Fashion", "Enterprise"] },
            { t: "Company", i: ["About", "Customers", "Careers", "Contact", "Legal"] },
          ].map((c) => (
            <div key={c.t}>
              <div className="text-xs uppercase tracking-[0.2em] text-white/50">{c.t}</div>
              <ul className="mt-4 space-y-2 text-sm text-white/80">
                {c.i.map((l) => (
                  <li key={l}>
                    <a href="#" className="hover:text-accent transition">
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 pt-6 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-xs text-white/50">
            © {new Date().getFullYear()} ePrice Track. All rights reserved.
          </div>
          <div className="flex gap-6 text-xs text-white/50">
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Security</a>
            <a href="#">Status</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ */
/* LANDING                                                             */
/* ------------------------------------------------------------------ */
export default function Landing() {
  useEffect(() => {
    if (window.location.hash) {
      // Wait a tick so sections are mounted
      requestAnimationFrame(() => scrollToHash(window.location.hash));
    }
  }, []);

  return (
    <div className="landing min-h-screen bg-background text-foreground">
      <Nav />
      <main>
        <Hero />
        <Trusted />
        <Problem />
        <FeatureNetwork />
        <LaptopShowcase />
        <AIIntelligence />
        <HowItWorks />
        <Stats />
        <Industries />
        <IntegrationOrbit />
        <Testimonials />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
