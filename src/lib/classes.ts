// Shared class + parallel helpers.
// Parallel options now include "-" for classes without a parallel letter.

export const CLASSES: string[] = Array.from({ length: 11 }, (_, i) => String(i + 1));

// "-" means the class has no parallel letter (e.g. "2" instead of "2-Б")
export const PARALLELS = ["-", "А", "Б", "В", "Г", "Д"] as const;
export type Parallel = (typeof PARALLELS)[number];

// Build the stored grade value from class number + parallel.
export function makeGrade(cls: string, parallel: string): string {
  if (!parallel || parallel === "-") return cls;
  return `${cls}-${parallel}`;
}

// Parse a stored grade like "2", "2-Б", "10 А" into { cls, letter }.
// letter is "-" when there's no parallel letter.
export function parseGrade(g: string): { cls: string; letter: string } {
  const m = String(g || "").match(/^(\d{1,2})\s*[-\s]?\s*([А-Яа-яA-Za-zӢӯҶҷҲҳҚқҒғӣЁё]?)/);
  const cls = m?.[1] || "";
  const letter = (m?.[2] || "").toUpperCase();
  return { cls, letter: letter || "-" };
}

// Does a student's grade match the selected class + parallel filter?
export function matchesClassParallel(grade: string, cls: string, parallel: string): boolean {
  const p = parseGrade(grade);
  if (p.cls !== cls) return false;
  return p.letter === (parallel || "-");
}
