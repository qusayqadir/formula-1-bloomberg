import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AppShell } from "@/components/shell/AppShell";
import { FiltersProvider } from "@/state/filters";
import { HistoricalDashboard } from "@/features/dashboard/HistoricalDashboard";
import { ComingSoon } from "@/pages/ComingSoon";

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
      { path: "/calendar", element: stub("Calendar", "Full season schedule with session times, synced to the ingested rounds.") },
      { path: "/track-walk", element: stub("Track Walk", "Circuit deep-dives with corner-by-corner geography.") },
      { path: "/teams", element: stub("Team Profiles", "Constructor histories, liveries and season-by-season records.") },
      { path: "/chat", element: stub("Chat", "RAG-powered chat over the historical database (prototype in app/chatbot).") },
      { path: "/archived", element: stub("Archived", "Saved analytical views and shared dashboard snapshots.") },
      { path: "/live", element: stub("Live Dashboard", "Deferred — the platform is historical-only until a telemetry source is ingested.") },
      { path: "/help", element: stub("Help Center", "Keyboard shortcuts, data dictionary and API usage guides.") },
      { path: "*", element: stub("Not found", "That route doesn’t exist. Use the sidebar to get back on track.") },
    ],
  },
]);

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
