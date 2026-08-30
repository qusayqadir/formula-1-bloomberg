/** Fetches the live Polymarket F1 events once and lays out one widget per
 *  event (each its own AnalyticsCard) — a Fragment, not a wrapping element,
 *  so the cards drop straight into the page's own 12-col grid. */
import { AnalyticsCard } from "@/components/ui/AnalyticsCard";
import { PolymarketMarketWidget } from "@/features/prediction-markets/PolymarketMarketWidget";
import { usePolymarketMarkets } from "@/lib/queries";

const WIDGET_CLASS = "h-[400px] md:col-span-1 xl:col-span-3";
const SKELETON_COUNT = 20;

export function PolymarketMarketsSection() {
  const query = usePolymarketMarkets();
  const events = query.data?.events ?? [];

  if (query.isPending) {
    return (
      <>
        {Array.from({ length: SKELETON_COUNT }, (_, i) => (
          <AnalyticsCard
            key={i}
            eyebrow="Live · Polymarket"
            title="Loading…"
            loading
            className={WIDGET_CLASS}
          >
            {null}
          </AnalyticsCard>
        ))}
      </>
    );
  }

  if (query.error) {
    return (
      <AnalyticsCard
        eyebrow="Live · Polymarket"
        title="F1 prediction markets"
        error={query.error as Error}
        onRetry={() => query.refetch()}
        className="h-[400px] md:col-span-2 xl:col-span-12"
      >
        {null}
      </AnalyticsCard>
    );
  }

  if (events.length === 0) {
    return (
      <AnalyticsCard
        eyebrow="Live · Polymarket"
        title="F1 prediction markets"
        empty
        emptyText="No active F1 events found on Polymarket right now."
        className="h-[400px] md:col-span-2 xl:col-span-12"
      >
        {null}
      </AnalyticsCard>
    );
  }

  return (
    <>
      {events.map((e) => (
        <PolymarketMarketWidget
          key={e.event_id}
          event={e}
          refreshing={query.isFetching}
          className={WIDGET_CLASS}
        />
      ))}
    </>
  );
}
