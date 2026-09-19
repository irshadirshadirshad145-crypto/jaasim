import React from 'react';
import {
  Database,
  Clock,
  CalendarCheck,
  Layers,
  Tag,
  FileSpreadsheet,
  Download,
  ArrowRight,
} from 'lucide-react';

interface ProcessPipelineVisualizerProps {
  currentStage?: 'setup' | 'review' | 'preview';
}

export const ProcessPipelineVisualizer: React.FC<ProcessPipelineVisualizerProps> = ({
  currentStage = 'setup',
}) => {
  const steps = [
    {
      id: 'data',
      title: 'Real Shift Data',
      desc: '4 Core Ops Feeds',
      icon: Database,
      active: true,
    },
    {
      id: 'filter',
      title: 'Time Filter',
      desc: 'start <= t <= end',
      icon: Clock,
      active: true,
    },
    {
      id: 'norm',
      title: 'Timestamp Normalization',
      desc: 'ISO / Epoch / Strings',
      icon: CalendarCheck,
      active: true,
    },
    {
      id: 'dedup',
      title: 'Deduplication',
      desc: 'source + recordId',
      icon: Layers,
      active: currentStage === 'review' || currentStage === 'preview',
    },
    {
      id: 'cat',
      title: 'Categorization',
      desc: '4 Rule-Based Buckets',
      icon: Tag,
      active: currentStage === 'review' || currentStage === 'preview',
    },
    {
      id: 'note',
      title: 'Handover Note',
      desc: 'Editable Live Preview',
      icon: FileSpreadsheet,
      active: currentStage === 'preview',
    },
    {
      id: 'export',
      title: 'PDF / DOCX',
      desc: 'Single Doc Exports',
      icon: Download,
      active: currentStage === 'preview',
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3.5">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Shift Data Processing Pipeline
          </h3>
        </div>
        <span className="text-2xs font-mono text-slate-400">
          Deterministic Rule-Based Engine (No LLM Required)
        </span>
      </div>

      {/* Horizontal / Wrapped steps flow */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <div
              key={step.id}
              className={`relative flex flex-col p-2.5 rounded-xl border transition-all ${
                step.active
                  ? 'bg-indigo-50/70 border-indigo-200 text-indigo-950'
                  : 'bg-slate-50 border-slate-200 text-slate-500 opacity-70'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className={`w-5 h-5 rounded-lg flex items-center justify-center text-3xs font-bold ${
                    step.active
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {idx + 1}
                </span>
                <Icon className={`w-3.5 h-3.5 ${step.active ? 'text-indigo-600' : 'text-slate-400'}`} />
              </div>

              <span className="text-xs font-bold leading-tight truncate">{step.title}</span>
              <span className="text-3xs text-slate-500 font-mono mt-0.5 leading-tight truncate">
                {step.desc}
              </span>

              {/* Arrow connector for larger screens */}
              {idx < steps.length - 1 && (
                <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                  <ArrowRight className="w-3 h-3 text-slate-300" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
