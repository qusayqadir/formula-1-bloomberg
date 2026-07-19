import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AppShell } from "@/components/shell/AppShell";
import { FiltersProvider } from "@/state/filters";
import { ThemeProvider } from "@/state/theme";
import { HistoricalDashboard } from "@/features/dashboard/HistoricalDashboard";
import { ChatPage } from "@/pages/Chat";

// three.js is heavy — split the calendar out of the main bundle
const CalendarPage = lazy(() =>
  import("@/features/calendar/CalendarPage").then((m) => ({ default: m.CalendarPage })),
);
import { ComingSoon } from "@/pages/ComingSoon";
import { Creator } from "@/pages/Creator";
import { DocsApis } from "@/pages/DocsApis";
import { DocsArchitecture } from "@/pages/DocsArchitecture";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity, // historical data — refetches are key-driven
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const stub = (title: string, note: string) => <ComingSoon title={title} note={note} />;

const router = createBrowserRouter([
  {
    element: (
      <FiltersProvider>
        <AppShell />
      </FiltersProvider>
    ),
    children: [
      { path: "/", element: <HistoricalDashboard /> },
      { path: "/news", element: stub("News", "Paddock headlines and race weekend coverage will land here.") },
      {
        path: "/calendar",
        element: (
          <Suspense fallback={<div className="h-full" style={{ background: "#050608" }} />}>
            <CalendarPage />
          </Suspense>
        ),
      },
      { path: "/track-walk", element: stub("Track Walk", "Circuit deep-dives with corner-by-corner geography.") },
      { path: "/teams", element: stub("Team Profiles", "Constructor histories, liveries and season-by-season records.") },
      { path: "/chat", element: <ChatPage /> },
      { path: "/archived", element: stub("Archived", "Saved analytical views and shared dashboard snapshots.") },
      { path: "/live", element: stub("Live Dashboard", "Deferred — the platform is historical-only until a telemetry source is ingested.") },
      { path: "/docs/apis", element: <DocsApis /> },
      { path: "/docs/architecture", element: <DocsArchitecture /> },
      { path: "/creator", element: <Creator /> },
      { path: "*", element: stub("Not found", "That route doesn’t exist. Use the sidebar to get back on track.") },
    ],
  },
]);

export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
