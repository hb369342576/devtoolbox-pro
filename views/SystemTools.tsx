import React, { useState, useEffect, useRef } from 'react';
import { 
  Clock, 
  RefreshCcw, 
  Cpu, 
  HardDrive, 
  Wifi, 
  Activity, 
  Play, 
  Pause, 
  RotateCcw, 
  Calendar as CalendarIcon, 
  Globe, 
  ArrowRightLeft,
  ChevronLeft,
  ChevronRight,
  Check,
  Laptop,
  Box,
  Terminal,
  Timer
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Language } from '../types';

/* --- 1. Custom Components --- */

// --- Theme Constants for Clock ---
const CLOCK_THEMES = {
  ocean: {
    label: 'Ocean',
    bg: 'bg-gradient-to-br from-blue-600 to-cyan-500',
    text: 'text-white',
    subText: 'text-blue-100'
  },
  sunset: {
    label: 'Sunset',
    bg: 'bg-gradient-to-br from-orange-500 to-rose-600',
    text: 'text-white',
    subText: 'text-orange-100'
  },
  cyber: {
    label: 'Cyberpunk',
    bg: 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900',
    text: 'text-neon-blue',
    subText: 'text-purple-200'
  },
  forest: {
    label: 'Forest',
    bg: 'bg-gradient-to-br from-emerald-600 to-teal-700',
    text: 'text-white',
    subText: 'text-emerald-100'
  }
};

type ClockThemeKey = keyof typeof CLOCK_THEMES;

// --- Modern Date Picker Component ---
interface ModernDatePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  lang: Language;
}

const ModernDatePicker: React.FC<ModernDatePickerProps> = ({ value, onChange, lang }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date(value));
  const [inputValue, setInputValue] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const isTypingRef = useRef(false);

  // Sync view when external value changes
  useEffect(() => {
    if (!isTypingRef.current) {
      setViewDate(new Date(value));
      setInputValue(formatDateForInput(value));
    }
  }, [value]);

  const formatDateForInput = (date: Date) => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    isTypingRef.current = true;
    const val = e.target.value;
    setInputValue(val);

    // Try to parse input
    const timestamp = Date.parse(val.replace(/-/g, '/')); // Replace - with / for better browser support
    if (!isNaN(timestamp)) {
      const newDate = new Date(timestamp);
      onChange(newDate);
      setViewDate(newDate);
    }
  };

  const handleBlur = () => {
    isTypingRef.current = false;
    // Reset input to formatted valid date on blur
    setInputValue(formatDateForInput(value));
  };

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };
  
  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleDateClick = (day: number) => {
    const newDate = new Date(value);
    newDate.setFullYear(viewDate.getFullYear());
    newDate.setMonth(viewDate.getMonth());
    newDate.setDate(day);
    onChange(newDate);
    setInputValue(formatDateForInput(newDate));
    isTypingRef.current = false;
  };

  const handleTimeChange = (type: 'hours' | 'minutes' | 'seconds', val: string) => {
    const num = parseInt(val);
    if (isNaN(num)) return;
    const newDate = new Date(value);
    if (type === 'hours') newDate.setHours(Math.min(23, Math.max(0, num)));
    if (type === 'minutes') newDate.setMinutes(Math.min(59, Math.max(0, num)));
    if (type === 'seconds') newDate.setSeconds(Math.min(59, Math.max(0, num)));
    onChange(newDate);
    setInputValue(formatDateForInput(newDate));
  };

  const renderCalendarGrid = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const totalDays = daysInMonth(year, month);
    const startDay = firstDayOfMonth(year, month);
    
    const blanks = Array(startDay).fill(null);
    const days = Array.from({ length: totalDays }, (_, i) => i + 1);
    
    return (
      <div className="grid grid-cols-7 gap-1 mb-4">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <div key={d} className="text-center text-xs font-medium text-slate-400 py-1">{d}</div>
        ))}
        {[...blanks, ...days].map((day, idx) => {
          if (!day) return <div key={`blank-${idx}`} />;
          const isSelected = 
            value.getDate() === day && 
            value.getMonth() === month && 
            value.getFullYear() === year;
          
          return (
            <button
              key={day}
              onClick={() => handleDateClick(day)}
              className={`
                h-8 w-8 rounded-full text-sm flex items-center justify-center transition-all
                ${isSelected 
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' 
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}
              `}
            >
              {day}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <div 
        className={`
          flex items-center w-full px-4 py-3 bg-white dark:bg-slate-900 
          border border-slate-300 dark:border-slate-600 rounded-xl
          hover:border-blue-500 dark:hover:border-blue-400 transition-colors group
          ${isOpen ? 'ring-2 ring-blue-500/20 border-blue-500' : ''}
        `}
      >
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="mr-3 text-slate-400 group-hover:text-blue-500 transition-colors"
        >
          <CalendarIcon size={18} />
        </button>
        <input 
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          placeholder="YYYY-MM-DD HH:mm:ss"
          className="flex-1 bg-transparent border-none outline-none font-mono text-sm text-slate-700 dark:text-slate-200"
        />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 p-4 animate-in fade-in zoom-in-95 duration-200">
           {/* Header */}
           <div className="flex items-center justify-between mb-4">
              <button onClick={handlePrevMonth} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-500"><ChevronLeft size={16} /></button>
              <span className="font-bold text-slate-700 dark:text-slate-200">
                {viewDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
              </span>
              <button onClick={handleNextMonth} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-500"><ChevronRight size={16} /></button>
           </div>
           
           {/* Calendar */}
           {renderCalendarGrid()}
           
           {/* Time Inputs */}
           <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase">Time</span>
              <div className="flex items-center space-x-1">
                 <input 
                   type="number" 
                   min="0" max="23"
                   value={String(value.getHours()).padStart(2, '0')} 
                   onChange={(e) => handleTimeChange('hours', e.target.value)}
                   className="w-10 p-1 text-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded text-sm font-mono dark:text-white outline-none focus:border-blue-500"
                 />
                 <span className="text-slate-400">:</span>
                 <input 
                   type="number" 
                   min="0" max="59"
                   value={String(value.getMinutes()).padStart(2, '0')} 
                   onChange={(e) => handleTimeChange('minutes', e.target.value)}
                   className="w-10 p-1 text-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded text-sm font-mono dark:text-white outline-none focus:border-blue-500"
                 />
                 <span className="text-slate-400">:</span>
                 <input 
                   type="number" 
                   min="0" max="59"
                   value={String(value.getSeconds()).padStart(2, '0')} 
                   onChange={(e) => handleTimeChange('seconds', e.target.value)}
                   className="w-10 p-1 text-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded text-sm font-mono dark:text-white outline-none focus:border-blue-500"
                 />
              </div>
           </div>
        </div>
      )}
    </div>
  );
};


/* --- 2. Main Time Utility Component --- */

const TIMEZONES = [
  { value: 'local', label: 'Local Time' },
  { value: 'UTC', label: 'UTC' },
  { value: 'Asia/Shanghai', label: 'Beijing' },
  { value: 'Asia/Tokyo', label: 'Tokyo' },
  { value: 'America/New_York', label: 'New York' },
  { value: 'Europe/London', label: 'London' },
];

const DATE_FORMATS = [
  { value: 'local', label: 'YYYY-MM-DD HH:mm:ss' },
  { value: 'date', label: 'YYYY-MM-DD' },
  { value: 'iso', label: 'ISO 8601 (T/Z)' },
  { value: 'utc', label: 'UTC String' },
];

export const TimeUtility: React.FC<{ lang: Language }> = ({ lang }) => {
  // --- World Clock State ---
  const [now, setNow] = useState(new Date());
  const [selectedTz, setSelectedTz] = useState('local');
  const [clockTheme, setClockTheme] = useState<ClockThemeKey>('ocean');

  // --- Timer State ---
  const [timerTime, setTimerTime] = useState(0); // in ms
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerRef = useRef<number | null>(null);

  // --- Converter State ---
  const [tsInput, setTsInput] = useState(String(Date.now()));
  const [tsUnit, setTsUnit] = useState<'ms' | 's'>('ms');
  const [currentDateObj, setCurrentDateObj] = useState(new Date()); // Source of truth for date picker
  const [displayFormat, setDisplayFormat] = useState('local');
  const [outputStr, setOutputStr] = useState('');

  // 1. Clock Ticker
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. Stopwatch Logic
  useEffect(() => {
    if (isTimerRunning) {
      const startTime = Date.now() - timerTime;
      timerRef.current = window.setInterval(() => {
        setTimerTime(Date.now() - startTime);
      }, 10);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning]);

  const handleTimerReset = () => {
    setIsTimerRunning(false);
    setTimerTime(0);
  };

  const formatTimer = (ms: number) => {
    const d = new Date(ms);
    const h = String(Math.floor(ms / 3600000)).padStart(2, '0');
    const m = String(d.getUTCMinutes()).padStart(2, '0');
    const s = String(d.getUTCSeconds()).padStart(2, '0');
    const centi = String(Math.floor(d.getUTCMilliseconds() / 10)).padStart(2, '0');
    return `${h}:${m}:${s}.${centi}`;
  };

  // 3. Timestamp Converter Logic
  useEffect(() => {
    let ms = parseInt(tsInput);
    if (isNaN(ms)) {
      setOutputStr('Invalid Timestamp');
      return;
    }
    
    if (tsUnit === 's') ms *= 1000;
    const date = new Date(ms);
    
    // Sync Date Picker State
    if (date.getTime() !== currentDateObj.getTime()) {
      setCurrentDateObj(date);
    }

    // Update Output Display
    try {
      if (displayFormat === 'iso') setOutputStr(date.toISOString());
      else if (displayFormat === 'utc') setOutputStr(date.toUTCString());
      else if (displayFormat === 'date') {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        setOutputStr(`${year}-${month}-${day}`);
      }
      else {
        // Local "YYYY-MM-DD HH:mm:ss"
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hour = String(date.getHours()).padStart(2, '0');
        const min = String(date.getMinutes()).padStart(2, '0');
        const sec = String(date.getSeconds()).padStart(2, '0');
        setOutputStr(`${year}-${month}-${day} ${hour}:${min}:${sec}`);
      }
    } catch (e) {
      setOutputStr('Invalid Date');
    }
  }, [tsInput, tsUnit, displayFormat]);

  const handleNowClick = () => {
    const n = Date.now();
    setTsInput(tsUnit === 'ms' ? String(n) : String(Math.floor(n / 1000)));
  };

  const handleUnitChange = (newUnit: 'ms' | 's') => {
    let val = parseInt(tsInput);
    if (!isNaN(val)) {
       if (tsUnit === 'ms' && newUnit === 's') val = Math.floor(val / 1000);
       if (tsUnit === 's' && newUnit === 'ms') val = val * 1000;
       setTsInput(String(val));
    }
    setTsUnit(newUnit);
  };

  const handleDatePickerChange = (date: Date) => {
    setCurrentDateObj(date);
    const ms = date.getTime();
    setTsInput(tsUnit === 'ms' ? String(ms) : String(Math.floor(ms / 1000)));
  };
  
  const handleManualInput = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setTsInput(val.replace(/\D/g, ''));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
       
       {/* Left Column: Clock & Timer */}
       <div className="flex flex-col gap-6">
          
          {/* Top: World Clock */}
          <div className={`${CLOCK_THEMES[clockTheme].bg} rounded-2xl shadow-lg p-6 text-white relative overflow-hidden flex-1 flex flex-col transition-all duration-500`}>
             <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none"></div>
             
             {/* Theme Switcher & TZ */}
             <div className="relative z-10 w-full flex justify-between items-start mb-4">
                <div className="flex items-center bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-md border border-white/10">
                   <Globe size={14} className="text-white/70 mr-2" />
                   <select 
                     value={selectedTz} 
                     onChange={(e) => setSelectedTz(e.target.value)}
                     className="bg-transparent border-none outline-none text-xs font-medium appearance-none cursor-pointer text-white min-w-[80px]"
                   >
                      {TIMEZONES.map(tz => (
                        <option key={tz.value} value={tz.value} className="text-slate-900">{tz.label}</option>
                      ))}
                   </select>
                </div>
                
                <div className="flex space-x-1">
                  {(Object.keys(CLOCK_THEMES) as ClockThemeKey[]).map((key) => (
                    <button
                      key={key}
                      onClick={() => setClockTheme(key)}
                      className={`w-6 h-6 rounded-full border-2 ${clockTheme === key ? 'border-white scale-110' : 'border-transparent opacity-60 hover:opacity-100'} transition-all`}
                      style={{ background: key === 'ocean' ? '#0ea5e9' : key === 'sunset' ? '#f43f5e' : key === 'cyber' ? '#6366f1' : '#10b981' }}
                      title={CLOCK_THEMES[key].label}
                    />
                  ))}
                </div>
             </div>
             
             <div className="flex-1 flex flex-col items-center justify-center relative z-10">
                <h2 className={`text-6xl md:text-7xl font-mono font-bold tracking-tight mb-2 drop-shadow-lg ${CLOCK_THEMES[clockTheme].text}`}>
                  {now.toLocaleTimeString('en-US', { 
                    hour12: false, 
                    timeZone: selectedTz === 'local' ? undefined : selectedTz 
                  })}
                </h2>
                
                <p className={`text-lg font-medium opacity-90 ${CLOCK_THEMES[clockTheme].subText}`}>
                  {now.toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { 
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                    timeZone: selectedTz === 'local' ? undefined : selectedTz 
                  })}
                </p>
             </div>
          </div>

          {/* Bottom: Timer */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 flex flex-col items-center justify-center h-48">
             <div className="flex items-center space-x-2 mb-4 text-slate-400 dark:text-slate-500">
               <span className="text-xs font-bold uppercase tracking-widest">{lang === 'zh' ? '计时器' : 'Stopwatch'}</span>
             </div>
             
             <div className="text-5xl font-mono font-bold text-slate-800 dark:text-white mb-6 tracking-wide">
               {formatTimer(timerTime)}
             </div>
             
             <div className="flex space-x-6">
               <button 
                 onClick={() => setIsTimerRunning(!isTimerRunning)}
                 className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-md active:scale-95 ${
                   isTimerRunning 
                     ? 'bg-amber-100 text-amber-600 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400' 
                     : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/30'
                 }`}
               >
                 {isTimerRunning ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
               </button>
               
               <button 
                 onClick={handleTimerReset}
                 className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-400 flex items-center justify-center transition-all active:scale-95"
               >
                 <RotateCcw size={18} />
               </button>
             </div>
          </div>

       </div>

       {/* Right Column: Converter */}
       <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 flex flex-col h-full relative">
          <div className="flex items-center space-x-3 mb-8">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <RefreshCcw size={20} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">
               {lang === 'zh' ? '时间戳转换' : 'Timestamp Converter'}
            </h3>
          </div>
          
          <div className="flex-1 flex flex-col space-y-8">
            
            {/* 1. Timestamp Input */}
            <div>
               <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Unix Timestamp</label>
               <div className="flex items-center space-x-2">
                 <div className="relative flex-1">
                   <input 
                     type="text" 
                     value={tsInput}
                     onChange={handleManualInput}
                     className="w-full pl-4 pr-20 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-white font-mono text-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                     placeholder="Enter timestamp..."
                   />
                   <div className="absolute right-2 top-2 bottom-2 flex bg-slate-200 dark:bg-slate-700 rounded-lg p-0.5">
                      <button 
                        onClick={() => handleUnitChange('s')}
                        className={`px-3 flex items-center justify-center text-xs font-bold rounded-md transition-all ${tsUnit === 's' ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500'}`}
                      >
                        s
                      </button>
                      <button 
                        onClick={() => handleUnitChange('ms')}
                        className={`px-3 flex items-center justify-center text-xs font-bold rounded-md transition-all ${tsUnit === 'ms' ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500'}`}
                      >
                        ms
                      </button>
                   </div>
                 </div>
                 <button 
                   onClick={handleNowClick}
                   className="h-full px-4 py-3 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-xl text-sm font-bold border border-indigo-100 dark:border-indigo-800/30 transition-colors"
                 >
                   Now
                 </button>
               </div>
            </div>

            {/* Divider */}
            <div className="flex items-center justify-center">
               <div className="h-px bg-slate-100 dark:bg-slate-700 flex-1"></div>
               <div className="mx-4 text-slate-300 dark:text-slate-600 bg-slate-50 dark:bg-slate-800 p-2 rounded-full">
                 <ArrowRightLeft size={16} />
               </div>
               <div className="h-px bg-slate-100 dark:bg-slate-700 flex-1"></div>
            </div>

            {/* 2. Date Picker (Modern Custom UI) */}
            <div>
               <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Date & Time</label>
               <ModernDatePicker 
                 value={currentDateObj} 
                 onChange={handleDatePickerChange} 
                 lang={lang}
               />
               <p className="mt-1 text-xs text-slate-400 ml-1">
                  Type directly or click calendar to select
               </p>
            </div>

            {/* 3. Output Display */}
            <div className="mt-auto">
               <div className="flex justify-between items-end mb-2 ml-1">
                  <label className="block text-xs font-bold text-slate-400 uppercase">Format</label>
               </div>
               
               <div className="bg-slate-100 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="border-b border-slate-200 dark:border-slate-700 flex">
                     {DATE_FORMATS.map(fmt => (
                       <button
                         key={fmt.value}
                         onClick={() => setDisplayFormat(fmt.value)}
                         className={`
                           flex-1 py-2 text-xs font-medium transition-colors
                           ${displayFormat === fmt.value 
                             ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-500' 
                             : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800'}
                         `}
                       >
                         {fmt.label}
                       </button>
                     ))}
                  </div>
                  <div className="p-4 flex items-center justify-between">
                     <div className="font-mono text-lg text-slate-800 dark:text-white break-all select-all">
                        {outputStr}
                     </div>
                     <button 
                       onClick={() => navigator.clipboard.writeText(outputStr)}
                       className="ml-3 p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                     >
                       <Check size={18} />
                     </button>
                  </div>
               </div>
            </div>

          </div>
       </div>
    </div>
  );
};

/* --- 3. System Monitor (Unchanged) --- */
const MOCK_DATA_LENGTH = 20;

interface SystemInfo {
  os: string;
  kernel: string;
  hostname: string;
  cpu: string;
  memory: string;
  uptime: string;
}

export const SystemMonitor: React.FC<{ lang: Language }> = ({ lang }) => {
  const [data, setData] = useState<{time: string, cpu: number, mem: number}[]>([]);
  const [sysInfo, setSysInfo] = useState<SystemInfo>({
    os: 'Loading...', kernel: '-', hostname: '-', cpu: '-', memory: '-', uptime: '-'
  });

  useEffect(() => {
    // Mock System Info (In Tauri, this would come from `window.__TAURI__.invoke`)
    const isTauri = typeof window !== 'undefined' && !!window.__TAURI__;
    
    if (isTauri) {
      // Example call if backend was ready: window.__TAURI__.invoke('get_system_info').then(setSysInfo);
      setSysInfo({
        os: 'Windows 11 Pro 64-bit',
        kernel: '10.0.22621',
        hostname: 'DESKTOP-TAURI',
        cpu: 'Intel(R) Core(TM) i9-13900K',
        memory: '32.0 GB',
        uptime: '2d 4h 12m'
      });
    } else {
      setSysInfo({
        os: 'Web Simulation OS',
        kernel: 'WebKernel v1.0.0',
        hostname: 'browser-client-01',
        cpu: 'Virtual Core i7',
        memory: '16 GB (Allocated)',
        uptime: '0d 1h 23m'
      });
    }

    const interval = setInterval(() => {
      setData(prev => {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { hour12: false });
        const newPoint = {
          time: timeStr,
          cpu: Math.floor(Math.random() * 30) + 20, // 20-50%
          mem: Math.floor(Math.random() * 20) + 40  // 40-60%
        };
        const newData = [...prev, newPoint];
        if (newData.length > MOCK_DATA_LENGTH) newData.shift();
        return newData;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full flex flex-col space-y-6">
       
       {/* System Info Section */}
       <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex items-center">
             <Laptop className="mr-2 text-blue-600 dark:text-blue-400" size={20} />
             <h3 className="font-bold text-slate-800 dark:text-white">
               {lang === 'zh' ? '系统信息' : 'System Information'}
             </h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             <div className="flex items-start space-x-3">
                <Box size={18} className="mt-1 text-slate-400" />
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">OS</p>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{sysInfo.os}</p>
                  <p className="text-xs text-slate-400">{sysInfo.kernel}</p>
                </div>
             </div>
             <div className="flex items-start space-x-3">
                <Terminal size={18} className="mt-1 text-slate-400" />
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hostname</p>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{sysInfo.hostname}</p>
                </div>
             </div>
             <div className="flex items-start space-x-3">
                <Timer size={18} className="mt-1 text-slate-400" />
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Uptime</p>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{sysInfo.uptime}</p>
                </div>
             </div>
             <div className="flex items-start space-x-3">
                <Cpu size={18} className="mt-1 text-slate-400" />
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">CPU</p>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{sysInfo.cpu}</p>
                </div>
             </div>
             <div className="flex items-start space-x-3">
                <HardDrive size={18} className="mt-1 text-slate-400" />
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Memory</p>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{sysInfo.memory}</p>
                </div>
             </div>
          </div>
       </div>

       {/* Real-time Cards */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center space-x-4">
             <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
               <Cpu size={24} />
             </div>
             <div>
               <p className="text-sm text-slate-500 dark:text-slate-400">CPU Usage</p>
               <p className="text-2xl font-bold text-slate-800 dark:text-white">{data[data.length-1]?.cpu}%</p>
             </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center space-x-4">
             <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
               <HardDrive size={24} />
             </div>
             <div>
               <p className="text-sm text-slate-500 dark:text-slate-400">Memory Usage</p>
               <p className="text-2xl font-bold text-slate-800 dark:text-white">{data[data.length-1]?.mem}%</p>
             </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center space-x-4">
             <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400">
               <Wifi size={24} />
             </div>
             <div>
               <p className="text-sm text-slate-500 dark:text-slate-400">Network</p>
               <p className="text-2xl font-bold text-slate-800 dark:text-white">↑ 1.2 MB/s</p>
             </div>
          </div>
       </div>

       {/* Charts */}
       <div className="flex-1 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center">
             <Activity className="mr-2 text-red-500" />
             {lang === 'zh' ? '实时性能' : 'Real-time Performance'}
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={data}>
                  <defs>
                     <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                     </linearGradient>
                     <linearGradient id="colorMem" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                     </linearGradient>
                  </defs>
                  <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
                  <Tooltip 
                     contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                  />
                  <Area type="monotone" dataKey="cpu" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCpu)" />
                  <Area type="monotone" dataKey="mem" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorMem)" />
               </AreaChart>
            </ResponsiveContainer>
          </div>
       </div>
       
       <div className="bg-slate-100 dark:bg-slate-800/50 p-4 rounded-lg text-xs text-slate-500 text-center">
         Note: In a pure web environment, system metrics are simulated. In the Tauri build, this would connect to the Rust backend.
       </div>
    </div>
  );
};