import { useLang, type Lang } from "@/lib/i18n";

interface LanguageToggleProps {
  variant?: "dark" | "light";
  // Runs after the language changes — used by pages whose URL encodes the language.
  onChange?: (lang: Lang) => void;
}

export function LanguageToggle({ variant = "light", onChange }: LanguageToggleProps) {
  const { lang, setLang: setLangState } = useLang();
  const setLang = (next: Lang) => {
    setLangState(next);
    onChange?.(next);
  };
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
