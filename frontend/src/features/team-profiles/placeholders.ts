/** Placeholder scaffolding for fields with no backend source yet (factory
 *  location, pit-wall personnel, reserve driver, imagery). Deliberately
 *  labeled as unavailable rather than fabricated — see CLAUDE.md "Known
 *  bronze data gaps". Swap for real data once ingest/S3 exist. */

export const PIT_WALL_PLACEHOLDER: { role: string }[] = [
  { role: "Team Principal" },
  { role: "Race Engineer" },
  { role: "Chief Strategist" },
  { role: "Head of Aerodynamics" },
  { role: "Performance Engineer" },
  { role: "Sporting Director" },
];

export const RESERVE_DRIVER_PLACEHOLDER = { role: "Reserve Driver" };

export const CAROUSEL_PLACEHOLDER_COUNT = 10;
