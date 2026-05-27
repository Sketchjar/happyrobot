/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";
import db, { type LoadRow } from "../src/lib/db";

const SEED_PATH = path.join(process.cwd(), "data", "seed-loads.json");

if (!fs.existsSync(SEED_PATH)) {
  console.error(`Seed file not found at ${SEED_PATH}`);
  process.exit(1);
}

const loads = JSON.parse(fs.readFileSync(SEED_PATH, "utf8")) as LoadRow[];

const insert = db.prepare(
  `INSERT OR REPLACE INTO loads
   (load_id, origin, destination, pickup_datetime, delivery_datetime, equipment_type,
    loadboard_rate, notes, weight, commodity_type, num_of_pieces, miles, dimensions)
   VALUES
   (@load_id, @origin, @destination, @pickup_datetime, @delivery_datetime, @equipment_type,
    @loadboard_rate, @notes, @weight, @commodity_type, @num_of_pieces, @miles, @dimensions)`,
);

const tx = db.transaction((rows: LoadRow[]) => {
  for (const row of rows) insert.run(row);
});

tx(loads);

console.log(`Seeded ${loads.length} loads.`);
