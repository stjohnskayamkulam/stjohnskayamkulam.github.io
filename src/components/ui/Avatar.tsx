import { useState } from "react";
import { cn } from "@/utils/cn";

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizes = {
  sm: "size-8 text-xs",
  md: "size-12 text-sm",
  lg: "size-20 text-lg",
  xl: "size-32 text-3xl",
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function Avatar({ name, src, size = "md", className }: AvatarProps) {
  // Profile photos point at third-party hosts, so a URL that worked when the
  // member set it can 404 later. Falling back to initials keeps a directory of
  // 300 people from filling with broken-image icons. Tracking the failed URL
  // rather than a flag keeps a recycled card from hiding a good new photo.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = src != null && failedSrc === src;

  const shared = cn(
    "shrink-0 rounded-full object-cover ring-2 ring-white shadow-sm",
    sizes[size],
    className,
  );

  if (src && !failed) {
    return (
      <img
        src={src}
        alt=""
        aria-hidden
        className={shared}
        loading="lazy"
        onError={() => setFailedSrc(src)}
      />
    );
  }

  return (
    <div
      className={cn(
        shared,
        "flex items-center justify-center bg-brand-soft font-medium text-brand",
      )}
      aria-hidden
    >
      {initials(name)}
    </div>
  );
}
