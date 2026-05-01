import { Suspense, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";
import OnboardingWidget from "@/components/OnboardingWidget";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CommandPalette } from "@/components/CommandPalette";
import { cn } from "@/lib/utils";
import { PageFallback, type Page } from "@/pages/pageRegistry";

type AppShellProps = {
  currentPage: Page;
  isMobile: boolean;
  selectedSessionId: string | null;
  selectedPatientId: string | null;
  onNavigate: (page: string) => void;
  onPrefetch: (page: string) => void;
  children: ReactNode;
};

export function AppShell({
  currentPage,
  isMobile,
  selectedSessionId,
  selectedPatientId,
  onNavigate,
  onPrefetch,
  children,
}: AppShellProps) {
  const pageKey = currentPage + (selectedSessionId?.toString() || "") + (selectedPatientId?.toString() || "");

  return (
    <ErrorBoundary>
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:px-4 focus:py-2 focus:bg-background focus:text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:rounded-md m-2"
      >
        Pular para o conteúdo principal
      </a>
      <motion.div
        className="min-h-screen bg-background"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <Sidebar currentPage={currentPage} onNavigate={onNavigate} onPrefetch={onPrefetch} />
        <main
          id="main-content"
          className="pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0"
          style={!isMobile ? { paddingLeft: "var(--sidebar-w, 256px)" } : undefined}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={pageKey}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <Suspense fallback={<PageFallback />}>{children}</Suspense>
            </motion.div>
          </AnimatePresence>
        </main>
        <OnboardingWidget />
        <CommandPalette />
        {isMobile && <BottomNav currentPage={currentPage} onNavigate={onNavigate} onPrefetch={onPrefetch} />}
      </motion.div>
    </ErrorBoundary>
  );
}
