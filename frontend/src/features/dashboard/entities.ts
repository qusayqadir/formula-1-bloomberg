/** Season entity model derived from the seat-map dataset
 *  (/analytics/teams/summary?group_by=team_driver): the one place that knows
 *  which drivers/teams raced a season, their identity colors, and teammate
 *  line styles. Every widget resolves entities through this. */
import { teamColor, teammateLineStyle, type LineStyleKind } from "@/lib/colors";
import { driverCode } from "@/lib/format";
import type { TeamSummaryRow } from "@/lib/types";

export interface SeasonDriver {
  id: number;
  forename: string;
  surname: string;
  name: string;
  code: string;
  teamId: number;
  teamName: string;
  color: string;
  lineStyle: LineStyleKind;
  seasonPoints: number;
  shareOfTeamPoints: number | null;
}

export interface SeasonTeam {
  id: number;
  name: string;
  color: string;
  seasonPoints: number;
}

export interface SeasonEntities {
  drivers: SeasonDriver[]; // sorted by season points desc
  teams: SeasonTeam[]; // sorted by season points desc
  driverById: Map<number, SeasonDriver>;
  teamById: Map<number, SeasonTeam>;
}

export function buildEntities(rows: TeamSummaryRow[] | undefined): SeasonEntities {
  const drivers: SeasonDriver[] = [];
  const teams = new Map<number, SeasonTeam>();
  const teammateIndex = new Map<number, number>();

  // Teams accumulate over EVERY seat row; drivers dedupe to their strongest
  // seat (mid-season swaps would otherwise appear twice).
  const bestSeat = new Map<number, { row: TeamSummaryRow; points: number }>();
  for (const row of rows ?? []) {
    const color = teamColor(row.team);
    const team = teams.get(row.team.id);
    if (team) {
      team.seasonPoints += row.total_points ?? 0;
    } else {
      teams.set(row.team.id, {
        id: row.team.id,
        name: row.team.name,
        color,
        seasonPoints: row.total_points ?? 0,
      });
    }
    if (!row.driver) continue;
    const prev = bestSeat.get(row.driver.id);
    const points = row.total_points ?? 0;
    if (!prev || points > prev.points || (points === prev.points && row.starts > prev.row.starts)) {
      bestSeat.set(row.driver.id, { row, points: points + (prev?.points ?? 0) });
    } else {
      prev.points += points; // season total spans both seats
    }
  }
  const sorted = [...bestSeat.values()].sort(
    (a, b) => a.row.team.id - b.row.team.id || (a.row.driver?.id ?? 0) - (b.row.driver?.id ?? 0),
  );
  for (const { row, points } of sorted) {
    if (!row.driver) continue;
    const color = teamColor(row.team);
    const index = teammateIndex.get(row.team.id) ?? 0;
    teammateIndex.set(row.team.id, index + 1);
    drivers.push({
      id: row.driver.id,
      forename: row.driver.forename,
      surname: row.driver.surname,
      name: `${row.driver.forename} ${row.driver.surname}`,
      code: driverCode(row.driver),
      teamId: row.team.id,
      teamName: row.team.name,
      color,
      lineStyle: teammateLineStyle(index),
      seasonPoints: points,
      shareOfTeamPoints: row.share_of_team_points,
    });
  }
  drivers.sort((a, b) => b.seasonPoints - a.seasonPoints);
  const teamList = [...teams.values()].sort((a, b) => b.seasonPoints - a.seasonPoints);
  return {
    drivers,
    teams: teamList,
    driverById: new Map(drivers.map((d) => [d.id, d])),
    teamById: new Map(teamList.map((t) => [t.id, t])),
  };
}
