import { Link } from "wouter";
import { useLang } from "@/lib/i18n";
import { translations } from "@/lib/translations";

interface NavyLogoProps {
  linkTo?: string | null;
  showTagline?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "dark" | "light";
}

const marks = {
  sm: "w-9 h-9",
  md: "w-11 h-11",
  lg: "w-16 h-16",
};

const names = {
  sm: "text-lg",
  md: "text-xl",
  lg: "text-3xl",
};

export function NavyLogo({ linkTo = "/", showTagline = false, size = "sm", variant = "dark" }: NavyLogoProps) {
  const isLight = variant === "light";
  const { lang } = useLang();
  const t = translations[lang];
  const content = (
    <div className="flex items-center gap-3">
      <img
        src={isLight ? "/navy-icon-white.png" : "/navy-icon.png"}
        alt="The Navy"
        className={`${marks[size]} object-contain shrink-0`}
        data-testid="img-navy-logo"
      />
      <div className="flex flex-col">
        <span
          className={`font-brand font-extrabold tracking-tight leading-tight ${names[size]} ${isLight ? "text-white" : ""}`}
          data-testid="text-brand-name"
        >
          The Navy
        </span>
        {showTagline && (
          <span
            className={`hidden sm:inline text-[10px] leading-tight tracking-widest uppercase whitespace-nowrap ${isLight ? "text-white/50" : "text-muted-foreground"}`}
            data-testid="text-brand-tagline"
          >
            {t.tagline}
          </span>
        )}
      </div>
    </div>
  );

  if (linkTo) {
    return (
      <Link
        href={linkTo}
        className="flex items-center"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        data-testid="link-logo"
      >
        {content}
      </Link>
    );
  }

  return content;
}
