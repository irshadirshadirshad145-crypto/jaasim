import React from 'react';
import {
  LayoutDashboard,
  SlidersHorizontal,
  CheckSquare,
  FileText,
  History,
  Download,
  ShieldCheck,
  ShieldAlert,
  Zap,
  CheckCircle2,
  AlertTriangle,
  X,
} from 'lucide-react';
import { AppPage, ShiftSetupConfig } from '../types';

interface SidebarProps {
  currentPage: AppPage;
  onNavigate: (page: AppPage) => void;
  synthesizedCount: number;
  config: ShiftSetupConfig;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  carriedCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  synthesizedCount,
  config,
  isOpenMobile,
  onCloseMobile,
  carriedCount = 0,
}) => {
  const navItems: {
    id: AppPage;
    label: string;
    description: string;
    icon: React.ElementType;
    badge?: string | number;
    badgeColor?: string;
  }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      description: 'Shift metrics & operational stream',
      icon: LayoutDashboard,
    },
    {
      id: 'setup',
      label: 'Shift Setup',
      description: 'Window, lead & data telemetry',
      icon: SlidersHorizontal,
    },
    {
      id: 'review',
      label: 'Activity Review',
      description: 'Deduplicated & categorized items',
      icon: CheckSquare,
      badge: synthesizedCount > 0 ? synthesizedCount : undefined,
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    },
    {
      id: 'handover',
      label: 'Handover Note',
      description: 'Structured 4-category editable note',
      icon: FileText,
      badge: carriedCount > 0 ? `${carriedCount} Carried` : undefined,
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    },
    {
      id: 'history',
      label: 'Handover History',
      description: 'Saved handovers & cloud archive',
      icon: History,
      badge: 'Cloud Sync',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    },
    {
      id: 'export',
      label: 'Export',
      description: 'PDF, DOCX & Markdown dispatch',
      icon: Download,
    },
    {
      id: 'validation',
      label: 'Validation',
      description: 'Feed schemas & ingestion tester',
      icon: ShieldCheck,
    },
    {
      id: 'admin',
      label: 'Admin Panel',
      description: 'System management & audit controls',
      icon: ShieldAlert,
      badge: 'Admin',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    },
  ];

  const handleSelectPage = (id: AppPage) => {
    onNavigate(id);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Fixed Left Sidebar Container */}
      <aside
        id="app-fixed-sidebar"
        className={`fixed top-16 bottom-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between transition-transform duration-200 ease-in-out ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Navigation Section with internal scroll for short viewports */}
        <div className="p-4 space-y-6 overflow-y-auto flex-1 min-h-0">
          {/* Mobile close button */}
          <div className="flex items-center justify-between lg:hidden pb-2 border-b border-slate-800">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Navigation Menu
            </span>
            <button
              type="button"
              onClick={onCloseMobile}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div>
            <p className="px-3 text-2xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Shift Navigation
            </p>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    id={`nav-link-${item.id}`}
                    type="button"
                    onClick={() => handleSelectPage(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs transition-all text-left ${
                      isActive
                        ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 font-semibold shadow-xs'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 font-medium'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? 'text-indigo-400' : 'text-slate-500'
                        }`}
                      />
                      <div className="truncate">
                        <span className="block truncate">{item.label}</span>
                      </div>
                    </div>

                    {item.badge !== undefined && (
                      <span
                        className={`text-3xs font-semibold px-2 py-0.5 rounded-full border shrink-0 ${
                          item.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Quick System Telemetry Card */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2.5 text-xs">
            <div className="flex items-center justify-between text-2xs font-semibold text-slate-400 uppercase tracking-wider">
              <span>Pipeline Guardrails</span>
              <span className="flex items-center text-emerald-400">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Active
              </span>
            </div>

            <div className="space-y-1.5 text-2xs">
              <div className="flex items-center justify-between text-slate-400">
                <span>Orphan Detector:</span>
                <span
                  className={`font-semibold ${
                    config.enableOrphanedTaskDetector ? 'text-purple-400' : 'text-slate-500'
                  }`}
                >
                  {config.enableOrphanedTaskDetector ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Overlap Cushion:</span>
                <span className="font-mono text-slate-300">
                  +{config.overlapBufferMinutes || 0}m
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Deduplication:</span>
                <span className="text-emerald-400 font-medium">Deterministic</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Footer: Active Operator Info */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-400 text-xs font-bold">
              {config.employeeName ? config.employeeName.charAt(0).toUpperCase() : 'O'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-200 truncate">
                {config.employeeName || 'Operations Engineer'}
              </p>
              <p className="text-2xs text-slate-500 truncate">
                {config.employeeRole || 'Operations Lead'}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
