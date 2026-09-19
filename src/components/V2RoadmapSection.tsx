import React, { useState } from 'react';
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  Cpu,
  Share2,
  BellRing,
  History,
  Bot,
  Layers,
  ArrowUpRight,
} from 'lucide-react';

export const V2RoadmapSection: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  const roadmapItems = [
    {
      title: 'Jira API Integration',
      desc: 'Real-time REST webhooks and JQL filter queries for live sprint and kanban sync.',
      icon: Layers,
      category: 'External APIs',
    },
    {
      title: 'Slack / Microsoft Teams Integration',
      desc: 'Auto-ingest on-call channel incident threads, reactions, and automated bot logs.',
      icon: Share2,
      category: 'Chat & Comms',
    },
    {
      title: 'GitHub / GitLab Integration',
      desc: 'Production release tags, hotfix pull requests, and automated deployment status checks.',
      icon: Cpu,
      category: 'Code & Deployments',
    },
    {
      title: 'PagerDuty / Opsgenie Integration',
      desc: 'Direct ingestion of incident lifecycles, escalations, timeline notes, and resolver actions.',
      icon: BellRing,
      category: 'Monitoring',
    },
    {
      title: 'LLM-Assisted Categorization',
      desc: 'Context-aware classification of ambiguous chat and alert free-form logs into handover sections.',
      icon: Bot,
      category: 'AI Enhancements',
    },
    {
      title: 'LLM Executive Summarization',
      desc: 'AI-synthesized high-level shift executive briefings and actionable handover takeaways.',
      icon: Sparkles,
      category: 'AI Enhancements',
    },
    {
      title: 'Multi-Employee Handover History',
      desc: 'Searchable historical archive of prior handovers, trend analytics, and shift rotation logs.',
      icon: History,
      category: 'Auditing',
    },
    {
      title: 'Notifications to Next Shift',
      desc: 'Automated email, Slack DM, or webhook notifications sent directly to incoming on-call engineers.',
      icon: BellRing,
      category: 'Distribution',
    },
  ];

  return (
    <section className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-4 sm:p-5 border border-indigo-900/50 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-2xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                Future Enhancements
              </span>
              <span className="text-xs font-bold text-white">V2 Architecture Roadmap</span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Production integrations planned for post-MVP deployment
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="inline-flex items-center px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/10 transition-colors self-start sm:self-auto"
        >
          <span>{isExpanded ? 'Hide Roadmap' : 'View V2 Planned Features'}</span>
          {isExpanded ? (
            <ChevronUp className="w-3.5 h-3.5 ml-1.5 text-indigo-300" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 ml-1.5 text-indigo-300" />
          )}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-indigo-900/60 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in duration-200">
          {roadmapItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="p-3 rounded-xl bg-white/5 border border-white/10 hover:border-indigo-400/40 transition-colors group"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-3xs font-mono font-semibold uppercase text-indigo-300">
                    {item.category}
                  </span>
                  <Icon className="w-3.5 h-3.5 text-indigo-400 group-hover:text-indigo-300 transition-colors" />
                </div>
                <h4 className="text-xs font-bold text-white flex items-center">
                  <span>{item.title}</span>
                  <ArrowUpRight className="w-3 h-3 ml-1 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </h4>
                <p className="text-2xs text-slate-300 mt-1 leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
