import { db } from "./database";
import type { Folder } from "@/src/types/folder";



export function initializeDatabase() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL
    );
  `);
}

export function createFolder(id: string, name: string) {
  db.runSync(
    "INSERT INTO folders (id, name) VALUES (?, ?)",
    [id, name]
  );
}

export function getFolders(): Folder[] {
  return db.getAllSync<Folder>(
    "SELECT * FROM folders ORDER BY rowid DESC"
  );
}

export function folderExists(name: string): boolean {
  const result = db.getFirstSync<{ count: number }>(
    "SELECT COUNT(*) as count FROM folders WHERE LOWER(name) = LOWER(?)",
    [name]
  );

  return (result?.count ?? 0) > 0;
}