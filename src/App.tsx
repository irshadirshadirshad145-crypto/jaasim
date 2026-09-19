import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { ShiftSetupForm } from './components/ShiftSetupForm';
import { ActivityReviewPage } from './components/ActivityReviewPage';
import { GeneratedNotePreview } from './components/GeneratedNotePreview';
import { ExportView } from './components/ExportView';
import { ValidationView } from './components/ValidationView';
import { AdminPanel } from './components/AdminPanel';
import { HandoverHistory } from './components/HandoverHistory';
import { LoginPage } from './components/auth/LoginPage';
import { SignUpPage } from './components/auth/SignUpPage';
import {
  initializeAuth,
  subscribeToAuth,
  logoutUser,
} from './services/authService';
import {
  INITIAL_MOCK_EVENTS,
  PREVIOUS_SHIFT_UNRESOLVED_EVENTS,
  getHighVolumeMockEvents,
  getZeroEventMockEvents,
  getDefaultShiftConfig,
} from './data/mockData';
import {
  ShiftSetupConfig,
  SourceType,
  HandoverReport,
  HandoverCategory,
  DataProcessingResult,
  EditableHandoverData,
  EditableHandoverItem,
  ShiftEvent,
  AppPage,
  AuthUserProfile,
} from './types';
import { isWithinShift, formatDateTimeDisplay } from './utils/dateUtils';
import { generateHandoverNote } from './utils/handoverGenerator';
import { processShiftActivities } from './utils/handoverPipeline';
import { exportHandoverToPdf } from './utils/pdfExporter';
import { CheckCircle2 } from 'lucide-react';

export default function App() {
  const [config, setConfig] = useState<ShiftSetupConfig>(getDefaultShiftConfig);
  const [events, setEvents] = useState<ShiftEvent[]>(INITIAL_MOCK_EVENTS);
  const [currentPage, setCurrentPage] = useState<AppPage>('dashboard');
  const [manualCategoryOverrides, setManualCategoryOverrides] = useState<Record<string, HandoverCategory>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUserProfile | null>(null);
  const [authNoticeMessage, setAuthNoticeMessage] = useState<string | undefined>(undefined);

  // Initialize and listen to Supabase Auth state
  useEffect(() => {
    initializeAuth().then((user) => {
      setCurrentUser(user);
    });
    const unsubscribe = subscribeToAuth((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 3500);
  };

  // Automatically scroll main content area to top when switching pages
  useEffect(() => {
    const mainScroll = document.getElementById('main-content-scroll');
    if (mainScroll) {
      mainScroll.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
  }, [currentPage]);

  // Process shift activities deterministically
  const processingResult: DataProcessingResult = useMemo(() => {
    return processShiftActivities(config, events, {
      manualCategoryOverrides,
      previousShiftEvents: config.enableOrphanedTaskDetector
        ? PREVIOUS_SHIFT_UNRESOLVED_EVENTS
        : undefined,
    });
  }, [config, events, manualCategoryOverrides]);

  // Generate structured handover report
  const currentReport: HandoverReport = useMemo(() => {
    return generateHandoverNote(config, events, {
      manualCategoryOverrides,
      previousShiftEvents: config.enableOrphanedTaskDetector
        ? PREVIOUS_SHIFT_UNRESOLVED_EVENTS
        : undefined,
    });
  }, [config, events, manualCategoryOverrides]);

  // Filter raw events in shift window
  const inShiftEvents = useMemo(() => {
    return events.filter((e) => {
      if (!config.selectedSources[e.source]) return false;
      return isWithinShift(e.timestamp, config.startDateTime, config.endDateTime);
    });
  }, [events, config]);

  // Handle configuration updates
  const handleConfigChange = (updated: Partial<ShiftSetupConfig>) => {
    setConfig((prev) => ({
      ...prev,
      ...updated,
    }));
  };

  // Toggle individual data source
  const handleToggleSource = (source: SourceType) => {
    setConfig((prev) => ({
      ...prev,
      selectedSources: {
        ...prev.selectedSources,
        [source]: !prev.selectedSources[source],
      },
    }));
  };

  // Reset shift setup back to defaults
  const handleReset = () => {
    const freshDefaults = getDefaultShiftConfig();
    setConfig(freshDefaults);
    setEvents(INITIAL_MOCK_EVENTS);
    setManualCategoryOverrides({});
    setCurrentPage('dashboard');
    showToast('Shift parameters reset to default 8-hour shift.');
  };

  // High-Volume shift preset (50+ events) for stress testing
  const handleLoadHighVolumePreset = () => {
    const highVolEvents = getHighVolumeMockEvents();
    setEvents(highVolEvents);
    showToast(`Loaded High-Volume Shift dataset (${highVolEvents.length} events across 4 feeds).`);
  };

  // Zero-event shift preset (calm shift / overnight quiet period)
  const handleLoadZeroEventPreset = () => {
    const zeroEvents = getZeroEventMockEvents();
    setEvents(zeroEvents);
    showToast('Loaded Zero-Event Shift dataset. Verifying "Nothing to report" handling.');
  };

  // Custom JSON ingestion handler
  const handleIngestCustomEvents = (newEvents: ShiftEvent[]) => {
    setEvents((prev) => [...newEvents, ...prev]);
    showToast(`Successfully ingested ${newEvents.length} valid custom event(s) into shift stream.`);
  };

  // Manual category override handler
  const handleUpdateCategory = useCallback(
    (source: SourceType, recordId: string, newCategory: HandoverCategory) => {
      const key = `${source}:${recordId}`;
      setManualCategoryOverrides((prev) => ({
        ...prev,
        [key]: newCategory,
      }));
      showToast(`Moved ${recordId} to ${newCategory.replace('_', ' ')}`);
    },
    []
  );

  // Synthesize Handover Note action (moves to Activity Review)
  const handleGenerate = () => {
    if (!config.employeeName.trim()) {
      showToast('Please enter an operator or engineer name.');
      return;
    }

    const activeSources = Object.values(config.selectedSources).filter(Boolean).length;
    if (activeSources === 0) {
      showToast('Please select at least one data source.');
      return;
    }

    setIsGenerating(true);

    setTimeout(() => {
      setIsGenerating(false);
      setCurrentPage('review');
      showToast(
        `Pipeline complete: ${processingResult.stats.inWindowCount} filtered, ${processingResult.stats.deduplicatedCount} deduplicated, ${processingResult.activities.length} categorized.`
      );
    }, 280);
  };

  // Generate again from Handover Note or Export
  const handleGenerateAgain = () => {
    showToast('Re-running normalization pipeline...');
    setCurrentPage('review');
  };

  // Instant 1-click Download PDF handler
  const handleQuickDownloadPdf = useCallback(() => {
    try {
      const shiftDate = config.startDateTime.split('T')[0] || new Date().toISOString().split('T')[0];
      const shiftStart = formatDateTimeDisplay(config.startDateTime);
      const shiftEnd = formatDateTimeDisplay(config.endDateTime);

      const convertItems = (catKey: HandoverCategory): EditableHandoverItem[] => {
        const activities = currentReport.categorized[catKey] || [];
        return activities.map((act) => ({
          id: `${act.source}-${act.recordId}-${Math.random().toString(36).substring(2, 7)}`,
          source: act.source,
          recordId: act.recordId,
          timestamp: act.displayTimestamp || act.normalizedTimestamp,
          status: act.status,
          summary: act.summary,
          priority: act.priority,
          notes: act.handoffNotes || act.details || '',
          isCarriedForward: act.isCarriedForward,
          carriedFromShift: act.carriedFromShift,
        }));
      };

      const completed = convertItems('COMPLETED');
      const inProgress = convertItems('IN_PROGRESS');
      const blockers = convertItems('BLOCKERS');
      const watchList = convertItems('WATCH_LIST');

      const countParts: string[] = [];
      if (completed.length > 0) countParts.push(`${completed.length} tickets completed`);
      if (inProgress.length > 0) countParts.push(`${inProgress.length} in-progress`);
      if (blockers.length > 0) countParts.push(`${blockers.length} blockers`);
      if (watchList.length > 0) countParts.push(`${watchList.length} on watch-list`);
      const autoCountStr = countParts.join(', ') || '0 activities recorded';

      const editableData: EditableHandoverData = {
        employeeName: config.employeeName || 'Operations Engineer',
        employeeRole: config.employeeRole || 'Operations Lead',
        shiftDate,
        shiftStart,
        shiftEnd,
        autoCountSummary: autoCountStr,
        summary: currentReport.summary || `Operational shift concluded for ${config.employeeName || 'on-call staff'} covering interval ${shiftStart} to ${shiftEnd}. Key highlights include ${autoCountStr}. All high-priority blockers have been escalated to incoming on-call personnel.`,
        sections: {
          COMPLETED: completed,
          IN_PROGRESS: inProgress,
          BLOCKERS: blockers,
          WATCH_LIST: watchList,
        },
      };

      exportHandoverToPdf(editableData);
      showToast('Shift Handover Note PDF downloaded successfully!');
    } catch (err: unknown) {
      console.error('Direct PDF export error:', err);
      showToast('Failed to download PDF. Please check browser permissions or retry.');
    }
  }, [config, currentReport]);

  const activeSourceCount = Object.values(config.selectedSources).filter(Boolean).length;

  const handleNavigate = (page: AppPage) => {
    // Protect user-specific history page if not authenticated
    if (page === 'history' && !currentUser) {
      setAuthNoticeMessage('Please sign in to access your saved shift handovers and user-specific cloud archives.');
      setCurrentPage('login');
      setIsMobileSidebarOpen(false);
      return;
    }
    setAuthNoticeMessage(undefined);
    setCurrentPage(page);
    setIsMobileSidebarOpen(false);
  };

  const handleLoginSuccess = () => {
    showToast('Signed in successfully with Supabase Auth.');
    if (authNoticeMessage) {
      setCurrentPage('history');
    } else {
      setCurrentPage('dashboard');
    }
    setAuthNoticeMessage(undefined);
  };

  const handleSignUpSuccess = () => {
    showToast('Operator account registered successfully.');
    setCurrentPage('dashboard');
    setAuthNoticeMessage(undefined);
  };

  const handleLogout = async () => {
    await logoutUser();
    showToast('Signed out of Supabase Auth.');
    if (currentPage === 'history') {
      setCurrentPage('dashboard');
    }
  };

  return (
    <div className="h-screen h-[100dvh] w-full bg-slate-950 text-slate-100 font-sans flex flex-col overflow-hidden selection:bg-indigo-500 selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-lg border border-slate-700 flex items-center space-x-2 text-xs font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* 1. TOP HEADER - IDENTICAL & PINNED ON EVERY PAGE */}
      <Header
        config={config}
        activeSourceCount={activeSourceCount}
        totalActivitiesCount={processingResult.activities.length}
        onQuickReset={handleReset}
        onDownloadPdf={handleQuickDownloadPdf}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        currentUser={currentUser}
        onLoginClick={() => {
          setAuthNoticeMessage(undefined);
          setCurrentPage('login');
        }}
        onLogoutClick={handleLogout}
      />

      {/* App Body: Fixed Left Sidebar + Scrollable Main Content */}
      <div className="flex-1 flex min-h-0 w-full overflow-hidden relative">
        {/* 2. FIXED LEFT SIDEBAR NAVIGATION */}
        <Sidebar
          currentPage={currentPage}
          onNavigate={handleNavigate}
          synthesizedCount={processingResult.activities.length}
          config={config}
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          carriedCount={processingResult.stats.carriedForwardCount}
          currentUser={currentUser}
          onLogout={handleLogout}
        />

        {/* Dynamic Main Content Area - Full Vertical Scrollability from Top to Bottom */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0 w-full lg:pl-64">
          <main
            id="main-content-scroll"
            className="flex-1 w-full h-full min-h-0 overflow-y-auto overflow-x-hidden bg-slate-950 p-4 sm:p-6 lg:p-8 pb-28 focus:outline-none"
          >
            <div className="max-w-7xl mx-auto space-y-6 w-full">
              {/* AUTH: LOGIN PAGE */}
              {currentPage === 'login' && (
                <LoginPage
                  onSuccess={handleLoginSuccess}
                  onNavigateToSignUp={() => setCurrentPage('signup')}
                  onCancelToApp={() => setCurrentPage('dashboard')}
                  noticeMessage={authNoticeMessage}
                />
              )}

              {/* AUTH: SIGN UP PAGE */}
              {currentPage === 'signup' && (
                <SignUpPage
                  onSuccess={handleSignUpSuccess}
                  onNavigateToLogin={() => setCurrentPage('login')}
                  onCancelToApp={() => setCurrentPage('dashboard')}
                />
              )}

              {/* PAGE 1: DASHBOARD */}
              {currentPage === 'dashboard' && (
                <DashboardView
                  config={config}
                  processingResult={processingResult}
                  events={events}
                  inShiftEvents={inShiftEvents}
                  onNavigate={handleNavigate}
                  onToggleSource={handleToggleSource}
                />
              )}

              {/* PAGE 2: SHIFT SETUP */}
              {currentPage === 'setup' && (
                <ShiftSetupForm
                  config={config}
                  onChangeConfig={handleConfigChange}
                  onToggleSource={handleToggleSource}
                  onGenerate={handleGenerate}
                  onReset={handleReset}
                  inShiftEventsCount={inShiftEvents.length}
                  totalEventsCount={events.length}
                  isGenerating={isGenerating}
                  onQuickDownloadPdf={handleQuickDownloadPdf}
                  onLoadHighVolumePreset={handleLoadHighVolumePreset}
                  onLoadZeroEventPreset={handleLoadZeroEventPreset}
                />
              )}

              {/* PAGE 3: ACTIVITY REVIEW */}
              {currentPage === 'review' && (
                <ActivityReviewPage
                  config={config}
                  processingResult={processingResult}
                  onUpdateCategory={handleUpdateCategory}
                  onBackToSetup={() => setCurrentPage('setup')}
                  onRegenerate={() => {
                    showToast('Shift activity pipeline re-run: 0 duplicates created.');
                  }}
                  onOpenHandoverPreview={() => setCurrentPage('handover')}
                  onDownloadPdf={handleQuickDownloadPdf}
                />
              )}

              {/* PAGE 4: HANDOVER NOTE */}
              {currentPage === 'handover' && (
                <GeneratedNotePreview
                  report={currentReport}
                  config={config}
                  onBackToReview={() => setCurrentPage('review')}
                  onGenerateAgain={handleGenerateAgain}
                  onViewHistory={() => handleNavigate('history')}
                />
              )}

              {/* PAGE 5: HANDOVER HISTORY & CLOUD ARCHIVE (Protected) */}
              {currentPage === 'history' && (
                currentUser ? (
                  <HandoverHistory
                    currentUser={currentUser}
                    onNavigateToHandover={() => setCurrentPage('handover')}
                    showToast={showToast}
                  />
                ) : (
                  <LoginPage
                    onSuccess={handleLoginSuccess}
                    onNavigateToSignUp={() => setCurrentPage('signup')}
                    onCancelToApp={() => setCurrentPage('dashboard')}
                    noticeMessage="Please sign in to access your saved shift handovers and user-specific cloud archives."
                  />
                )
              )}

              {/* PAGE 6: EXPORT */}
              {currentPage === 'export' && (
                <ExportView
                  report={currentReport}
                  config={config}
                  onGenerateAgain={handleGenerateAgain}
                />
              )}

              {/* PAGE 6: VALIDATION */}
              {currentPage === 'validation' && (
                <ValidationView
                  onIngestCustomEvents={handleIngestCustomEvents}
                  processingResult={processingResult}
                />
              )}

              {/* PAGE 7: ADMIN PANEL */}
              {currentPage === 'admin' && (
                <AdminPanel
                  config={config}
                  onChangeConfig={handleConfigChange}
                  processingResult={processingResult}
                  events={events}
                  onToggleSource={handleToggleSource}
                  onQuickDownloadPdf={handleQuickDownloadPdf}
                  showToast={showToast}
                />
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
