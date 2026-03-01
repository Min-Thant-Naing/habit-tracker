import React, { useState, useEffect, useRef } from "react";
import { Settings, X, Plus, Loader2, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "./supabaseClient";

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
      scrollRef.current.scrollTo({
        left: target.offsetLeft,
        behavior: "auto"
      });
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
          gap: "24px", 
          paddingBottom: "10px",
          scrollbarWidth: "none", 
          msOverflowStyle: "none",
          justifyContent: "flex-start",
          scrollSnapType: "x mandatory",
          scrollBehavior: "smooth"
        }} className="no-scrollbar">
        <style>{`.no-scrollbar::-webkit-scrollbar { display: none; }`}</style>

        {months.map(m => {
          const monthLabel = new Date(year, m).toLocaleString("default", { month: "long" });
          const grid = buildMonthGrid(year, m);
          
          return (
            <div 
              key={m} 
              ref={el => monthRefs.current[m] = el}
              style={{ 
                flex: "0 0 100%", 
                scrollSnapAlign: "start",
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column",
                alignItems: "center"
              }}
            >
              <div style={{ width: "100%", maxWidth: "320px" }}>
                <div style={{ fontSize: 14, color: sub, fontWeight: 600, marginBottom: "16px", letterSpacing: "0.02em", textTransform: "uppercase" }}>{monthLabel}</div>
                <div style={{ display: "flex", gap: "10px" }}>
                  
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginRight: "12px", width: "28px" }}>
                    {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                      <div key={i} style={{ height: "32px", fontSize: "11px", color: sub, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>{d}</div>
                    ))}
                  </div>
                  
                  <div style={{ display: "flex", gap: "10px" }}>
                    {grid.map((week, wi) => (
                      <div key={wi} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {week.map((date, di) => {
                          if (!date) return <div key={di} style={{ width: "36px", height: "32px" }} />;
                          const key = toKey(date);
                          const isToday = key === toKey(today);
                          const isFuture = date > today;
                          const done = !!(completions && completions[key]);
                          const bg = done ? "#ff9500" : (dark ? "#21262d" : "#ebedf0"); 
                          
                          return (
                            <motion.div
                              key={key}
                              whileTap={!isFuture ? { scale: 0.85 } : {}}
                              onClick={() => { if (!isFuture) onToggle(habitId, key); }}
                              onMouseEnter={e => setTip({ x: e.clientX, y: e.clientY, text: date.toLocaleDateString() })}
                              onMouseLeave={() => setTip(null)}
                              style={{
                                width: "36px", height: "32px", borderRadius: "8px",
                                background: bg,
                                cursor: !isFuture ? "pointer" : "default",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "12px",
                                fontWeight: 800,
                                color: done ? "#fff" : (dark ? "#444c56" : "#9ca3af"),
                                userSelect: "none",
                                touchAction: "manipulation",
                                opacity: isFuture ? 0.25 : 1,
                                border: isToday ? `2px solid ${dark ? "#ffc107" : "#ff9500"}` : "none",
                                boxSizing: "border-box",
                                transition: "background 0.25s cubic-bezier(0.4, 0, 0.2, 1)"
                              }}
                            >
                              {date.getDate()}
                            </motion.div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
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
    <div style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: isLast ? "none" : (dark ? "1px solid #30363d" : "1px solid #e5e7eb") }}>
      <span style={{ color: textCol, fontSize: 16, fontWeight: 500 }}>{habit.name}</span>
      <div style={{ display: "flex", alignItems: "center" }}>
        <AnimatePresence mode="wait">
          {!confirming ? (
            <motion.button 
              key="delete"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={() => setConfirming(true)}
              style={{ 
                color: "#ff3b30", 
                background: dark ? "rgba(255, 59, 48, 0.1)" : "rgba(255, 59, 48, 0.05)", 
                border: "none", 
                padding: "6px 10px",
                borderRadius: "8px",
                fontSize: 13, 
                fontWeight: 600, 
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              <Trash2 size={14} />
              Delete
            </motion.button>
          ) : (
            <motion.div 
              key="confirm"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              style={{ display: "flex", gap: 8 }}
            >
              <button 
                onClick={() => setConfirming(false)}
                style={{ 
                  color: subCol, 
                  background: dark ? "#21262d" : "#f3f4f6", 
                  border: "none", 
                  padding: "6px 12px",
                  borderRadius: "8px",
                  fontSize: 13, 
                  fontWeight: 600, 
                  cursor: "pointer" 
                }}
              >
                Cancel
              </button>
              <button 
                onClick={() => onDelete(habit.id)}
                style={{ 
                  color: "#fff", 
                  background: "#ff3b30", 
                  border: "none", 
                  padding: "6px 12px",
                  borderRadius: "8px",
                  fontSize: 13, 
                  fontWeight: 600, 
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(255, 59, 48, 0.3)"
                }}
              >
                Confirm
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
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
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchHabits();
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setDark(e.matches);
    mq.addEventListener("change", handler);

    return () => {
      mq.removeEventListener("change", handler);
    };
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
    setLoading(true);
    setError(null);
    try {
      const { data, error: supabaseError } = await supabase
        .from('habits')
        .select('*')
        .order('inserted_at', { ascending: true });
      
      if (supabaseError) throw supabaseError;
      setHabits(data || []);
    } catch (err: any) {
      console.error("Error fetching habits:", err);
      setError(err.message === "Failed to fetch" 
        ? "Network error: Could not connect to Supabase. Please check your internet connection and Supabase URL." 
        : `Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function addHabit() {
    const name = input.trim();
    if (!name || isAdding) return;
    
    setIsAdding(true);
    setError(null);
    try {
      const { data, error: supabaseError } = await supabase.from('habits').insert([{ name, completions: {} }]).select();
      if (supabaseError) throw supabaseError;
      if (data) {
        setHabits([...habits, data[0]]);
        setInput("");
        setIsFocused(false);
        inputRef.current?.blur();
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to add habit. Check your Supabase connection.");
      // Clear error after 3 seconds
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsAdding(false);
    }
  }

  async function deleteHabit(id: string) {
    const { error } = await supabase.from('habits').delete().eq('id', id);
    if (!error) setHabits(habits.filter(h => h.id !== id));
  }

  async function updateHabitName(id: string, newName: string) {
    if (!newName.trim()) {
      setEditingHabitId(null);
      return;
    }
    try {
      const { error: supabaseError } = await supabase
        .from('habits')
        .update({ name: newName.trim() })
        .eq('id', id);
      if (supabaseError) throw supabaseError;
      setHabits(habits.map(h => h.id === id ? { ...h, name: newName.trim() } : h));
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to update habit name.");
      setTimeout(() => setError(null), 3000);
    } finally {
      setEditingHabitId(null);
    }
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
      flexDirection: "column",
      alignItems: "center", 
      justifyContent: "center",
      gap: "20px",
      padding: "20px",
      textAlign: "center"
    }}>
      <div style={{ fontSize: "15px", fontWeight: 500 }}>Loading habit tracker app... ✨</div>
      {error && (
        <div style={{ maxWidth: "400px" }}>
          <div style={{ color: "#ff3b30", fontSize: "13px", marginBottom: "16px" }}>{error}</div>
          <button 
            onClick={fetchHabits}
            style={{
              background: "#ff9500",
              color: "#fff",
              border: "none",
              padding: "8px 20px",
              borderRadius: "20px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Retry Connection
          </button>
        </div>
      )}
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
              <div style={{ flex: 1 }}>
                {editingHabitId === h.id ? (
                  <input
                    autoFocus
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onBlur={() => updateHabitName(h.id, editValue)}
                    onKeyDown={e => {
                      if (e.key === "Enter") updateHabitName(h.id, editValue);
                      if (e.key === "Escape") setEditingHabitId(null);
                    }}
                    style={{
                      fontSize: "17px",
                      fontWeight: "600",
                      color: textCol,
                      background: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                      border: "none",
                      borderRadius: "6px",
                      outline: "none",
                      padding: "4px 8px",
                      marginLeft: "-8px",
                      width: "100%",
                      maxWidth: "300px"
                    }}
                  />
                ) : (
                  <div 
                    onDoubleClick={() => {
                      setEditingHabitId(h.id);
                      setEditValue(h.name);
                    }}
                    style={{ fontSize: "17px", fontWeight: "600", color: textCol, cursor: "pointer", userSelect: "none" }}
                    title="Double click to edit"
                  >
                    {h.name}
                  </div>
                )}
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
        bottom: isFocused ? "8px" : "32px",
        left: 0,
        right: 0,
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "0 20px",
        paddingBottom: "env(safe-area-inset-bottom)",
        pointerEvents: "none",
        transition: "bottom 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        willChange: "bottom"
      }}>
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              style={{
                background: "#ff3b30",
                color: "#fff",
                padding: "8px 16px",
                borderRadius: "12px",
                fontSize: "13px",
                fontWeight: 600,
                marginBottom: "12px",
                boxShadow: "0 4px 12px rgba(255, 59, 48, 0.3)",
                pointerEvents: "auto",
                alignSelf: "center" // Keep error centered
              }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Add Habit Bar - Safari Style (Always Open) */}
        <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
          <motion.div 
            layout
            style={{
              pointerEvents: "auto",
              width: "calc(100% - 40px)",
              maxWidth: "420px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "14px 24px",
              borderRadius: "35px",
              background: dark ? "rgba(28, 28, 30, 0.65)" : "rgba(255, 255, 255, 0.75)",
              backdropFilter: "blur(30px) saturate(180%)",
              WebkitBackdropFilter: "blur(30px) saturate(180%)",

              boxShadow: isFocused
                ? (dark ? "0 0 0 4px rgba(255, 149, 0, 0.15), 0 12px 48px rgba(0,0,0,0.4)" : "0 0 0 4px rgba(255, 149, 0, 0.1), 0 12px 48px rgba(0,0,0,0.1)")
                : (dark ? "0 12px 48px rgba(0,0,0,0.4)" : "0 12px 48px rgba(0,0,0,0.1)"),
              overflow: "hidden",
              minHeight: "56px",
              transition: "border 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
            }}
          >
            <AnimatePresence mode="wait">
              {showSuccess ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  style={{ 
                    flex: 1, 
                    textAlign: "center", 
                    color: "#ff9500", 
                    fontWeight: 600,
                    fontSize: "17px",
                    letterSpacing: "-0.01em"
                  }}
                >
                  Habit added!
                </motion.div>
              ) : (
                <motion.input
                  key="input"
                  ref={inputRef}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      addHabit();
                    }
                  }}
                  placeholder="Type New Habit...."
                  style={{ 
                    flex: 1, 
                    background: "transparent", 
                    border: "none", 
                    fontSize: "17px", 
                    color: textCol, 
                    outline: "none",
                    width: "100%",
                    fontWeight: 400,
                    textAlign: "center",
                    letterSpacing: "-0.02em"
                  }}
                />
              )}
            </AnimatePresence>

            {isAdding && (
              <Loader2 size={20} strokeWidth={3} className="animate-spin" style={{ color: "#ff9500" }} />
            )}
          </motion.div>
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
