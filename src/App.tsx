import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { DashboardModeProvider } from "@/contexts/DashboardModeContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { PersonalPageGuard } from "@/components/layout/PersonalPageGuard";
import { PWAInstallPrompt } from "@/components/pwa/PWAInstallPrompt";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Skeleton } from "@/components/ui/skeleton";
import { OfflineIndicator } from "@/components/pwa/OfflineIndicator";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { useOnboarding } from "@/hooks/useOnboarding";
import { AnimatePresence } from "framer-motion";

// Lazy load pages for code splitting
const Auth = lazy(() => import("./pages/Auth"));
const Setup = lazy(() => import("./pages/Setup"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Tasks = lazy(() => import("./pages/Tasks"));
const Notes = lazy(() => import("./pages/Notes"));
const Habits = lazy(() => import("./pages/Habits"));
const Family = lazy(() => import("./pages/Family"));
const Budget = lazy(() => import("./pages/Budget"));
const Salary = lazy(() => import("./pages/Salary"));
const Investments = lazy(() => import("./pages/Investments"));
const Loans = lazy(() => import("./pages/Loans"));
const Goals = lazy(() => import("./pages/Goals"));
const Projects = lazy(() => import("./pages/Projects"));
const Calendar = lazy(() => import("./pages/Calendar"));
const SupportUsers = lazy(() => import("./pages/SupportUsers"));
const DeviceInventory = lazy(() => import("./pages/DeviceInventory"));
const DeviceProfile = lazy(() => import("./pages/DeviceProfile"));
const SupportTickets = lazy(() => import("./pages/SupportTickets"));
const SubmitTicket = lazy(() => import("./pages/SubmitTicket"));
const TimeTracking = lazy(() => import("./pages/TimeTracking"));
const WorkflowAutomation = lazy(() => import("./pages/WorkflowAutomation"));
const AiHub = lazy(() => import("./pages/AiHub"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Settings = lazy(() => import("./pages/Settings"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 10 * 60 * 1000, // 10 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes
      refetchOnWindowFocus: false,
    },
  },
});

// Loading fallback for lazy-loaded pages
const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="space-y-4 w-full max-w-md p-8">
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-32 w-full" />
    </div>
  </div>
);

// App content with onboarding
const AppContent = () => {
  const { showOnboarding, isLoading, completeOnboarding } = useOnboarding();

  useEffect(() => {
    const handler = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      event.preventDefault();
    };
    window.addEventListener('unhandledrejection', handler);
    return () => window.removeEventListener('unhandledrejection', handler);
  }, []);

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <>
      <AnimatePresence mode="wait">
        {showOnboarding && (
          <OnboardingFlow onComplete={completeOnboarding} />
        )}
      </AnimatePresence>
      {!showOnboarding && (
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/setup" element={<Setup />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<AppLayout><Dashboard /></AppLayout>} />
            <Route path="/tasks" element={<AppLayout><Tasks /></AppLayout>} />
            <Route path="/notes" element={<AppLayout><Notes /></AppLayout>} />
            <Route path="/habits" element={<AppLayout><PersonalPageGuard><Habits /></PersonalPageGuard></AppLayout>} />
            <Route path="/family" element={<AppLayout><PersonalPageGuard><Family /></PersonalPageGuard></AppLayout>} />
            <Route path="/budget" element={<AppLayout><PersonalPageGuard><Budget /></PersonalPageGuard></AppLayout>} />
            <Route path="/salary" element={<AppLayout><PersonalPageGuard><Salary /></PersonalPageGuard></AppLayout>} />
            <Route path="/investments" element={<AppLayout><PersonalPageGuard><Investments /></PersonalPageGuard></AppLayout>} />
            <Route path="/loans" element={<AppLayout><PersonalPageGuard><Loans /></PersonalPageGuard></AppLayout>} />
            <Route path="/goals" element={<AppLayout><Goals /></AppLayout>} />
            <Route path="/projects" element={<AppLayout><Projects /></AppLayout>} />
            <Route path="/calendar" element={<AppLayout><Calendar /></AppLayout>} />
            <Route path="/support-users" element={<AppLayout><SupportUsers /></AppLayout>} />
            <Route path="/device-inventory" element={<AppLayout><DeviceInventory /></AppLayout>} />
            <Route path="/device/:deviceNumber" element={<DeviceProfile />} />
            <Route path="/support-tickets" element={<AppLayout><SupportTickets /></AppLayout>} />
            <Route path="/submit-ticket" element={<SubmitTicket />} />
            <Route path="/time-tracking" element={<AppLayout><TimeTracking /></AppLayout>} />
            <Route path="/workflow" element={<AppLayout><WorkflowAutomation /></AppLayout>} />
            <Route path="/ai-hub" element={<AppLayout><AiHub /></AppLayout>} />
            <Route path="/analytics" element={<AppLayout><Analytics /></AppLayout>} />
            <Route path="/settings" element={<AppLayout><Settings /></AppLayout>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      )}
    </>
  );
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LanguageProvider>
          <DashboardModeProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <PWAInstallPrompt />
              <OfflineIndicator />
              <BrowserRouter>
                <AppContent />
              </BrowserRouter>
            </TooltipProvider>
          </DashboardModeProvider>
        </LanguageProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
