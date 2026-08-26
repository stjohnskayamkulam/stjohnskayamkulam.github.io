import { Link } from "react-router-dom";
import { buttonClass } from "@/components/ui/buttonStyles";

export function NotFoundPage() {
  return (
    <div className="section flex flex-col items-center py-28 text-center">
      <p className="font-display text-6xl font-semibold text-brand/30">404</p>
      <h1 className="mt-4 text-3xl font-semibold">
        This page has left the building
      </h1>
      <p className="mt-3 max-w-md text-ink-soft">
        The link may be old, or the page may have been renamed. The directory is
        still where you left it.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/" className={buttonClass("primary")}>
          Back to home
        </Link>
        <Link to="/alumni" className={buttonClass("outline")}>
          Find alumni
        </Link>
      </div>
    </div>
  );
}
