import React, { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { Settings, X, Plus, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// --- PASTE YOUR ACTUAL KEYS HERE ---
const SUPABASE_URL = "https://lrpcrhhlfjkepnsfdamy.supabase.co"; 
const SUPABASE_KEY = "sb_publishable_kz6i62zm_68PD714_sMlsg_5n2QFZgs";
// ------------------------------------

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface Habit {
  id: string;
  name: string;
  completions: Record<string, boolean>;
  inserted_at: string;
}

function toKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildMonthGrid(year: number, month: number): (Date | null)[][] {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  const weeks: (Date | null)[][] = [];
  let currentWeek: (Date | null)[] = Array(7).fill(null);
  
  for (let d = 1; d <= end.getDate(); d++) {
    const date = new Date(year, month, d);
    const dayOfWeek = date.getDay(); 
    currentWeek[dayOfWeek] = date;
    
    if (dayOfWeek === 6 || d === end.getDate()) {
      weeks.push(currentWeek);
      currentWeek = Array(7).fill(null);
    }
  }
  return weeks;
}

function getStreak(completions: Record<string, boolean> | null): number {
  if (!completions) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let s = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (completions[toKey(d)]) s++;
    else break;
  }
  return s;
}

interface HeatmapProps {
  habitId: string;
  completions: Record<string, boolean> | null;
  onToggle: (id: string, key: string) => Promise<void>;
  dark: boolean;
  year: number;
}

const Heatmap: React.FC<HeatmapProps> = ({ habitId, completions, onToggle, dark, year }) => {
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const monthRefs = useRef<(HTMLDivElement | null)[]>([]);
  const months = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sub = dark ? "#8b949e" : "#9ca3af";

  useEffect(() => {
    const currentMonth = new Date().getMonth();
    const target = monthRefs.current[currentMonth];
    if (target && scrollRef.current) {
      // Set scrollLeft directly to avoid vertical page scrolling
      // We subtract a small amount (e.g., 10px) to give some breathing room
      scrollRef.current.scrollLeft = target.offsetLeft - 10;
    }
  }, []);

  return (
    <div style={{ position: "relative" }}>
      {tip && (
        <div style={{
          position: "fixed", left: tip.x, top: tip.y - 38,
          transform: "translateX(-50%)",
          background: dark ? "#f0f6fc" : "#24292f",
          color: dark ? "#111" : "#fff",
          fontSize: 11, fontWeight: 500,
          padding: "4px 9px", borderRadius: 6,
          pointerEvents: "none", whiteSpace: "nowrap",
          zIndex: 9999, boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
        }}>{tip.text}</div>
      )}
      
      <div 
        ref={scrollRef}
        style={{ 
          display: "flex", 
          overflowX: "auto", 
          gap: "40px", 
          paddingBottom: "10px",
          scrollbarWidth: "none", 
          msOverflowStyle: "none",
          justifyContent: "flex-start"
        }} className="no-scrollbar">
        <style>{`.no-scrollbar::-webkit-scrollbar { display: none; }`}</style>

        {months.map(m => {
          const monthLabel = new Date(year, m).toLocaleString("default", { month: "short" });
          const grid = buildMonthGrid(year, m);
          
          return (
            <div 
              key={m} 
              ref={el => monthRefs.current[m] = el}
              style={{ flex: "0 0 auto" }}
            >
              <div style={{ fontSize: 13, color: sub, fontWeight: 600, marginBottom: "12px" }}>{monthLabel}</div>
              <div style={{ display: "flex", gap: "6px" }}>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginRight: "12px", width: "24px" }}>
                  {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                    <div key={i} style={{ height: "24px", fontSize: "11px", color: sub, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>{d}</div>
                  ))}
                </div>
                
                <div style={{ display: "flex", gap: "6px" }}>
                  {grid.map((week, wi) => (
                    <div key={wi} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {week.map((date, di) => {
                        if (!date) return <div key={di} style={{ width: "28px", height: "24px" }} />;
                        const key = toKey(date);
                        const isToday = key === toKey(today);
                        const isFuture = date > today;
                        const done = !!(completions && completions[key]);
                        const bg = done ? "#ff9500" : (dark ? "#21262d" : "#ebedf0"); 
                        
                        return (
                          <div
                            key={key}
                            onClick={() => { if (!isFuture) onToggle(habitId, key); }}
                            onMouseEnter={e => setTip({ x: e.clientX, y: e.clientY, text: date.toLocaleDateString() })}
                            onMouseLeave={() => setTip(null)}
                            style={{
                              width: "28px", height: "24px", borderRadius: "4px",
                              background: bg,
                              cursor: !isFuture ? "pointer" : "default",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "10px",
                              fontWeight: 800,
                              color: done ? "#fff" : (dark ? "#444c56" : "#9ca3af"),
                              userSelect: "none",
                              touchAction: "manipulation",
                              opacity: isFuture ? 0.25 : 1,
                              border: isToday ? `2px solid ${dark ? "#ffc107" : "#ff9500"}` : "none",
                              boxSizing: "border-box"
                            }}
                          >
                            {date.getDate()}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface SettingsHabitItemProps {
  habit: Habit;
  onDelete: (id: string) => Promise<void>;
  dark: boolean;
  textCol: string;
  subCol: string;
  isLast: boolean;
}

const SettingsHabitItem: React.FC<SettingsHabitItemProps> = ({ habit, onDelete, dark, textCol, subCol, isLast }) => {
  const [confirming, setConfirming] = useState(false);
  
  return (
    <div style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: isLast ? "none" : (dark ? "1px solid #30363d" : "1px solid #e5e7eb") }}>
      <span style={{ color: textCol, fontSize: 16 }}>{habit.name}</span>
      {!confirming ? (
        <button 
          onClick={() => setConfirming(true)}
          style={{ color: "#ff3b30", background: "none", border: "none", fontSize: 14, fontWeight: 500, cursor: "pointer" }}
        >
          Delete
        </button>
      ) : (
        <div style={{ display: "flex", gap: 12 }}>
          <button 
            onClick={() => setConfirming(false)}
            style={{ color: subCol, background: "none", border: "none", fontSize: 14, fontWeight: 500, cursor: "pointer" }}
          >
            Cancel
          </button>
          <button 
            onClick={() => onDelete(habit.id)}
            style={{ color: "#ff3b30", background: "none", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
          >
            Confirm?
          </button>
        </div>
      )}
    </div>
  );
};

export default function App() {
  const currentYear = new Date().getFullYear();
  const [dark, setDark] = useState(() => window.matchMedia("(prefers-color-scheme: dark)").matches);
  const [year, setYear] = useState(currentYear);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [input, setInput] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    fetchHabits();
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const baseColor = dark ? "#0d1117" : "#fbfaf7";
    // If settings is open, we want the status bar to dim with the backdrop
    const color = isSettingsOpen ? (dark ? "#05070a" : "#939597") : baseColor;
    
    document.body.style.backgroundColor = baseColor;
    document.documentElement.style.backgroundColor = baseColor;
    
    if (dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Ensure the theme-color meta tag is exactly the same as the background
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      (meta as HTMLMetaElement).name = "theme-color";
      document.head.appendChild(meta);
    }
    (meta as HTMLMetaElement).content = color;
    
    // Apple-specific meta tag for status bar style
    let appleMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (!appleMeta) {
      appleMeta = document.createElement('meta');
      (appleMeta as HTMLMetaElement).name = "apple-mobile-web-app-status-bar-style";
      document.head.appendChild(appleMeta);
    }
    (appleMeta as HTMLMetaElement).content = "black-translucent";
  }, [dark, isSettingsOpen]);

  async function fetchHabits() {
    try {
      const { data, error } = await supabase
        .from('habits')
        .select('*')
        .order('inserted_at', { ascending: true });
      
      if (error) throw error;
      setHabits(data || []);
    } catch (error: any) {
      console.error("Error fetching habits:", error.message);
    } finally {
      setLoading(false);
    }
  }

  async function addHabit() {
    const name = input.trim();
    if (!name || isAdding) return;
    
    setIsAdding(true);
    try {
      const { data, error } = await supabase.from('habits').insert([{ name, completions: {} }]).select();
      if (!error && data) {
        setHabits([...habits, data[0]]);
        setInput("");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAdding(false);
    }
  }

  async function deleteHabit(id: string) {
    const { error } = await supabase.from('habits').delete().eq('id', id);
    if (!error) setHabits(habits.filter(h => h.id !== id));
  }

  async function toggleDay(id: string, key: string) {
    const habit = habits.find(h => h.id === id);
    if (!habit) return;
    const newCompletions = { ...(habit.completions || {}) };
    newCompletions[key] ? delete newCompletions[key] : (newCompletions[key] = true);

    const { error } = await supabase.from('habits').update({ completions: newCompletions }).eq('id', id);
    if (!error) {
      setHabits(habits.map(h => h.id === id ? { ...h, completions: newCompletions } : h));
    }
  }

  const bg = dark ? "#0d1117" : "#fbfaf7";
  const textCol = dark ? "#e6edf3" : "#111827";
  const subCol = dark ? "#8b949e" : "#9ca3af";

  if (loading) return (
    <div style={{ 
      background: bg, 
      minHeight: "100vh", 
      color: textCol, 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center",
      fontSize: "15px",
      fontWeight: 500
    }}>
      Loading habit tracker app... 🌱
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: bg, fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif", transition: "background 0.3s" }}>
      
      {/* Header */}
      <div style={{ padding: "30px 24px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 24, fontWeight: 700, color: textCol, letterSpacing: "-0.5px" }}>Habit Tracker ✨</span>
        <button 
          onClick={() => setIsSettingsOpen(true)}
          style={{ background: "none", border: "none", color: subCol, cursor: "pointer", padding: 4 }}
        >
          <Settings size={22} />
        </button>
      </div>

      {/* Habit List */}
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 16px 180px" }}>
        {habits.length === 0 && <div style={{ textAlign: "center", color: subCol, marginTop: 60, fontSize: 13 }}>No habits yet 🌱</div>}
        {habits.map((h: Habit, index: number) => (
          <div key={h.id} style={{ padding: "20px 0", marginBottom: "10px" }}>
            
            {/* Card Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
              <div>
                <div style={{ fontSize: "17px", fontWeight: "600", color: textCol }}>{h.name}</div>
              </div>
            </div>

            <Heatmap habitId={h.id} completions={h.completions} onToggle={toggleDay} dark={dark} year={year} />
            
            {/* Long centered horizontal line after habit - only if not last */}
            {index < habits.length - 1 && (
              <div style={{ 
                height: "1px", 
                width: "100%", 
                background: dark ? "#30363d" : "#d1d5db", 
                marginTop: "32px",
                borderRadius: "1px",
                opacity: 0.7
              }} />
            )}
          </div>
        ))}
      </div>

      {/* Floating Safari-Style Bar */}
      <div style={{
        position: "fixed",
        bottom: "40px",
        left: 0,
        right: 0,
        zIndex: 100,
        display: "flex",
        justifyContent: "center",
        padding: "0 20px",
        pointerEvents: "none"
      }}>
        <div style={{
          pointerEvents: "auto",
          width: "100%",
          maxWidth: "450px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "8px 8px 8px 20px",
          background: dark ? "rgba(13, 17, 23, 0.85)" : "rgba(255, 255, 255, 0.9)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          borderRadius: "32px",
          border: dark ? "1px solid #30363d" : "1px solid #e5e7eb",
          boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
        }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addHabit()}
            placeholder="New habit..."
            style={{ flex: 1, background: "transparent", border: "none", fontSize: "17px", color: textCol, outline: "none" }}
          />
          <motion.button 
            onClick={addHabit} 
            disabled={isAdding}
            whileHover={isAdding ? {} : { scale: 1.05 }}
            whileTap={isAdding ? {} : { scale: 0.92 }}
            style={{
              width: "52px",
              height: "52px",
              background: "#ff9500",
              color: "#ffffff",
              border: "none",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: isAdding ? "default" : "pointer",
              flexShrink: 0,
              boxShadow: "0 4px 12px rgba(255, 149, 0, 0.4)",
              opacity: isAdding ? 0.8 : 1,
              transition: "background 0.2s ease, opacity 0.2s ease"
            }}
          >
            {isAdding ? (
              <Loader2 size={28} strokeWidth={3} className="animate-spin" />
            ) : (
              <Plus size={28} strokeWidth={3} />
            )}
          </motion.button>
        </div>
      </div>

      {/* Settings Bottom Sheet */}
      <AnimatePresence>
        {isSettingsOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              style={{
                position: "fixed",
                top: "-100px",
                bottom: 0,
                left: 0,
                right: 0,
                height: "calc(100% + 100px)",
                background: "rgba(0,0,0,0.4)",
                zIndex: 200,
                backdropFilter: "blur(4px)"
              }}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              style={{
                position: "fixed",
                bottom: 0,
                left: 0,
                right: 0,
                background: bg,
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                zIndex: 300,
                maxHeight: "90vh",
                overflowY: "auto",
                padding: "20px 0 40px"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 20px 20px", borderBottom: dark ? "1px solid #21262d" : "1px solid #e5e7eb" }}>
                <span style={{ fontSize: 20, fontWeight: 700, color: textCol }}>Settings</span>
                <button onClick={() => setIsSettingsOpen(false)} style={{ background: dark ? "#21262d" : "#e3e3e8", border: "none", borderRadius: "50%", width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: subCol }}>
                  <X size={18} />
                </button>
              </div>

              <div style={{ padding: "20px" }}>
                <div style={{ background: dark ? "#161b22" : "#fff", borderRadius: 12, overflow: "hidden", marginBottom: 24, border: dark ? "1px solid #30363d" : "1px solid #e5e7eb" }}>
                  <div style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: textCol, fontSize: 16 }}>Year</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <button 
                        onClick={() => setYear(y => y - 1)} 
                        style={{ color: textCol, background: "none", border: "none", fontSize: 20, cursor: "pointer", padding: "0 4px", display: "flex", alignItems: "center" }}
                      >
                        ‹
                      </button>
                      <span style={{ color: textCol, fontWeight: 600, fontSize: 16 }}>{year}</span>
                      <button 
                        onClick={() => setYear(y => Math.min(y + 1, currentYear))} 
                        style={{ 
                          color: textCol, 
                          opacity: year >= currentYear ? 0.3 : 1,
                          background: "none", 
                          border: "none", 
                          fontSize: 20, 
                          cursor: year >= currentYear ? "default" : "pointer", 
                          padding: "0 4px",
                          display: "flex", 
                          alignItems: "center"
                        }}
                      >
                        ›
                      </button>
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: 13, color: subCol, textTransform: "uppercase", padding: "0 16px 8px", fontWeight: 500 }}>Manage Habits</div>
                <div style={{ background: dark ? "#161b22" : "#fff", borderRadius: 12, overflow: "hidden", border: dark ? "1px solid #30363d" : "1px solid #e5e7eb" }}>
                  {habits.map((h, i) => (
                    <SettingsHabitItem 
                      key={h.id} 
                      habit={h} 
                      onDelete={deleteHabit} 
                      dark={dark} 
                      textCol={textCol} 
                      subCol={subCol} 
                      isLast={i === habits.length - 1} 
                    />
                  ))}
                  {habits.length === 0 && <div style={{ padding: "12px 16px", color: subCol, fontSize: 14 }}>No habits to manage</div>}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
