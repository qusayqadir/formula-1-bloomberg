/** Circuit country → ISO 3166-1 alpha-2 for flag-icons classes.
 *  bronze.circuits.country_code is NULL on every row (known gap), so flags
 *  key off the country NAME via this curated map; a populated DB code wins
 *  once ingest backfills it (same convention as team colors). */
import type { Circuit } from "@/lib/types";

const COUNTRY_ISO2: Record<string, string> = {
  argentina: "ar",
  australia: "au",
  austria: "at",
  azerbaijan: "az",
  bahrain: "bh",
  belgium: "be",
  brazil: "br",
  canada: "ca",
  china: "cn",
  france: "fr",
  germany: "de",
  hungary: "hu",
  india: "in",
  italy: "it",
  japan: "jp",
  korea: "kr",
  "south korea": "kr",
  malaysia: "my",
  mexico: "mx",
  monaco: "mc",
  morocco: "ma",
  netherlands: "nl",
  portugal: "pt",
  qatar: "qa",
  russia: "ru",
  "saudi arabia": "sa",
  singapore: "sg",
  "south africa": "za",
  spain: "es",
  sweden: "se",
  switzerland: "ch",
  turkey: "tr",
  uae: "ae",
  "united arab emirates": "ae",
  uk: "gb",
  "united kingdom": "gb",
  usa: "us",
  "united states": "us",
  "united states of america": "us",
  vietnam: "vn",
};

export function circuitIso2(circuit: Circuit | undefined): string | null {
  if (!circuit) return null;
  if (circuit.country_code) return circuit.country_code.toLowerCase();
  const byName = circuit.country && COUNTRY_ISO2[circuit.country.trim().toLowerCase()];
  return byName || null;
}
