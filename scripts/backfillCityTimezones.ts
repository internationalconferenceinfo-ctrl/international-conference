import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "vite";
import { detectCityTimeZone } from "../src/shared/utils/cityTimezoneLookup";

type CityRow = {
  id: string;
  name: string;
  country: string;
  time_zone: string | null;
};

const env = loadEnv(
  "development",
  process.cwd(),
  ""
);

const supabaseUrl = String(
  env.SUPABASE_URL ||
  env.VITE_SUPABASE_URL ||
  ""
).trim();

const serviceRoleKey = String(
  env.SUPABASE_SERVICE_ROLE_KEY || ""
).trim();

if (!supabaseUrl) {
  throw new Error(
    "Missing SUPABASE_URL or VITE_SUPABASE_URL"
  );
}

if (!serviceRoleKey) {
  throw new Error(
    "Missing SUPABASE_SERVICE_ROLE_KEY"
  );
}

const supabase = createClient(
  supabaseUrl,
  serviceRoleKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

const PAGE_SIZE = 500;
const TIMEZONE_BATCH_SIZE = 50;

async function fetchAllCities(): Promise<
  CityRow[]
> {
  const allCities: CityRow[] = [];

  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from("cities")
      .select(
        "id,name,country,time_zone"
      )
      .order("id", {
        ascending: true,
      })
      .range(from, to);

    if (error) {
      throw error;
    }

    const rows =
      (data || []) as CityRow[];

    allCities.push(...rows);

    if (rows.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  return allCities;
}

async function main() {
  console.log(
    "Starting city timezone DRY RUN..."
  );

  console.log(
    "No database rows will be changed."
  );

  const cities =
    await fetchAllCities();

  const missingCities =
    cities.filter(
      (city) =>
        !String(
          city.time_zone || ""
        ).trim()
    );

  console.log(
    `Total cities: ${cities.length}`
  );

  console.log(
    `Cities without timezone: ${missingCities.length}`
  );

  let resolvedCount = 0;
  let unresolvedCount = 0;

  const resolvedSamples: Array<{
    city: string;
    country: string;
    timeZone: string;
  }> = [];

  const unresolvedSamples: Array<{
    city: string;
    country: string;
  }> = [];

  for (
    let index = 0;
    index < missingCities.length;
    index += TIMEZONE_BATCH_SIZE
  ) {
    const batch =
      missingCities.slice(
        index,
        index + TIMEZONE_BATCH_SIZE
      );

    const results =
      await Promise.all(
        batch.map(async (city) => {
          const timeZone =
            await detectCityTimeZone(
              city.name,
              city.country
            );

          return {
            city,
            timeZone,
          };
        })
      );

    for (const result of results) {
      if (result.timeZone) {
        resolvedCount++;

        if (
          resolvedSamples.length < 20
        ) {
          resolvedSamples.push({
            city: result.city.name,
            country:
              result.city.country,
            timeZone:
              result.timeZone,
          });
        }
      } else {
        unresolvedCount++;

        if (
          unresolvedSamples.length < 20
        ) {
          unresolvedSamples.push({
            city: result.city.name,
            country:
              result.city.country,
          });
        }
      }
    }

    console.log(
      `Checked ${Math.min(
        index + TIMEZONE_BATCH_SIZE,
        missingCities.length
      )} / ${missingCities.length}`
    );
  }

  console.log("");
  console.log(
    "========== DRY RUN RESULT =========="
  );

  console.log(
    `Resolvable safely: ${resolvedCount}`
  );

  console.log(
    `Still unresolved: ${unresolvedCount}`
  );

  console.log("");
  console.log(
    "Sample resolved cities:"
  );

  console.table(resolvedSamples);

  console.log("");
  console.log(
    "Sample unresolved cities:"
  );

  console.table(unresolvedSamples);

  console.log("");
  console.log(
    "DRY RUN complete. No database rows were changed."
  );
}

main().catch((error) => {
  console.error(
    "Backfill dry run failed:",
    error
  );

  process.exit(1);
});