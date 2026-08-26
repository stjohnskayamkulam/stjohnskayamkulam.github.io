import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  ChevronDown,
  LogOut,
  Menu,
  Settings,
  Shield,
  User,
  UserCheck,
  X,
} from "lucide-react";
import { primaryNav } from "@/config/navigation";
import { school } from "@/config/school";
import { useAuth } from "@/hooks/useAuth";
import { Avatar } from "@/components/ui/Avatar";
import { buttonClass } from "@/components/ui/buttonStyles";
import { cn } from "@/utils/cn";

export function Navbar() {
  const { isAuthenticated, isAdmin, isVerified, session, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const navigate = useNavigate();

  const items = primaryNav.filter(
    (item) => !item.requiresAuth || isAuthenticated,
  );

  async function handleSignOut() {
    setAccountOpen(false);
    setMenuOpen(false);
    await signOut();
    navigate("/");
  }

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "rounded-full px-3.5 py-2 text-sm font-medium transition",
      isActive
        ? "bg-brand-soft text-brand"
        : "text-ink-soft hover:bg-black/5 hover:text-ink",
    );

  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-paper/85 backdrop-blur-md">
      <div className="section flex h-16 items-center gap-3">
        <Link
          to="/"
          className="flex items-center gap-2.5"
          onClick={() => setMenuOpen(false)}
        >
          <img src={school.schoolLogo} alt="" className="size-9 rounded-lg" />
          <span className="flex flex-col leading-tight">
            <span className="font-display text-base font-semibold text-ink">
              {school.shortName}
            </span>
            <span className="text-[11px] tracking-[0.14em] text-ink-soft uppercase">
              Alumni
            </span>
          </span>
        </Link>

        <nav
          className="mx-auto hidden items-center gap-1 lg:flex"
          aria-label="Main"
        >
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={linkClass}
              end={item.to === "/"}
            >
              {item.label}
            </NavLink>
          ))}
          {isAdmin && (
            <NavLink to="/admin" className={linkClass}>
              Admin
            </NavLink>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          {isAuthenticated && session ? (
            <div className="relative hidden lg:block">
              <button
                onClick={() => setAccountOpen((open) => !open)}
                className="flex items-center gap-2 rounded-full py-1 pr-2 pl-1 hover:bg-black/5"
                aria-expanded={accountOpen}
                aria-haspopup="menu"
              >
                <Avatar
                  name={session.account.displayName}
                  src={session.profile?.photoURL ?? session.account.photoURL}
                  size="sm"
                />
                <ChevronDown className="size-4 text-ink-soft" aria-hidden />
              </button>

              {accountOpen && (
                <>
                  {/* Click-away layer; keeps the menu logic free of document listeners. */}
                  <div
                    className="fixed inset-0 z-10"
                    aria-hidden
                    onClick={() => setAccountOpen(false)}
                  />
                  <div
                    role="menu"
                    className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-2xl border border-black/5 bg-white py-1.5 shadow-lg"
                  >
                    <div className="border-b border-black/5 px-4 pt-2 pb-3">
                      <p className="truncate text-sm font-medium text-ink">
                        {session.account.displayName}
                      </p>
                      {session.profile && (
                        <p className="text-xs text-ink-soft">
                          Class of {session.profile.gradYear}
                        </p>
                      )}
                    </div>
                    <MenuLink
                      to="/profile"
                      icon={User}
                      onClick={() => setAccountOpen(false)}
                    >
                      My profile
                    </MenuLink>
                    <MenuLink
                      to="/settings"
                      icon={Settings}
                      onClick={() => setAccountOpen(false)}
                    >
                      Settings
                    </MenuLink>
                    {isVerified && (
                      <MenuLink
                        to="/approvals"
                        icon={UserCheck}
                        onClick={() => setAccountOpen(false)}
                      >
                        Approve members
                      </MenuLink>
                    )}
                    {isAdmin && (
                      <MenuLink
                        to="/admin"
                        icon={Shield}
                        onClick={() => setAccountOpen(false)}
                      >
                        Admin
                      </MenuLink>
                    )}
                    <button
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-ink-soft hover:bg-black/5"
                      role="menuitem"
                    >
                      <LogOut className="size-4" aria-hidden />
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="hidden items-center gap-2 lg:flex">
              <Link to="/login" className={buttonClass("ghost", "sm")}>
                Sign in
              </Link>
              <Link to="/register" className={buttonClass("primary", "sm")}>
                Join the network
              </Link>
            </div>
          )}

          <button
            className="rounded-full p-2 text-ink-soft hover:bg-black/5 lg:hidden"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-black/5 bg-paper lg:hidden">
          <nav className="section flex flex-col gap-1 py-4" aria-label="Mobile">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium",
                    isActive
                      ? "bg-brand-soft text-brand"
                      : "text-ink-soft hover:bg-black/5",
                  )
                }
              >
                <item.icon className="size-4" aria-hidden />
                {item.label}
              </NavLink>
            ))}

            <div className="mt-3 border-t border-black/5 pt-3">
              {isAuthenticated ? (
                <>
                  <MobileLink to="/profile" onClick={() => setMenuOpen(false)}>
                    My profile
                  </MobileLink>
                  <MobileLink to="/settings" onClick={() => setMenuOpen(false)}>
                    Settings
                  </MobileLink>
                  {isVerified && (
                    <MobileLink
                      to="/approvals"
                      onClick={() => setMenuOpen(false)}
                    >
                      Approve members
                    </MobileLink>
                  )}
                  {isAdmin && (
                    <MobileLink to="/admin" onClick={() => setMenuOpen(false)}>
                      Admin
                    </MobileLink>
                  )}
                  <button
                    onClick={handleSignOut}
                    className="w-full rounded-xl px-3 py-3 text-left text-sm font-medium text-ink-soft hover:bg-black/5"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <div className="flex flex-col gap-2 px-1">
                  <Link
                    to="/login"
                    className={buttonClass("outline")}
                    onClick={() => setMenuOpen(false)}
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/register"
                    className={buttonClass("primary")}
                    onClick={() => setMenuOpen(false)}
                  >
                    Join the network
                  </Link>
                </div>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

function MenuLink({
  to,
  icon: Icon,
  onClick,
  children,
}: {
  to: string;
  icon: typeof User;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      role="menuitem"
      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink-soft hover:bg-black/5"
    >
      <Icon className="size-4" aria-hidden />
      {children}
    </Link>
  );
}

function MobileLink({
  to,
  onClick,
  children,
}: {
  to: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="block rounded-xl px-3 py-3 text-sm font-medium text-ink-soft hover:bg-black/5"
    >
      {children}
    </Link>
  );
}
