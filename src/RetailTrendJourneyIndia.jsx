import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Layers} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Legend, CartesianGrid } from "recharts";

// --- Helper: generate mock data (2015-2025) ---
const years = Array.from({ length: 11 }, (_, i) => 2015 + i);

function genSeries(base = 500, growth = 0.12, noise = 0.05) {
  let val = base;
  return years.map((y) => {
    // shocks: demonetisation 2016, GST 2017 rollout, COVID 2020
    const shock =
      y === 2016 ? -0.04 :
      y === 2017 ? -0.02 :
      y === 2020 ? -0.12 :
      y === 2021 ? 0.14 : 0;
    val = val * (1 + growth + shock + (Math.random() - 0.5) * noise);
    return { year: y, value: Math.max(0, Math.round(val)) };
  });
}

// Macro retail (₹ billion, synthetic)
const retailAll = genSeries(5200, 0.10, 0.04);

// Category shares (synthetic, sum ≈ 100)
const sharesByYear = years.map((y, idx) => {
  // ecom rises from ~3% to ~12%; fashion steady; grocery large; electronics rises a bit
  const ecom = 0.03 + (idx / (years.length - 1)) * 0.09; // 3% → 12%
  const electronics = 0.09 + (idx / (years.length - 1)) * 0.03; // 9% → 12%
  const fashion = 0.14 - (idx / (years.length - 1)) * 0.01; // 14% → 13%
  const grocery = 1 - (ecom + electronics + fashion) - 0.15; // leave 15% for Other
  const other = 0.15;
  return { year: y, ecom, electronics, fashion, grocery, other };
});

const allRetailPlusEcom = years.map((y, i) => ({
  year: y,
  all: retailAll[i].value,
  ecomShare: +(sharesByYear[i].ecom * 100).toFixed(1),
  ecomVal: Math.round(retailAll[i].value * sharesByYear[i].ecom),
}));

// Simple state-wise small‑multiples mock (value index, not absolute)
const states = [
  "Maharashtra",
  "Karnataka",
  "Delhi",
  "Tamil Nadu",
  "Gujarat",
  "West Bengal",
  "Uttar Pradesh",
  "Telangana",
];

function genStateSeries(mult = 1) {
  const base = 100 * mult;
  return years.map((y, i) => {
    const covid = y === 2020 ? -0.15 : y === 2021 ? 0.18 : 0;
    const val = Math.round((base + i * 10) * (1 + covid));
    return { year: y, value: val };
  });
}

const stateData = states.map((s, i) => ({
  state: s,
  series: genStateSeries(1 + i * 0.12),
}));

// Key freeze events
const EVENTS = [
  { year: 2016, label: "Demonetisation (Nov 2016)", note: "Short‑term cash shock; near‑term retail slowdown, faster digital adoption." },
  { year: 2017, label: "GST Rollout (Jul 2017)", note: "Transition effects; formalisation and supply‑chain changes." },
  { year: 2020, label: "COVID‑19 Shock (2020)", note: "Steep disruption; e‑commerce mix jumps; recovery in 2021." },
];

// Projection (2026‑2030) based on last CAGR
const last5 = retailAll.slice(-5);
const lastCAGR = Math.pow(
  last5[last5.length - 1].value / last5[0].value,
  1 / (last5.length - 1)
) - 1;
const projYears = [2026, 2027, 2028, 2029, 2030];
const projections = (() => {
  const start = retailAll[retailAll.length - 1].value;
  let v = start;
  return projYears.map((y) => {
    v = Math.round(v * (1 + lastCAGR * 0.9)); // slightly conservative
    return { year: y, value: v };
  });
})();

// --- Tooltip formatter ---
const billionsFmt = (n) => `₹${(n / 1000).toFixed(1)}T`;

// --- Intersection Observer hook ---
function useSectionObserver(ids) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id);
        });
      },
      { threshold: 0.5 }
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [ids.join(",")]);
  return active;
}

export default function RetailTrendJourneyIndia() {
  const sections = ["macro", "ecom", "events", "categories", "states", "projection"];
  const active = useSectionObserver(sections);

  const [playing, setPlaying] = useState(false);
  const [projIndex, setProjIndex] = useState(0); // 0..4 maps to 2026..2030
  const timerRef = useRef(null);

  useEffect(() => {
    if (playing) {
      timerRef.current = setInterval(() => {
        setProjIndex((p) => (p >= projYears.length - 1 ? 0 : p + 1));
      }, 1500);
      return () => clearInterval(timerRef.current);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [playing]);

  // Derived data for morph between All Retail and E‑com Share
  const ecomMode = active === "ecom";

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#0f172a] via-[#0b1324] to-[#121826] text-white">
      <header className="sticky top-0 z-40 backdrop-blur bg-black/30 border-b border-white/10">
        <div className="max-w-7xl mx-auto flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Layers className="w-6 h-6" />
            <h1 className="text-lg md:text-xl font-semibold tracking-tight">Retail Growth & Disruption in India (2015–2025)</h1>
          </div>
          <div className="hidden md:flex items-center gap-4 text-sm text-white/80">
            <div className={`px-2 py-1 rounded ${active === "macro" ? "bg-white/10" : ""}`}>Macro</div>
            <div className={`px-2 py-1 rounded ${active === "ecom" ? "bg-white/10" : ""}`}>E‑commerce</div>
            <div className={`px-2 py-1 rounded ${active === "events" ? "bg-white/10" : ""}`}>Freeze Events</div>
            <div className={`px-2 py-1 rounded ${active === "categories" ? "bg-white/10" : ""}`}>Categories</div>
            <div className={`px-2 py-1 rounded ${active === "states" ? "bg-white/10" : ""}`}>States</div>
            <div className={`px-2 py-1 rounded ${active === "projection" ? "bg-white/10" : ""}`}>Projection</div>
          </div>
        </div>
      </header>

      {/* Sticky viz container */}
      <section className="relative">
        <div className="sticky top-14 md:top-16 h-[58vh] md:h-[64vh] border-y border-white/10 bg-white/5">
          <div className="h-full w-full">
            {/* Viz switches subtly depending on section */}
            <div className="h-full w-full p-2 md:p-4">
              {/* Macro All Retail (Area) vs E‑com Share (Line) */}
              <div className="h-full w-full rounded-2xl bg-black/20 p-2 md:p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.05)_inset]">
                {!ecomMode && (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={retailAll} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#34d399" stopOpacity={0.5} />
                          <stop offset="95%" stopColor="#34d399" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis dataKey="year" stroke="#9ca3af" tick={{ fill: "#9ca3af" }} />
                      <YAxis stroke="#9ca3af" tickFormatter={billionsFmt} tick={{ fill: "#9ca3af" }} />
                      <Tooltip contentStyle={{ background: "#0b1324", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} formatter={(v) => billionsFmt(v)} />
                      <Area type="monotone" dataKey="value" stroke="#34d399" fillOpacity={1} fill="url(#grad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
                {ecomMode && (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={allRetailPlusEcom}>
                      <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis dataKey="year" stroke="#9ca3af" tick={{ fill: "#9ca3af" }} />
                      <YAxis stroke="#9ca3af" domain={[0, 20]} tickFormatter={(v) => v + "%"} tick={{ fill: "#9ca3af" }} />
                      <Tooltip contentStyle={{ background: "#0b1324", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} formatter={(v) => `${v}%`} />
                      <Line type="monotone" dataKey="ecomShare" stroke="#60a5fa" strokeWidth={2.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}

                {active === "events" && (
                  <div className="absolute inset-0 p-3 md:p-6 flex flex-col gap-3 pointer-events-none">
                    {EVENTS.map((ev, idx) => (
                      <motion.div
                        key={ev.year}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.15 }}
                        className="backdrop-blur bg-black/50 border border-white/10 rounded-xl p-3 max-w-md"
                      >
                        <div className="text-sm text-white/70">{ev.year}</div>
                        <div className="font-semibold">{ev.label}</div>
                        <div className="text-white/80 text-sm">{ev.note}</div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {active === "categories" && (
                  <div className="absolute inset-0 p-2 md:p-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={sharesByYear.map((d, i) => ({
                        year: years[i],
                        ECommerce: +(d.ecom * 100).toFixed(1),
                        Electronics: +(d.electronics * 100).toFixed(1),
                        Fashion: +(d.fashion * 100).toFixed(1),
                        Grocery: +(d.grocery * 100).toFixed(1),
                        Other: +(d.other * 100).toFixed(1),
                      }))} stackOffset="expand">
                        <defs>
                          <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.9} />
                            <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.2} />
                          </linearGradient>
                          <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#34d399" stopOpacity={0.9} />
                            <stop offset="100%" stopColor="#34d399" stopOpacity={0.2} />
                          </linearGradient>
                          <linearGradient id="g3" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.9} />
                            <stop offset="100%" stopColor="#fbbf24" stopOpacity={0.2} />
                          </linearGradient>
                          <linearGradient id="g4" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#f472b6" stopOpacity={0.9} />
                            <stop offset="100%" stopColor="#f472b6" stopOpacity={0.2} />
                          </linearGradient>
                          <linearGradient id="g5" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.9} />
                            <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.2} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                        <XAxis dataKey="year" stroke="#9ca3af" tick={{ fill: "#9ca3af" }} />
                        <YAxis stroke="#9ca3af" tickFormatter={(v) => v + "%"} tick={{ fill: "#9ca3af" }} />
                        <Tooltip contentStyle={{ background: "#0b1324", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} formatter={(v) => `${v}%`} />
                        <Legend />
                        <Area type="monotone" dataKey="ECommerce" stackId="1" stroke="#60a5fa" fill="url(#g1)" />
                        <Area type="monotone" dataKey="Electronics" stackId="1" stroke="#34d399" fill="url(#g2)" />
                        <Area type="monotone" dataKey="Fashion" stackId="1" stroke="#fbbf24" fill="url(#g3)" />
                        <Area type="monotone" dataKey="Grocery" stackId="1" stroke="#f472b6" fill="url(#g4)" />
                        <Area type="monotone" dataKey="Other" stackId="1" stroke="#a78bfa" fill="url(#g5)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {active === "states" && (
                  <div className="absolute inset-0 p-2 md:p-4 overflow-hidden">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 h-full">
                      {stateData.map((sd) => (
                        <div key={sd.state} className="rounded-xl bg-black/30 border border-white/10 p-2">
                          <div className="text-xs text-white/70 mb-1">{sd.state}</div>
                          <ResponsiveContainer width="100%" height="85%">
                            <LineChart data={sd.series}>
                              <XAxis dataKey="year" hide />
                              <YAxis hide domain={[0, "dataMax + 20"]} />
                              <Line type="monotone" dataKey="value" stroke="#93c5fd" strokeWidth={1.8} dot={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {active === "projection" && (
                  <div className="absolute inset-0 p-2 md:p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <button onClick={() => setPlaying((p) => !p)} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 border border-white/10 hover:bg-white/15 transition">
                        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        <span className="text-sm">{playing ? "Pause" : "Play"} Projection</span>
                      </button>
                      <div className="text-sm text-white/70">Year: <span className="font-semibold text-white">{projYears[projIndex]}</span></div>
                      <input
                        type="range"
                        min={0}
                        max={projYears.length - 1}
                        value={projIndex}
                        onChange={(e) => setProjIndex(parseInt(e.target.value))}
                        className="w-48"
                      />
                    </div>
                    <ResponsiveContainer width="100%" height="80%">
                      <LineChart data={[...retailAll, ...projections.filter((_, i) => i <= projIndex)]}>
                        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                        <XAxis dataKey="year" stroke="#9ca3af" tick={{ fill: "#9ca3af" }} />
                        <YAxis stroke="#9ca3af" tickFormatter={billionsFmt} tick={{ fill: "#9ca3af" }} />
                        <Tooltip contentStyle={{ background: "#0b1324", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} formatter={(v) => billionsFmt(v)} />
                        <Line type="monotone" dataKey="value" stroke="#a78bfa" strokeWidth={2.4} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Scroll narrative text sections */}
        <div className="max-w-4xl mx-auto px-5">
          <article className="prose prose-invert prose-sm md:prose-base lg:prose-lg">
            <section id="macro" className="min-h-[75vh] flex items-center">
              <div>
                <h2 className="mb-3">Macro Retail Growth</h2>
                <p>
                  India’s retail sector expanded through the 2015–2025 period with noticeable shocks and rebounds. The area chart shows overall retail value (synthetic data for prototype). Notice the scale and the post‑2020 recovery.
                </p>
              </div>
            </section>

            <section id="ecom" className="min-h-[75vh] flex items-center">
              <div>
                <h2 className="mb-3">E‑commerce Mix Rises</h2>
                <p>
                  As you scroll here, the visualization morphs to show <strong>e‑commerce share (%)</strong> of total retail. Use this section to discuss channels, logistics, and changing consumer behavior.
                </p>
              </div>
            </section>

            <section id="events" className="min-h-[75vh] flex items-center">
              <div>
                <h2 className="mb-3">Freeze Points: Major Events</h2>
                <p>
                  We freeze the view to call out structural events: <em>Demonetisation (2016)</em>, <em>GST rollout (2017)</em>, and <em>COVID‑19 (2020)</em>. Each annotation explains short‑term impact and structural shifts (e.g., digital payments, formalisation, channel mix).
                </p>
              </div>
            </section>

            <section id="categories" className="min-h-[75vh] flex items-center">
              <div>
                <h2 className="mb-3">Category Breakdown</h2>
                <p>
                  The chart morphs into a stacked area to compare category mix: Grocery (largest), Fashion, Electronics, Other, and E‑commerce share as a channel proxy. This helps explain where growth concentrates.
                </p>
              </div>
            </section>

            <section id="states" className="min-h-[75vh] flex items-center">
              <div>
                <h2 className="mb-3">Regional Small Multiples</h2>
                <p>
                  Small‑multiple line charts let you compare state‑level trajectories at a glance. Highlight outliers or interesting cross‑overs as discussion points.
                </p>
              </div>
            </section>

            <section id="projection" className="min-h-[75vh] flex items-center">
              <div>
                <h2 className="mb-3">Forward Projection (Play / Pause)</h2>
                <p>
                  Slide or press play to step through 2026–2030 projections (illustrative). In production, plug in your model outputs (e.g., SARIMAX / ML ensemble) and scenario assumptions.
                </p>
              </div>
            </section>
          </article>
        </div>
      </section>

      <footer className="mt-20 py-10 text-center text-white/60 text-sm border-t border-white/10">
        Made by Nidhisha Mohandas | © 2025 CR · Scroll narrative demo · Replace synthetic data with live series via API.
      </footer>
    </div>
  );
}
