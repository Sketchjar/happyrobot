import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const DB_PATH = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "happyrobot.db");

function ensureDir(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

ensureDir(DB_PATH);

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS loads (
    load_id TEXT PRIMARY KEY,
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    pickup_datetime TEXT NOT NULL,
    delivery_datetime TEXT NOT NULL,
    equipment_type TEXT NOT NULL,
    loadboard_rate REAL NOT NULL,
    notes TEXT,
    weight REAL,
    commodity_type TEXT,
    num_of_pieces INTEGER,
    miles REAL,
    dimensions TEXT
  );

  CREATE TABLE IF NOT EXISTS calls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    mc_number TEXT,
    carrier_name TEXT,
    load_id TEXT,
    outcome TEXT NOT NULL,
    sentiment TEXT,
    final_rate REAL,
    loadboard_rate REAL,
    num_rounds INTEGER DEFAULT 0,
    summary TEXT,
    FOREIGN KEY (load_id) REFERENCES loads(load_id)
  );

  CREATE INDEX IF NOT EXISTS idx_calls_created_at ON calls(created_at);
  CREATE INDEX IF NOT EXISTS idx_calls_outcome ON calls(outcome);
`);

const loadCount = (db.prepare("SELECT COUNT(*) AS n FROM loads").get() as { n: number }).n;
if (loadCount === 0) {
  const seedPath = path.join(process.cwd(), "data", "seed-loads.json");
  if (fs.existsSync(seedPath)) {
    type SeedRow = LoadRow;
    const seedLoads = JSON.parse(fs.readFileSync(seedPath, "utf8")) as SeedRow[];
    const insert = db.prepare(
      `INSERT OR IGNORE INTO loads
       (load_id, origin, destination, pickup_datetime, delivery_datetime, equipment_type,
        loadboard_rate, notes, weight, commodity_type, num_of_pieces, miles, dimensions)
       VALUES
       (@load_id, @origin, @destination, @pickup_datetime, @delivery_datetime, @equipment_type,
        @loadboard_rate, @notes, @weight, @commodity_type, @num_of_pieces, @miles, @dimensions)`,
    );
    db.transaction((rows: SeedRow[]) => {
      for (const row of rows) insert.run(row);
    })(seedLoads);
    console.log(`[db] Hydrated ${seedLoads.length} loads into empty DB at ${DB_PATH}`);
  }
}

export default db;

export type LoadRow = {
  load_id: string;
  origin: string;
  destination: string;
  pickup_datetime: string;
  delivery_datetime: string;
  equipment_type: string;
  loadboard_rate: number;
  notes: string | null;
  weight: number | null;
  commodity_type: string | null;
  num_of_pieces: number | null;
  miles: number | null;
  dimensions: string | null;
};

export type CallRow = {
  id: number;
  created_at: string;
  mc_number: string | null;
  carrier_name: string | null;
  load_id: string | null;
  outcome: string;
  sentiment: string | null;
  final_rate: number | null;
  loadboard_rate: number | null;
  num_rounds: number;
  summary: string | null;
};
