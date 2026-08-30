import { PolymarketMarketsSection } from "@/features/prediction-markets/PolymarketMarketsSection";

export function PredictionMarketsPage() {
  return (
    <div className="px-5 pb-10">
      <header className="flex flex-wrap items-end justify-between gap-2 py-4">
        <div>
          <p className="eyebrow">Home / Terminal / Prediction Markets</p>
          <h1 className="mt-0.5 text-lg font-semibold tracking-tight text-ink">
            Prediction Markets - Polymarket Data
          </h1>
        </div>
        <p className="max-w-md text-right font-mono text-[10px] uppercase tracking-wider text-mut">
          Live event odds via Polymarket's public API.
        </p>
      </header>

      <div className="mt-4 grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-12">
        <PolymarketMarketsSection />
      </div>
    </div>
  );
}
