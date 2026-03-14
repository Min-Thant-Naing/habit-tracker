import React, { useState, useEffect, useRef } from "react";
import { Settings, X, Plus, Loader2, Trash2, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "./supabaseClient";

interface Habit {
  id: string;
  name: string;
  completions: Record<string, boolean>;
  notes?: Record<string, string>;
  colors?: Record<string, string>;
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
  notes: Record<string, string> | null;
  colors: Record<string, string> | null;
  onDayClick: (habitId: string, key: string, date: Date) => void;
  onDayDoubleClick: (habitId: string, key: string, date: Date) => void;
  dark: boolean;
  year: number;
  editingColor?: { dateKey: string, color: string } | null;
}

const Heatmap: React.FC<HeatmapProps> = ({ habitId, completions, notes, colors, onDayClick, onDayDoubleClick, dark, year, editingColor }) => {
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const monthRefs = useRef<(HTMLDivElement | null)[]>([]);
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressTriggeredRef = useRef(false);
  const months = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sub = dark ? "#8b949e" : "#9ca3af";

  const handlePointerDown = (key: string, date: Date) => {
    if (date > today) return;
    isLongPressTriggeredRef.current = false;
    longPressTimeoutRef.current = setTimeout(() => {
      isLongPressTriggeredRef.current = true;
      onDayDoubleClick(habitId, key, date);
    }, 500);
  };

  const handlePointerUp = (key: string, date: Date) => {
    if (date > today) return;
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
    if (!isLongPressTriggeredRef.current) {
      onDayClick(habitId, key, date);
    }
  };

  const handlePointerCancel = () => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  };

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
          gap: "32px", 
          paddingBottom: "16px",
          scrollbarWidth: "none", 
          msOverflowStyle: "none",
          justifyContent: "flex-start",
          scrollSnapType: "x mandatory",
          scrollBehavior: "smooth",
          width: "100%"
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
                flex: "0 0 auto", 
                scrollSnapAlign: "start",
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                minWidth: "min(360px, 100%)"
              }}
            >
              <div style={{ width: "100%", maxWidth: "360px", padding: "0 4px" }}>
                <div style={{ fontSize: 14, color: sub, fontWeight: 600, marginBottom: "16px", letterSpacing: "0.02em", textTransform: "uppercase" }}>{monthLabel}</div>
                <div style={{ display: "flex", gap: "10px" }}>
                  
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginRight: "12px", width: "28px" }}>
                    {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                      <div key={i} style={{ height: "42px", fontSize: "11px", color: sub, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>{d}</div>
                    ))}
                  </div>
                  
                  <div style={{ display: "flex", gap: "10px" }}>
                    {grid.map((week, wi) => (
                      <div key={wi} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {week.map((date, di) => {
                          if (!date) return <div key={di} style={{ width: "36px", height: "42px" }} />;
                          const key = toKey(date);
                          const isToday = key === toKey(today);
                          const isFuture = date > today;
                          const done = !!(completions && completions[key]);
                          const note = notes && notes[key];
                          const isEditingThisDay = editingColor?.dateKey === key;
                          const dayColor = isEditingThisDay ? editingColor.color : (colors && colors[key]);
                          const bg = done ? (dayColor || "#ff9500") : (dark ? "#21262d" : "#ebedf0"); 
                          
                          return (
                            <motion.div
                              key={key}
                              whileTap={!isFuture ? { scale: 0.85 } : {}}
                              onPointerDown={() => handlePointerDown(key, date)}
                              onPointerUp={() => handlePointerUp(key, date)}
                              onPointerCancel={handlePointerCancel}
                              onPointerLeave={handlePointerCancel}
                              onContextMenu={(e) => { e.preventDefault(); }}
                              onMouseEnter={e => setTip({ x: e.clientX, y: e.clientY, text: date.toLocaleDateString() })}
                              onMouseLeave={() => setTip(null)}
                              style={{
                                width: "36px", height: "42px", borderRadius: "8px",
                                background: bg,
                                cursor: !isFuture ? "pointer" : "default",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "12px",
                                fontWeight: 800,
                                color: done ? "#fff" : (dark ? "#444c56" : "#9ca3af"),
                                userSelect: "none",
                                WebkitUserSelect: "none",
                                WebkitTouchCallout: "none",
                                touchAction: "manipulation",
                                opacity: isFuture ? 0.25 : 1,
                                border: isToday ? `2px solid ${dark ? "#ffc107" : "#ff9500"}` : "none",
                                boxSizing: "border-box",
                                transition: "background 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                                padding: "2px",
                                position: "relative"
                              }}
                            >
                              <span>{date.getDate()}</span>
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
  const [deletedHabits, setDeletedHabits] = useState<Habit[]>([]);
  const [noteModal, setNoteModal] = useState<{ habitId: string, dateKey: string, date: Date } | null>(null);
  const [noteInput, setNoteInput] = useState("");
  const [colorInput, setColorInput] = useState("");
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

      const { data: deletedData, error: deletedError } = await supabase
        .from('deleted_habits')
        .select('*')
        .order('inserted_at', { ascending: false })
        .limit(10);
      
      if (!deletedError && deletedData) {
        setDeletedHabits(deletedData);
      }
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
    const habitToDelete = habits.find(h => h.id === id);
    if (!habitToDelete) return;

    const { error } = await supabase.from('habits').delete().eq('id', id);
    if (!error) {
      setHabits(habits.filter(h => h.id !== id));
      
      const { data, error: insertError } = await supabase.from('deleted_habits').insert([{
        name: habitToDelete.name,
        completions: habitToDelete.completions,
        notes: habitToDelete.notes || {},
        colors: habitToDelete.colors || {}
      }]).select();
      
      if (!insertError && data) {
        setDeletedHabits(prev => [data[0], ...prev].slice(0, 10));
      } else {
        setDeletedHabits(prev => [habitToDelete, ...prev].slice(0, 10));
      }
    }
  }

  async function restoreHabit(habit: Habit) {
    try {
      const { data, error } = await supabase.from('habits').insert([{ 
        name: habit.name, 
        completions: habit.completions,
        notes: habit.notes || {},
        colors: habit.colors || {}
      }]).select();
      
      if (error) throw error;
      if (data) {
        setHabits([...habits, data[0]]);
        
        const { error: deleteError } = await supabase.from('deleted_habits').delete().eq('id', habit.id);
        if (!deleteError) {
          setDeletedHabits(prev => prev.filter(h => h.id !== habit.id));
        } else {
          setDeletedHabits(prev => prev.filter(h => h.id !== habit.id));
        }
      }
    } catch (e: any) {
      console.error("Error restoring habit:", e);
      setError("Failed to restore habit: " + e.message);
    }
  }

  async function permanentlyDeleteHabit(id: string) {
    const { error } = await supabase.from('deleted_habits').delete().eq('id', id);
    if (!error) {
      setDeletedHabits(prev => prev.filter(h => h.id !== id));
    } else {
      setDeletedHabits(prev => prev.filter(h => h.id !== id));
    }
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

  function handleDayClick(habitId: string, key: string, date: Date) {
    toggleDay(habitId, key);
  }

  function handleDayDoubleClick(habitId: string, key: string, date: Date) {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;
    setNoteModal({ habitId, dateKey: key, date });
    setNoteInput(habit.notes?.[key] || "");
    setColorInput(habit.colors?.[key] || "#ff9500");
  }

  async function saveNote() {
    if (!noteModal) return;
    const { habitId, dateKey } = noteModal;
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;

    const newNotes = { ...(habit.notes || {}) };
    if (noteInput.trim()) {
      newNotes[dateKey] = noteInput.trim();
    } else {
      delete newNotes[dateKey];
    }

    const newColors = { ...(habit.colors || {}) };
    if (colorInput && colorInput !== "#ff9500") {
      newColors[dateKey] = colorInput;
    } else {
      delete newColors[dateKey];
    }

    const { error } = await supabase.from('habits').update({ notes: newNotes, colors: newColors }).eq('id', habitId);
    if (!error) {
      setHabits(habits.map(h => h.id === habitId ? { ...h, notes: newNotes, colors: newColors } : h));
      setNoteModal(null);
      setNoteInput("");
      setColorInput("");
    } else {
      console.error("Error saving note/color:", error);
      setError("Failed to save. Make sure 'notes' and 'colors' columns exist in Supabase.");
      setTimeout(() => setError(null), 3000);
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
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 16px 80px" }}>
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

            <Heatmap 
              habitId={h.id} 
              completions={h.completions} 
              notes={h.notes || null}
              colors={h.colors || null}
              onDayClick={handleDayClick} 
              onDayDoubleClick={handleDayDoubleClick}
              dark={dark} 
              year={year} 
              editingColor={noteModal?.habitId === h.id ? { dateKey: noteModal.dateKey, color: colorInput } : null}
            />
            
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

      {/* Floating Error Message */}
      <div style={{
        position: "fixed",
        bottom: "32px",
        left: 0,
        right: 0,
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "0 20px",
        paddingBottom: "env(safe-area-inset-bottom)",
        pointerEvents: "none",
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
      </div>

      {/* Note Modal */}
      <AnimatePresence>
        {noteModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setNoteModal(null)}
              style={{
                position: "fixed", top: 0, bottom: 0, left: 0, right: 0,
                background: "rgba(0,0,0,0.6)", zIndex: 1000, backdropFilter: "blur(4px)"
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, x: "-50%", y: -20 }}
              animate={{ opacity: 1, scale: 1, x: "-50%", y: 0 }}
              exit={{ opacity: 0, scale: 0.9, x: "-50%", y: -20 }}
              style={{
                position: "fixed", top: "10%", left: "50%",
                width: "90%", maxWidth: "400px",
                background: dark ? "#1c1c1e" : "#fff",
                borderRadius: "24px", padding: "24px",
                zIndex: 1001, boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
                display: "flex", flexDirection: "column", gap: "20px",
                maxHeight: "80vh", overflowY: "auto",
                userSelect: "none",
                WebkitUserSelect: "none",
                WebkitTouchCallout: "none"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "14px", color: subCol, fontWeight: 500 }}>{noteModal.date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                  <div style={{ fontSize: "18px", fontWeight: 700, color: textCol }}>{habits.find(h => h.id === noteModal.habitId)?.name}</div>
                </div>
                <button 
                  onClick={() => setNoteModal(null)}
                  style={{ background: "none", border: "none", color: subCol, cursor: "pointer" }}
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)", padding: "12px 16px", borderRadius: "16px" }}>
                <span style={{ color: textCol, fontWeight: 600 }}>Mark as Finished</span>
                <button 
                  onClick={() => toggleDay(noteModal.habitId, noteModal.dateKey)}
                  style={{
                    width: "50px", height: "28px", borderRadius: "14px",
                    background: habits.find(h => h.id === noteModal.habitId)?.completions?.[noteModal.dateKey] ? (colorInput || "#ff9500") : (dark ? "#3a3a3c" : "#d1d1d6"),
                    position: "relative", border: "none", cursor: "pointer", transition: "background 0.3s"
                  }}
                >
                  <motion.div 
                    animate={{ x: habits.find(h => h.id === noteModal.habitId)?.completions?.[noteModal.dateKey] ? 24 : 2 }}
                    style={{ width: "24px", height: "24px", borderRadius: "12px", background: "#fff", position: "absolute", top: 2, left: 0 }}
                  />
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ fontSize: "13px", fontWeight: 600, color: subCol, marginLeft: "4px" }}>COLOR</label>
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                  {["#ff9500", "#ff3b30", "#34c759", "#007aff", "#af52de", "#ff2d55"].map(c => (
                    <button
                      key={c}
                      onClick={() => setColorInput(c)}
                      style={{
                        width: "32px", height: "32px", borderRadius: "16px",
                        background: c, border: "none", cursor: "pointer",
                        boxShadow: colorInput === c ? `0 0 0 3px ${dark ? "#1c1c1e" : "#fff"}, 0 0 0 5px ${c}` : "none",
                        transition: "box-shadow 0.2s"
                      }}
                    />
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ fontSize: "13px", fontWeight: 600, color: subCol, marginLeft: "4px" }}>NOTE</label>
                <textarea 
                  autoFocus
                  value={noteInput}
                  onChange={e => setNoteInput(e.target.value)}
                  placeholder="Add a note for this day..."
                  style={{
                    width: "100%", minHeight: "100px", borderRadius: "16px",
                    background: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                    border: "none", padding: "16px", color: textCol, fontSize: "15px",
                    outline: "none", resize: "none", fontFamily: "inherit",
                    userSelect: "auto",
                    WebkitUserSelect: "auto"
                  }}
                />
              </div>

              <button 
                onClick={saveNote}
                style={{
                  width: "100%", padding: "14px", borderRadius: "16px",
                  background: "#ff9500", color: "#fff", border: "none",
                  fontSize: "16px", fontWeight: 700, cursor: "pointer",
                  boxShadow: "0 8px 24px rgba(255, 149, 0, 0.2)"
                }}
              >
                Save Note
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
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
                      <span style={{ color: textCol, fontWeight: 600, fontSize: 16, width: "40px", textAlign: "center" }}>{year}</span>
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

                <div style={{ fontSize: 13, color: subCol, textTransform: "uppercase", padding: "0 16px 8px", fontWeight: 500 }}>Add Habit</div>
                <div style={{ background: dark ? "#161b22" : "#fff", borderRadius: 12, overflow: "hidden", marginBottom: 24, border: dark ? "1px solid #30363d" : "1px solid #e5e7eb", display: "flex", padding: "8px" }}>
                  <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
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
                      fontSize: "16px", 
                      color: textCol, 
                      outline: "none",
                      padding: "8px 12px",
                    }}
                  />
                  <button 
                    onClick={addHabit}
                    disabled={isAdding || !input.trim()}
                    style={{
                      background: "#ff9500",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      padding: "8px 16px",
                      fontWeight: 600,
                      cursor: isAdding || !input.trim() ? "default" : "pointer",
                      opacity: isAdding || !input.trim() ? 0.5 : 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: "60px"
                    }}
                  >
                    {isAdding ? <Loader2 size={18} className="animate-spin" /> : "Add"}
                  </button>
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

                {deletedHabits.length > 0 && (
                  <>
                    <div style={{ fontSize: 13, color: subCol, textTransform: "uppercase", padding: "24px 16px 8px", fontWeight: 500 }}>Recovery</div>
                    <div style={{ background: dark ? "#161b22" : "#fff", borderRadius: 12, overflow: "hidden", border: dark ? "1px solid #30363d" : "1px solid #e5e7eb" }}>
                      {deletedHabits.map((h, i) => (
                        <div 
                          key={h.id} 
                          style={{ 
                            padding: "12px 16px", 
                            display: "flex", 
                            justifyContent: "space-between", 
                            alignItems: "center",
                            borderBottom: i === deletedHabits.length - 1 ? "none" : (dark ? "1px solid #30363d" : "1px solid #e5e7eb")
                          }}
                        >
                          <span style={{ color: textCol, fontSize: 15, opacity: 0.7 }}>{h.name}</span>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button 
                              onClick={() => restoreHabit(h)}
                              style={{ 
                                background: dark ? "rgba(255, 149, 0, 0.1)" : "rgba(255, 149, 0, 0.05)", 
                                color: "#ff9500", 
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
                              <RotateCcw size={14} /> Restore
                            </button>
                            <button 
                              onClick={() => permanentlyDeleteHabit(h.id)}
                              style={{ 
                                background: "none", 
                                color: "#ff3b30", 
                                border: "none", 
                                padding: "4px 8px", 
                                fontSize: 12, 
                                cursor: "pointer" 
                              }}
                            >
                              Clear
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
