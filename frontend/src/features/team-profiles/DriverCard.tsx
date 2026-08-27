import { AnalyticsCard } from "@/components/ui/AnalyticsCard";
import { Silhouette } from "@/components/ui/Silhouette";
import { useDriver, useDriverCareer, useDriverSeasons } from "@/lib/queries";

function ageFromDob(dob: string | null): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const beforeBirthday =
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}

export function DriverCard(props: { driverId: number; className?: string }) {
  const driver = useDriver(props.driverId);
  const career = useDriverCareer(props.driverId);
  const seasons = useDriverSeasons(props.driverId);

  const loading = driver.isPending || career.isPending || seasons.isPending;
  const error = (driver.error ?? career.error ?? seasons.error) as Error | null;

  const age = driver.data ? ageFromDob(driver.data.date_of_birth) : null;
  const wins = career.data?.rows[0]?.wins ?? null;
  const seasonList = seasons.data ?? [];
  const firstTeam = seasonList[0]?.team_name ?? null;
  const currentTeam = seasonList.length ? seasonList[seasonList.length - 1].team_name : null;
  const flagClass = driver.data?.country_code
    ? `fi fi-${driver.data.country_code.toLowerCase()}`
    : null;

  return (
    <AnalyticsCard
      eyebrow="Driver"
      title={driver.data ? `${driver.data.forename} ${driver.data.surname}` : "—"}
      loading={loading}
      error={error}
      onRetry={() => {
        driver.refetch();
        career.refetch();
        seasons.refetch();
      }}
      className={props.className}
      bodyClassName="p-3"
    >
      {driver.data && (
        <div className="flex h-full items-center gap-4">
          <Silhouette variant="person" className="h-full w-36 flex-none" iconSize={56} />
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <div>
              <p className="truncate text-xl font-semibold text-ink">
                {driver.data.forename} {driver.data.surname}
              </p>
              <p className="mt-1 flex items-center gap-1.5 font-mono text-xs text-sub">
                {flagClass && <span aria-hidden className={`${flagClass} text-[11px]`} />}
                {driver.data.nationality ?? "—"}
                {age != null && <span className="text-mut">· {age}y</span>}
              </p>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 font-mono text-[11px] text-mut">
              <div>
                <dt className="uppercase tracking-wider">First team</dt>
                <dd className="truncate text-sub">{firstTeam ?? "—"}</dd>
              </div>
              <div>
                <dt className="uppercase tracking-wider">Current team</dt>
                <dd className="truncate text-sub">{currentTeam ?? "—"}</dd>
              </div>
              <div>
                <dt className="uppercase tracking-wider">Career wins</dt>
                <dd className="text-sm tabular-nums text-ink">{wins ?? "—"}</dd>
              </div>
              <div>
                <dt className="uppercase tracking-wider">Pole positions</dt>
                <dd
                  className="text-sm tabular-nums text-mut"
                  title="Not available at driver grain — see CLAUDE.md bronze data gaps"
                >
                  —
                </dd>
              </div>
            </dl>
          </div>
        </div>
      )}
    </AnalyticsCard>
  );
}
