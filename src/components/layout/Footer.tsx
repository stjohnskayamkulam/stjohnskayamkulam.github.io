import { Link } from "react-router-dom";
import { school } from "@/config/school";
import { primaryNav } from "@/config/navigation";

/** Lucide dropped brand marks, so the one glyph we need lives here. */
function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M14.5 8.5h2.2V5.6c-.4-.05-1.6-.16-3-.16-2.97 0-4.9 1.8-4.9 5.1V13H6.1v3.3h2.7V24h3.3v-7.7h2.7l.4-3.3h-3.1v-2.1c0-.95.26-1.6 1.9-1.6Z" />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="mt-20 border-t border-black/5 bg-paper-deep">
      <div className="section grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2.5">
            <img src={school.schoolLogo} alt="" className="size-9 rounded-lg" />
            <span className="font-display text-lg font-semibold">
              {school.schoolName}
            </span>
          </div>
          <p className="mt-4 max-w-md text-sm text-ink-soft">
            The alumni network of {school.schoolName}, Peringala P.O.,{" "}
            {school.location}. Established {school.foundedYear}.{" "}
            {school.tagline}
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-ink">Explore</h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            {primaryNav.slice(0, 5).map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="text-ink-soft hover:text-brand">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-ink">Get in touch</h3>
          <ul className="mt-4 space-y-2.5 text-sm text-ink-soft">
            {school.contactPhone && (
              <li>
                <a
                  href={`tel:${school.contactPhone.replace(/\s+/g, "")}`}
                  className="hover:text-brand"
                >
                  {school.contactPhone}
                </a>
              </li>
            )}
            <li>
              <a
                href={`mailto:${school.contactEmail}`}
                className="hover:text-brand"
              >
                {school.contactEmail}
              </a>
            </li>
            <li>
              <Link to="/about" className="hover:text-brand">
                About the network
              </Link>
            </li>
            <li>
              <Link to="/settings" className="hover:text-brand">
                Privacy controls
              </Link>
            </li>
            {school.facebookUrl && (
              <li>
                <a
                  href={school.facebookUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-2 hover:text-brand"
                >
                  <FacebookIcon className="size-4" />
                  Facebook page
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="border-t border-black/5">
        <div className="section flex flex-col gap-2 py-6 text-xs text-ink-soft sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {school.schoolName} Alumni Association
          </p>
          <p>Run by volunteers, for alumni.</p>
        </div>
      </div>
    </footer>
  );
}
