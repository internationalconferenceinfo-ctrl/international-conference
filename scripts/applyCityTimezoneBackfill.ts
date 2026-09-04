import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "vite";
import { detectCityTimeZone } from "../src/shared/utils/cityTimezoneLookup";

type CityRow = {
  id: string;
  name: string;
  country: string;
  time_zone: string | null;
};

const APPLY =
  process.argv.includes("--apply");

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
const DETECTION_BATCH_SIZE = 50;
const UPDATE_BATCH_SIZE = 20;

async function fetchAllCities(): Promise<
  CityRow[]
> {
  const allCities: CityRow[] = [];

  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;

    const { data, error } =
      await supabase
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
    "Starting city timezone backfill..."
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

  const resolved: Array<{
    id: string;
    name: string;
    country: string;
    timeZone: string;
  }> = [];

  const unresolved: CityRow[] = [];

  for (
    let index = 0;
    index < missingCities.length;
    index += DETECTION_BATCH_SIZE
  ) {
    const batch =
      missingCities.slice(
        index,
        index + DETECTION_BATCH_SIZE
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
        resolved.push({
          id: result.city.id,
          name: result.city.name,
          country:
            result.city.country,
          timeZone:
            result.timeZone,
        });
      } else {
        unresolved.push(
          result.city
        );
      }
    }

    console.log(
      `Detected ${Math.min(
        index +
          DETECTION_BATCH_SIZE,
        missingCities.length
      )} / ${missingCities.length}`
    );
  }

  console.log("");
  console.log(
    `Resolvable: ${resolved.length}`
  );

  console.log(
    `Unresolved: ${unresolved.length}`
  );

  if (!APPLY) {
    console.log("");
    console.log(
      "SAFETY STOP: No database rows were changed."
    );

    console.log(
      "To apply the backfill, run:"
    );

    console.log(
      "npx tsx scripts/applyCityTimezoneBackfill.ts --apply"
    );

    return;
  }

  console.log("");
  console.log(
    "APPLY MODE ENABLED"
  );

  let updated = 0;
  let failed = 0;
  let alreadyFilled = 0;

  for (
    let index = 0;
    index < resolved.length;
    index += UPDATE_BATCH_SIZE
  ) {
    const batch =
      resolved.slice(
        index,
        index + UPDATE_BATCH_SIZE
      );

    const results =
      await Promise.all(
        batch.map(async (city) => {
          /*
           * Re-check the row before writing.
           * Never replace an existing timezone.
           */
          const {
            data: current,
            error: readError,
          } = await supabase
            .from("cities")
            .select("time_zone")
            .eq("id", city.id)
            .single();

          if (readError) {
            return {
              status: "failed" as const,
              city,
              error: readError,
            };
          }

          if (
            String(
              current?.time_zone || ""
            ).trim()
          ) {
            return {
              status:
                "already-filled" as const,
              city,
            };
          }

          const { error } =
            await supabase
              .from("cities")
              .update({
                time_zone:
                  city.timeZone,
              })
              .eq("id", city.id);

          if (error) {
            return {
              status: "failed" as const,
              city,
              error,
            };
          }

          return {
            status: "updated" as const,
            city,
          };
        })
      );

    for (const result of results) {
      if (
        result.status === "updated"
      ) {
        updated++;
      } else if (
        result.status ===
        "already-filled"
      ) {
        alreadyFilled++;
      } else {
        failed++;

        console.error(
          `Failed: ${result.city.name}, ${result.city.country}`,
          result.error
        );
      }
    }

    console.log(
      `Processed ${Math.min(
        index + UPDATE_BATCH_SIZE,
        resolved.length
      )} / ${resolved.length}`
    );
  }

  console.log("");
  console.log(
    "========== BACKFILL RESULT =========="
  );

  console.log(
    `Updated: ${updated}`
  );

  console.log(
    `Already filled: ${alreadyFilled}`
  );

  console.log(
    `Failed: ${failed}`
  );

  console.log(
    `Left unresolved safely: ${unresolved.length}`
  );
}

main().catch((error) => {
  console.error(
    "Timezone backfill failed:",
    error
  );

  process.exit(1);
});