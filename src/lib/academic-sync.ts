import { supabase } from "@/integrations/supabase/client";
import { getActiveSchoolId, getSelectedSchoolId } from "./schools";
import { getStudents } from "./store";
import { buildAcademicScores } from "./journal";

function schoolId(): string {
  return getActiveSchoolId() || getSelectedSchoolId() || "gdbh";
}

/**
 * Pushes the locally computed journal-based academic scores to the database so
 * the Telegram bot (/reyting) can render the same academic ranking.
 */
export async function syncAcademicScores(): Promise<boolean> {
  try {
    const scores = buildAcademicScores();
    if (scores.size === 0) return true;
    const students = getStudents();
    const rows = students
      .map((s) => {
        const sc = scores.get(s.id);
        if (!sc || sc.total === 0) return null;
        return {
          school_id: schoolId(),
          student_id: s.id,
          student_name: s.name,
          avg_grade: sc.avg,
          total_grades: sc.total,
          points: sc.points,
        };
      })
      .filter(Boolean) as Record<string, unknown>[];
    if (rows.length === 0) return true;

    for (let i = 0; i < rows.length; i += 100) {
      const batch = rows.slice(i, i + 100);
      const { error } = await supabase
        .from("academic_scores")
        .upsert(batch as never, { onConflict: "school_id,student_id" });
      if (error) return false;
    }
    return true;
  } catch {
    return false;
  }
}
