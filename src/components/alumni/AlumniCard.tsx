import { Link } from "react-router-dom";
import { Briefcase, MapPin } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import type { DirectoryEntry } from "@/types";
import { classOfLabel } from "@/utils/profile";

export function AlumniCard({ person }: { person: DirectoryEntry }) {
  const location = [person.city, person.country].filter(Boolean).join(", ");
  const work = [person.profession, person.company].filter(Boolean).join(" · ");
  const yearLabel = classOfLabel(person.gradYear);

  return (
    <Link
      to={`/alumni/${person.uid}`}
      className="card group flex flex-col gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start gap-4">
        <Avatar name={person.fullName} src={person.photoURL} size="md" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-ink group-hover:text-brand">
            {person.fullName}
          </h3>
          {yearLabel && (
            <p className="text-sm text-ink-soft">{yearLabel}</p>
          )}
        </div>
      </div>

      <dl className="space-y-1.5 text-sm text-ink-soft">
        {location && (
          <div className="flex items-center gap-2">
            <dt className="sr-only">Location</dt>
            <MapPin className="size-3.5 shrink-0" aria-hidden />
            <dd className="truncate">{location}</dd>
          </div>
        )}
        {work && (
          <div className="flex items-center gap-2">
            <dt className="sr-only">Work</dt>
            <Briefcase className="size-3.5 shrink-0" aria-hidden />
            <dd className="truncate">{work}</dd>
          </div>
        )}
      </dl>
    </Link>
  );
}
