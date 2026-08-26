import { useMemo, useState } from "react";
import { GraduationCap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/Field";

const EARLIEST_YEAR = 1950;

/**
 * One-tap filter down to the signed-in member's own class. Members who have
 * never recorded a graduating year can set it here rather than detouring
 * through the profile editor.
 */
export function MyClassButton({
  activeYear,
  onSelectYear,
}: {
  activeYear: number | null;
  onSelectYear: (year: number | null) => void;
}) {
  const { session, saveProfile } = useAuth();
  const [picking, setPicking] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectableYears = useMemo(() => {
    const latest = new Date().getFullYear();
    return Array.from(
      { length: latest - EARLIEST_YEAR + 1 },
      (_, i) => latest - i,
    );
  }, []);

  const myYear = session?.profile?.gradYear ?? null;
  if (!session?.profile) return null;

  if (myYear) {
    const active = activeYear === myYear;
    return (
      <Button
        variant={active ? "primary" : "outline"}
        aria-pressed={active}
        onClick={() => onSelectYear(active ? null : myYear)}
      >
        <GraduationCap className="size-4" aria-hidden />
        My class
        <span className={active ? "text-white/70" : "text-ink-soft"}>
          {myYear}
        </span>
      </Button>
    );
  }

  if (!picking) {
    return (
      <Button variant="outline" onClick={() => setPicking(true)}>
        <GraduationCap className="size-4" aria-hidden />
        Set my class year
      </Button>
    );
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const year = Number(draft);
    if (!year) return;
    setSaving(true);
    setError(null);
    try {
      await saveProfile({ gradYear: year });
      setPicking(false);
      onSelectYear(year);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save your class year.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="flex items-center gap-2">
      <SelectField
        aria-label="Your graduating year"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        required
      >
        <option value="">Year…</option>
        {selectableYears.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </SelectField>
      <Button type="submit" size="sm" loading={saving}>
        Save
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setPicking(false)}
      >
        Cancel
      </Button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </form>
  );
}
