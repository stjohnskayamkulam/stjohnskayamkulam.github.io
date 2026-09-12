import { Link } from "react-router-dom";
import { school } from "@/config/school";

/** Shared wording for Join and the returning-member consent gate. */
export function ConsentCheckbox({
  checked,
  onChange,
  id = "privacy-consent",
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  id?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-ink">
      <input
        id={id}
        type="checkbox"
        className="mt-1 size-4 shrink-0 rounded border-black/20 text-brand focus:ring-brand"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>
        I am 18 or older. I have read the{" "}
        <Link to="/privacy" className="font-medium text-brand hover:underline">
          privacy notice
        </Link>{" "}
        and agree that volunteer alumni of {school.schoolName} may keep my
        profile so classmates can find me.
      </span>
    </label>
  );
}
