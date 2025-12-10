import React, { useState, useEffect, useRef } from 'react';
import { RefreshCcw, Play, Pause, RotateCcw, Calendar as CalendarIcon, Globe, Check, ChevronLeft, ChevronRight, Clock, ChevronDown, Flag, Copy } from 'lucide-react';
import { Language } from '../types';

/* --- Modern Date Picker (现代日期选择器组件) --- */
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

  // 当外部 value 变化时同步内部状态
  useEffect(() => {
    if (!isTypingRef.current) {
      setViewDate(new Date(value));
      const pad = (n: number) => n.toString().padStart(2, '0');
      const fmt = `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())} ${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`;
      setInputValue(fmt);
    }
  }, [value]);

  // 点击外部关闭弹窗
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // 处理手动输入日期
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    isTypingRef.current = true;
    setInputValue(e.target.value);
    const timestamp = Date.parse(e.target.value.replace(/-/g, '/'));
    if (!isNaN(timestamp)) {
      const newDate = new Date(timestamp);
      onChange(newDate);
      setViewDate(newDate);
    }
  };

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();

  // 处理日期点击
  const handleDateClick = (day: number) => {
    const newDate = new Date(value);
    newDate.setFullYear(viewDate.getFullYear());
    newDate.setMonth(viewDate.getMonth());
    newDate.setDate(day);
    onChange(newDate);
    isTypingRef.current = false;
  };

  // 处理时间调整
  const handleTimeChange = (type: 'h' | 'm' | 's', val: string) => {
    const num = parseInt(val);
    if (isNaN(num)) return;
    const newDate = new Date(value);
    if (type === 'h') newDate.setHours(Math.min(23, Math.max(0, num)));
    if (type === 'm') newDate.setMinutes(Math.min(59, Math.max(0, num)));
    if (type === 's') newDate.setSeconds(Math.min(59, Math.max(0, num)));
    onChange(newDate);
  };

  // 回到今天
  const setToday = () => {
    const now = new Date();
    onChange(now);
    setViewDate(now);
    setIsOpen(false);
  };

  const pad = (n: number) => n.toString().padStart(2, '0');

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className={`flex items-center w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl transition-all ${isOpen ? 'ring-2 ring-blue-500/20 border-blue-500' : ''}`}>
        <button onClick={() => setIsOpen(!isOpen)} className="mr-3 text-slate-400 hover:text-blue-500 transition-colors"><CalendarIcon size={18} /></button>
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={() => isTypingRef.current = false}
          placeholder="YYYY-MM-DD HH:mm:ss"
          className="flex-1 bg-transparent border-none outline-none font-mono text-sm text-slate-700 dark:text-slate-200"
        />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 p-4 animate-in fade-in zoom-in-95 duration-200">
          {/* 头部导航 */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-500"><ChevronLeft size={16} /></button>
            <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">
              {viewDate.toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', year: 'numeric' })}
            </span>
            <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-500"><ChevronRight size={16} /></button>
          </div>

          {/* 日历网格 */}
          <div className="grid grid-cols-7 gap-1 mb-4">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <div key={d} className="text-center text-xs font-medium text-slate-400 py-1">{d}</div>)}
            {Array.from({ length: daysInMonth(viewDate.getFullYear(), viewDate.getMonth()) }, (_, i) => i + 1).map((day) => {
              const isSelected = value.getDate() === day && value.getMonth() === viewDate.getMonth() && value.getFullYear() === viewDate.getFullYear();
              return <button key={day} onClick={() => handleDateClick(day)} className={`h-8 w-8 rounded-full text-xs font-medium flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-600 text-white shadow-md' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>{day}</button>;
            })}
          </div>

          {/* 时间输入区 */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase flex items-center"><Clock size={12} className="mr-1" /> {lang === 'zh' ? '时间' : 'Time'}</span>
            <div className="flex items-center space-x-1">
              <input type="number" min="0" max="23" value={pad(value.getHours())} onChange={(e) => handleTimeChange('h', e.target.value)} className="w-10 p-1 text-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded text-xs font-mono dark:text-white outline-none focus:border-blue-500" />
              <span className="text-slate-400">:</span>
              <input type="number" min="0" max="59" value={pad(value.getMinutes())} onChange={(e) => handleTimeChange('m', e.target.value)} className="w-10 p-1 text-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded text-xs font-mono dark:text-white outline-none focus:border-blue-500" />
              <span className="text-slate-400">:</span>
              <input type="number" min="0" max="59" value={pad(value.getSeconds())} onChange={(e) => handleTimeChange('s', e.target.value)} className="w-10 p-1 text-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded text-xs font-mono dark:text-white outline-none focus:border-blue-500" />
            </div>
          </div>

          {/* 底部按钮 */}
          <button onClick={setToday} className="w-full py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
            {lang === 'zh' ? '回到今天' : 'Today'}
          </button>
        </div>
      )}
    </div>
  );
};

/* --- 主组件 --- */
const CLOCK_THEMES = {
  ocean: { bg: 'bg-gradient-to-br from-blue-600 to-cyan-500', text: 'text-white' },
  sunset: { bg: 'bg-gradient-to-br from-orange-500 to-rose-600', text: 'text-white' },
  cyber: { bg: 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900', text: 'text-neon-blue' }
};

export const TimeUtility: React.FC<{ lang: Language }> = ({ lang }) => {
  // 时钟状态
  const [now, setNow] = useState(new Date());
  const [selectedTz, setSelectedTz] = useState('local');
  const [clockTheme, setClockTheme] = useState<keyof typeof CLOCK_THEMES>('ocean');

  // 计时器状态
  const [timerTime, setTimerTime] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [laps, setLaps] = useState<number[]>([]); // 计次记录

  // 时间戳转换状态
  const [tsInput, setTsInput] = useState(String(Date.now()));
  const [tsUnit, setTsUnit] = useState<'ms' | 's'>('ms');
  const [currentDateObj, setCurrentDateObj] = useState(new Date());
  const [outputStr, setOutputStr] = useState('');
  const [displayFormat, setDisplayFormat] = useState('local');

  const DATE_FORMATS = [
    { value: 'local', label: lang === 'zh' ? '本地 (YYYY-MM-DD HH:mm:ss)' : 'Local' },
    { value: 'date', label: lang === 'zh' ? '仅日期 (YYYY-MM-DD)' : 'Date Only' },
    { value: 'iso', label: 'ISO 8601' },
    { value: 'utc', label: 'UTC' }
  ];

  // 时钟更新 Effect
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);

  // 计时器更新 Effect
  useEffect(() => {
    let interval: number;
    if (isTimerRunning) {
      const start = Date.now() - timerTime;
      interval = window.setInterval(() => setTimerTime(Date.now() - start), 10);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // 同步转换: 输入 -> 日期对象 -> 格式化输出
  useEffect(() => {
    let ms = parseInt(tsInput);
    if (!isNaN(ms)) {
      if (tsUnit === 's') ms *= 1000;
      const date = new Date(ms);
      if (Math.abs(date.getTime() - currentDateObj.getTime()) > 1000) {
        setCurrentDateObj(date);
      }

      // 格式化输出
      try {
        if (displayFormat === 'iso') setOutputStr(date.toISOString());
        else if (displayFormat === 'utc') setOutputStr(date.toUTCString());
        else if (displayFormat === 'date') {
          const pad = (n: number) => n.toString().padStart(2, '0');
          setOutputStr(`${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`);
        } else {
          // Local
          const pad = (n: number) => n.toString().padStart(2, '0');
          setOutputStr(`${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`);
        }
      } catch (e) { setOutputStr(lang === 'zh' ? '无效日期' : 'Invalid Date'); }
    }
  }, [tsInput, tsUnit, displayFormat, lang]);

  // 处理单位切换
  const handleUnitChange = (unit: 'ms' | 's') => {
    let val = parseInt(tsInput);
    if (!isNaN(val)) {
      if (tsUnit === 'ms' && unit === 's') val = Math.floor(val / 1000);
      else if (tsUnit === 's' && unit === 'ms') val = val * 1000;
      setTsInput(String(val));
    }
    setTsUnit(unit);
  };

  // 格式化计时器时间
  const formatTimer = (ms: number) => {
    const d = new Date(ms);
    return `${String(Math.floor(ms / 3600000)).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}:${String(d.getUTCSeconds()).padStart(2, '0')}.${String(Math.floor(d.getUTCMilliseconds() / 10)).padStart(2, '0')}`;
  };

  // 处理计次
  const handleLap = () => {
    if (laps.length < 5) {
      setLaps([...laps, timerTime]);
    }
  };

  // 重置计时器
  const handleReset = () => {
    setIsTimerRunning(false);
    setTimerTime(0);
    setLaps([]);
  };

  // 辅助信息
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const weekday = currentDateObj.toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { weekday: 'long' });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      {/* 左侧栏: 时钟 & 计时器 */}
      <div className="flex flex-col gap-6">

        {/* 世界时钟 */}
        <div className={`${CLOCK_THEMES[clockTheme].bg} rounded-2xl shadow-lg p-6 text-white relative overflow-hidden flex-1 flex flex-col`}>
          <div className="flex justify-between items-start mb-4 z-10">
            <div className="flex items-center bg-white/10 px-3 py-1.5 rounded-lg border border-white/20">
              <Globe size={14} className="text-white/80 mr-2" />
              <select value={selectedTz} onChange={(e) => setSelectedTz(e.target.value)} className="bg-transparent border-none outline-none text-xs font-medium text-white min-w-[80px] cursor-pointer">
                <option className="text-slate-900" value="local">{lang === 'zh' ? '本地时间' : 'Local'}</option>
                <option className="text-slate-900" value="UTC">UTC</option>
                <option className="text-slate-900" value="Asia/Shanghai">Beijing</option>
                <option className="text-slate-900" value="America/New_York">New York</option>
                <option className="text-slate-900" value="Europe/London">London</option>
                <option className="text-slate-900" value="Asia/Tokyo">Tokyo</option>
              </select>
            </div>
            <div className="flex space-x-1">
              {(Object.keys(CLOCK_THEMES) as Array<keyof typeof CLOCK_THEMES>).map(k => (
                <button key={k} onClick={() => setClockTheme(k)} className={`w-4 h-4 rounded-full border-2 ${clockTheme === k ? 'border-white scale-110' : 'border-transparent opacity-60'}`} style={{ background: k === 'ocean' ? '#0ea5e9' : k === 'sunset' ? '#f43f5e' : '#6366f1' }} />
              ))}
            </div>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center z-10">
            <h2 className="text-6xl md:text-7xl font-mono font-bold mb-2 tracking-tight drop-shadow-lg">{now.toLocaleTimeString('en-US', { hour12: false, timeZone: selectedTz === 'local' ? undefined : selectedTz })}</h2>
            <p className="text-lg opacity-90 font-medium">{now.toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: selectedTz === 'local' ? undefined : selectedTz })}</p>
          </div>
        </div>

        {/* 计时器 (高度固定为 28rem 约 450px) */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 flex flex-col items-center justify-start h-[28rem]">
          <div className="mt-2 text-xs font-bold text-slate-400 uppercase tracking-widest">{lang === 'zh' ? '计时器' : 'STOPWATCH'}</div>
          <div className="mt-8 text-5xl font-mono font-bold text-slate-800 dark:text-white tracking-wide">{formatTimer(timerTime)}</div>

          {/* 控制按钮 */}
          <div className="mt-8 flex space-x-6">
            <button onClick={() => setIsTimerRunning(!isTimerRunning)} className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isTimerRunning ? 'bg-amber-100 text-amber-600 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/30'}`}>
              {isTimerRunning ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
            </button>

            {/* 计次按钮 */}
            <button
              onClick={handleLap}
              disabled={!isTimerRunning || laps.length >= 5}
              className="w-14 h-14 rounded-full bg-indigo-100 text-indigo-600 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all"
            >
              <Flag size={20} fill="currentColor" />
            </button>

            <button onClick={handleReset} className="w-14 h-14 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-400 flex items-center justify-center transition-all"><RotateCcw size={20} /></button>
          </div>

          {/* 计次列表 (占据剩余空间) */}
          <div className="w-full mt-8 flex-1 overflow-y-auto custom-scrollbar border-t border-slate-100 dark:border-slate-700/50 pt-2">
            {laps.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-300 dark:text-slate-600 text-xs italic">
                {lang === 'zh' ? '暂无记录' : 'No laps recorded'}
              </div>
            ) : (
              <div className="space-y-2">
                {laps.map((lap, idx) => (
                  <div key={idx} className="flex justify-between items-center px-2 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <div className="flex items-center space-x-3">
                      <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-[10px] text-slate-500 font-bold">{idx + 1}</span>
                      <span className="text-xs text-slate-400 font-medium">LAP</span>
                    </div>
                    <span className="font-mono text-sm font-bold text-slate-700 dark:text-slate-300">{formatTimer(lap)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 右侧栏: 时间戳转换 */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 flex flex-col h-full">
        <div className="flex items-center space-x-3 mb-8">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400"><RefreshCcw size={20} /></div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">{lang === 'zh' ? '时间戳转换' : 'Timestamp Converter'}</h3>
        </div>

        <div className="flex-1 flex flex-col space-y-8">
          {/* 时间戳输入区 */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">{lang === 'zh' ? 'Unix 时间戳' : 'Unix Timestamp'}</label>
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={tsInput}
                  onChange={(e) => setTsInput(e.target.value.replace(/\D/g, ''))}
                  className="w-full pl-4 pr-20 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl font-mono text-lg outline-none text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all"
                  placeholder="Timestamp"
                />
                <div className="absolute right-2 top-2 bottom-2 flex bg-slate-200 dark:bg-slate-700 rounded-lg p-0.5 z-10">
                  <button onClick={() => handleUnitChange('s')} className={`px-3 flex items-center justify-center text-xs font-bold rounded-md transition-all ${tsUnit === 's' ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>s</button>
                  <button onClick={() => handleUnitChange('ms')} className={`px-3 flex items-center justify-center text-xs font-bold rounded-md transition-all ${tsUnit === 'ms' ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>ms</button>
                </div>
              </div>
              <button onClick={() => { const n = Date.now(); setTsInput(tsUnit === 'ms' ? String(n) : String(Math.floor(n / 1000))); }} className="px-4 py-3 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/30 rounded-xl font-bold transition-colors whitespace-nowrap">
                {lang === 'zh' ? '当前' : 'Now'}
              </button>
            </div>
          </div>

          {/* 日期选择器 */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">{lang === 'zh' ? '日期与时间' : 'Date & Time'}</label>
            <ModernDatePicker value={currentDateObj} onChange={(d) => { setCurrentDateObj(d); const ms = d.getTime(); setTsInput(tsUnit === 'ms' ? String(ms) : String(Math.floor(ms / 1000))); }} lang={lang} />
            <p className="text-[10px] text-slate-400 mt-1 ml-1">{lang === 'zh' ? '直接输入或点击日历图标选择' : 'Type directly or click calendar icon'}</p>
          </div>

          {/* 输出与格式选择 */}
          <div className="mt-auto">
            <div className="flex justify-between items-center mb-2 ml-1">
              <label className="block text-xs font-bold text-slate-400 uppercase">{lang === 'zh' ? '格式化结果' : 'Formatted Output'}</label>
            </div>

            <div className="bg-slate-100 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-4">

              {/* 格式选择下拉框 */}
              <div className="relative">
                <select
                  value={displayFormat}
                  onChange={(e) => setDisplayFormat(e.target.value)}
                  className="w-full appearance-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-4 py-2.5 pr-10 text-sm font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                >
                  {DATE_FORMATS.map(fmt => (
                    <option key={fmt.value} value={fmt.value}>{fmt.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-3 text-slate-400 pointer-events-none" size={16} />
              </div>

              {/* 结果显示框 */}
              <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600 p-3 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-lg text-slate-800 dark:text-white break-all select-all leading-tight">
                    {outputStr}
                  </span>
                  <button
                    onClick={() => navigator.clipboard.writeText(outputStr)}
                    className="ml-2 p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title={lang === 'zh' ? '复制' : 'Copy'}
                  >
                    <Copy size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};