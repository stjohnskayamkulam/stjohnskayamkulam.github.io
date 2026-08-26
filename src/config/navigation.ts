import {
  CalendarDays,
  Globe2,
  Home,
  Info,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  /** Hidden until the visitor has signed in. */
  requiresAuth?: boolean;
}

export const primaryNav: NavItem[] = [
  { label: "Home", to: "/", icon: Home },
  { label: "Alumni", to: "/alumni", icon: Users },
  { label: "Map", to: "/map", icon: Globe2, requiresAuth: true },
  { label: "Events", to: "/events", icon: CalendarDays },
  { label: "About", to: "/about", icon: Info },
];

/** Condensed set for the mobile tab bar — five is the practical maximum. */
export const mobileNav: NavItem[] = [
  { label: "Home", to: "/", icon: Home },
  { label: "Alumni", to: "/alumni", icon: Users },
  { label: "Map", to: "/map", icon: Globe2, requiresAuth: true },
  { label: "Events", to: "/events", icon: CalendarDays },
  { label: "About", to: "/about", icon: Info },
];
