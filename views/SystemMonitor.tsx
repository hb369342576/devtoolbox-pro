import React, { useState, useEffect } from 'react';
import { Cpu, HardDrive, Wifi, Activity, Laptop, Box, Terminal, Timer } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Language } from '../types';

interface SystemInfo {
  os: string;
  kernel: string;
  hostname: string;
  cpu: string;
  memory: string;
  uptime: string;
}

export const SystemMonitor: React.FC<{ lang: Language }> = ({ lang }) => {
  const isTauri = typeof window !== 'undefined' && !!window.__TAURI__;
  const [data, setData] = useState<{time: string, cpu: number, mem: number}[]>([]);
  const [sysInfo, setSysInfo] = useState<SystemInfo>({
    os: 'Loading...', kernel: '-', hostname: '-', cpu: '-', memory: '-', uptime: '-'
  });

  useEffect(() => {
    // 获取静态系统信息
    const fetchInfo = async () => {
      if (isTauri) {
         try {
           const info = await window.__TAURI__!.invoke('get_system_info') as SystemInfo;
           setSysInfo(info);
         } catch (e) { console.error(e); }
      } else {
         // Web 模式模拟
         setSysInfo({
            os: 'Web Mode OS', kernel: 'WebKernel 1.0', hostname: 'localhost', 
            cpu: 'Virtual CPU', memory: '16 GB', uptime: '1d'
         });
      }
    };
    fetchInfo();

    // 轮询实时数据
    const interval = setInterval(async () => {
       let cpu = 0, mem = 0;
       if (isTauri) {
          try {
             const stats = await window.__TAURI__!.invoke('get_system_stats') as {cpu: number, mem: number};
             cpu = stats.cpu;
             mem = stats.mem;
          } catch(e) {}
       } else {
          // 模拟随机波动
          cpu = Math.floor(Math.random() * 30) + 20;
          mem = Math.floor(Math.random() * 20) + 40;
       }

       setData(prev => {
          const now = new Date();
          const timeStr = now.toLocaleTimeString('en-US', { hour12: false });
          const newData = [...prev, { time: timeStr, cpu, mem }];
          if (newData.length > 20) newData.shift();
          return newData;
       });
    }, 1000);

    return () => clearInterval(interval);
  }, [isTauri]);

  return (
    <div className="h-full flex flex-col space-y-6">
       {/* 系统概览卡片 */}
       <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
             <div className="flex items-center">
                <Laptop className="mr-2 text-blue-600 dark:text-blue-400" size={20} />
                <h3 className="font-bold text-slate-800 dark:text-white">{lang === 'zh' ? '系统信息' : 'System Information'}</h3>
             </div>
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

       {/* 实时数据仪表盘 */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center space-x-4">
             <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400"><Cpu size={24} /></div>
             <div><p className="text-sm text-slate-500">CPU Usage</p><p className="text-2xl font-bold text-slate-800 dark:text-white">{data[data.length-1]?.cpu || 0}%</p></div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center space-x-4">
             <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400"><HardDrive size={24} /></div>
             <div><p className="text-sm text-slate-500">Memory Usage</p><p className="text-2xl font-bold text-slate-800 dark:text-white">{data[data.length-1]?.mem || 0}%</p></div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center space-x-4">
             <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400"><Wifi size={24} /></div>
             <div><p className="text-sm text-slate-500">Network</p><p className="text-2xl font-bold text-slate-800 dark:text-white">Active</p></div>
          </div>
       </div>

       {/* 图表区域 */}
       <div className="flex-1 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center"><Activity className="mr-2 text-red-500" />{lang === 'zh' ? '实时性能' : 'Real-time Performance'}</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={data}>
                  <defs>
                     <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                     <linearGradient id="colorMem" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/></linearGradient>
                  </defs>
                  <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                  <Area type="monotone" dataKey="cpu" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCpu)" />
                  <Area type="monotone" dataKey="mem" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorMem)" />
               </AreaChart>
            </ResponsiveContainer>
          </div>
       </div>
    </div>
  );
};