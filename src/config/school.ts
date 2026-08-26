/**
 * Single source of truth for school branding.
 *
 * Nothing else in the app should hardcode a school name, colour or year.
 * Every value can be overridden at build time with a `VITE_SCHOOL_*` variable,
 * so the same codebase can be deployed for a different school without a
 * code change.
 */
export interface SchoolTheme {
  schoolName: string;
  shortName: string;
  schoolLogo: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  foundedYear: number;
  location: string;
  tagline: string;
  contactEmail: string;
  contactPhone: string;
  /** Facebook page, linked from the footer. Empty hides the link. */
  facebookUrl: string;
  /** Used as the hero backdrop; a local file under `public/` also works. */
  heroImageUrl: string;
}

const env = import.meta.env;

export const school: SchoolTheme = {
  schoolName: env.VITE_SCHOOL_NAME || "St. John's School",
  shortName: env.VITE_SCHOOL_SHORT_NAME || "St. John's",
  schoolLogo: env.VITE_SCHOOL_LOGO || `${env.BASE_URL}logo.png`,
  primaryColor: env.VITE_SCHOOL_PRIMARY_COLOR || "#0f4c5c",
  secondaryColor: env.VITE_SCHOOL_SECONDARY_COLOR || "#9a3412",
  accentColor: env.VITE_SCHOOL_ACCENT_COLOR || "#f4d58d",
  foundedYear: Number(env.VITE_SCHOOL_FOUNDED_YEAR) || 1977,
  location: env.VITE_SCHOOL_LOCATION || "Kayamkulam, Kerala",
  tagline: env.VITE_SCHOOL_TAGLINE || "We Nurture Dreams!",
  contactEmail: env.VITE_SCHOOL_CONTACT_EMAIL || "alumni@example.org",
  contactPhone: env.VITE_SCHOOL_CONTACT_PHONE || "+91 94957 42287",
  facebookUrl:
    env.VITE_SCHOOL_FACEBOOK_URL ||
    "https://www.facebook.com/p/St-Johns-School-61554640262725/",
  heroImageUrl:
    env.VITE_SCHOOL_HERO_IMAGE || `${env.BASE_URL}school-hero.jpg`,
};

/**
 * Push the configurable colours into CSS custom properties. Tailwind's theme
 * maps `--color-brand-*` onto these, so utilities like `bg-brand` follow the
 * configured school automatically.
 */
export function applySchoolTheme(theme: SchoolTheme = school): void {
  const root = document.documentElement;
  root.style.setProperty("--school-primary", theme.primaryColor);
  root.style.setProperty("--school-secondary", theme.secondaryColor);
  root.style.setProperty("--school-accent", theme.accentColor);
}
