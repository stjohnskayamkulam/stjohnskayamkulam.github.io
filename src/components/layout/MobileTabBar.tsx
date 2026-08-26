import { NavLink } from "react-router-dom";
import { mobileNav } from "@/config/navigation";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/utils/cn";

/** Bottom tab bar — the primary way around the app on a phone. */
export function MobileTabBar() {
  const { isAuthenticated } = useAuth();
  const items = mobileNav.filter(
    (item) => !item.requiresAuth || isAuthenticated,
  );

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-black/5 bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
      aria-label="Primary"
    >
      <ul className="flex">
        {items.map((item) => (
          <li key={item.to} className="flex-1">
            <NavLink
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition",
                  isActive ? "text-brand" : "text-ink-soft",
                )
              }
            >
              <item.icon className="size-5" aria-hidden />
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
