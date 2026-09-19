import React, { useState, useEffect } from 'react';
import {
  Activity,
  Clock,
  User,
  Radio,
  Menu,
  RotateCcw,
  Download,
  LogOut,
  LogIn,
  ShieldCheck,
} from 'lucide-react';
import { ShiftSetupConfig, AuthUserProfile } from '../types';

interface HeaderProps {
  config: ShiftSetupConfig;
  activeSourceCount: number;
  totalActivitiesCount: number;
  onQuickReset?: () => void;
  onDownloadPdf?: () => void;
  onToggleMobileSidebar?: () => void;
  currentUser?: AuthUserProfile | null;
  onLoginClick?: () => void;
  onLogoutClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  config,
  activeSourceCount,
  totalActivitiesCount,
  onQuickReset,
  onDownloadPdf,
  onToggleMobileSidebar,
  currentUser,
  onLoginClick,
  onLogoutClick,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
          timeZoneName: 'short',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatShiftTime = (iso: string) => {
    try {
      if (!iso) return '--:--';
      const d = new Date(iso);
      return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return iso.split('T')[1]?.substring(0, 5) || '--:--';
    }
  };

  const shiftWindowStr = `${formatShiftTime(config.startDateTime)} - ${formatShiftTime(config.endDateTime)}`;

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30 shadow-sm w-full shrink-0 h-16">
      <div className="px-4 sm:px-6 lg:px-8 h-full">
        <div className="flex items-center justify-between h-full">
          {/* Logo, Title & Subtitle */}
          <div className="flex items-center space-x-3">
            {onToggleMobileSidebar && (
              <button
                type="button"
                onClick={onToggleMobileSidebar}
                className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                aria-label="Toggle navigation sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-400 shadow-xs shrink-0">
              <Activity className="w-5 h-5" />
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-100 tracking-tight leading-none">
                  Shift Handover Note Generator
                </h1>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Operations Handover &amp; Shift Intelligence
              </p>
            </div>
          </div>

          {/* Current Shift Status on the Right */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Live Clock */}
            <div className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>{timeStr || 'Loading...'}</span>
            </div>

            {/* Shift Window & Active Engineer Status Card */}
            <div className="hidden sm:flex items-center space-x-3 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs">
              <div className="flex items-center space-x-1.5">
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span className="font-semibold text-slate-200">Shift Active</span>
                <span className="text-slate-500">•</span>
                <span className="font-mono text-slate-400">{shiftWindowStr}</span>
              </div>

              <span className="text-slate-700">|</span>

              <div className="flex items-center space-x-1.5 text-slate-300">
                <User className="w-3.5 h-3.5 text-indigo-400" />
                <span className="font-medium truncate max-w-[120px]">{config.employeeName || 'On-Call'}</span>
              </div>

              <span className="text-slate-700">|</span>

              <div className="flex items-center space-x-1 text-slate-400 text-2xs">
                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                  {activeSourceCount}/4 Feeds
                </span>
                <span className="px-1.5 py-0.5 rounded bg-indigo-950/70 border border-indigo-800/60 text-indigo-300 font-medium">
                  {totalActivitiesCount} Evt
                </span>
              </div>
            </div>

            {/* Quick Export PDF action */}
            {onDownloadPdf && (
              <button
                type="button"
                id="header-quick-pdf-btn"
                onClick={onDownloadPdf}
                title="Download Shift Handover Note PDF"
                className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shadow-xs"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                <span className="hidden sm:inline">Export PDF</span>
                <span className="sm:hidden">PDF</span>
              </button>
            )}

            {/* Quick Reset */}
            {onQuickReset && (
              <button
                type="button"
                id="header-quick-reset-btn"
                onClick={onQuickReset}
                title="Reset to default shift configuration"
                className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}

            {/* 4. USER PROFILE & AUTHENTICATION AREA */}
            {currentUser ? (
              <div
                id="header-user-profile-area"
                className="flex items-center space-x-2 pl-2 sm:pl-3 border-l border-slate-800"
              >
                <div
                  className="flex items-center space-x-2 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs shadow-2xs"
                  title={`Signed in as ${currentUser.name} (${currentUser.email})`}
                >
                  <div className="w-6 h-6 rounded-md bg-indigo-600/80 text-white flex items-center justify-center text-xs font-bold shrink-0">
                    {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="hidden lg:flex flex-col text-left leading-none">
                    <span className="text-2xs font-semibold text-slate-200 truncate max-w-[110px]">
                      {currentUser.name}
                    </span>
                    <span className="text-3xs text-slate-400 font-mono mt-0.5 truncate max-w-[110px]">
                      {currentUser.email}
                    </span>
                  </div>
                  {currentUser.isLocalDemo && (
                    <span className="hidden xl:inline text-3xs px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono">
                      Sandbox
                    </span>
                  )}
                </div>

                {onLogoutClick && (
                  <button
                    type="button"
                    id="header-logout-btn"
                    onClick={onLogoutClick}
                    title="Log Out of Supabase Auth"
                    className="inline-flex items-center space-x-1 p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                    aria-label="Log Out"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="hidden xl:inline text-2xs font-medium">Logout</span>
                  </button>
                )}
              </div>
            ) : (
              <div
                id="header-user-profile-area"
                className="flex items-center space-x-2 pl-2 sm:pl-3 border-l border-slate-800"
              >
                {onLoginClick && (
                  <button
                    type="button"
                    id="header-login-btn"
                    onClick={onLoginClick}
                    className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors shadow-2xs"
                  >
                    <LogIn className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
                    <span>Sign In</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
