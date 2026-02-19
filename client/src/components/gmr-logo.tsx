import { Link } from "wouter";

interface GmrLogoProps {
  linkTo?: string;
  showTagline?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-16 h-16",
};

export function GmrLogo({ linkTo = "/dashboard", showTagline = false, size = "sm" }: GmrLogoProps) {
  const content = (
    <div className="flex items-center gap-2.5">
      <img
        src="/gmr-logo.jpg"
        alt="GMR"
        className={`${sizes[size]} rounded-full object-cover`}
        data-testid="img-gmr-logo"
      />
      <div className="flex flex-col">
        <span className="font-semibold text-lg tracking-tight leading-tight" data-testid="text-brand-name">GMR</span>
        {showTagline && (
          <span className="text-[10px] text-muted-foreground leading-tight tracking-wide" data-testid="text-brand-tagline">Global Market Radar</span>
        )}
      </div>
    </div>
  );

  if (linkTo) {
    return (
      <Link href={linkTo} className="flex items-center" data-testid="link-logo">
        {content}
      </Link>
    );
  }

  return content;
}
