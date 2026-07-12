import { useLang } from "@/lib/i18n";

interface LanguageToggleProps {
  variant?: "dark" | "light";
}

export function LanguageToggle({ variant = "light" }: LanguageToggleProps) {
  const { lang, setLang } = useLang();
  const isLight = variant === "light";

  const baseClass = isLight ? "text-white/50 hover:text-white" : "text-muted-foreground hover:text-foreground";
  const activeClass = isLight ? "text-white" : "text-foreground";

  return (
    <div className="flex items-center gap-1 text-xs font-brand font-semibold" data-testid="toggle-language">
      <button
        type="button"
        onClick={() => setLang("en")}
        className={lang === "en" ? activeClass : baseClass}
        data-testid="button-lang-en"
      >
        EN
      </button>
      <span className={isLight ? "text-white/20" : "text-muted-foreground/40"}>/</span>
      <button
        type="button"
        onClick={() => setLang("ko")}
        className={lang === "ko" ? activeClass : baseClass}
        data-testid="button-lang-ko"
      >
        KO
      </button>
    </div>
  );
}
