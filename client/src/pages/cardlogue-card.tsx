import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { CardPreview } from "@/components/mycard/CardPreview";
import { Button } from "@/components/ui/button";
import { useLang } from "@/lib/i18n";
import type { MyCard } from "@shared/mycard";

const NAVY = "#03045E";
const GOLD = "#D4AF37";

// Base template size (client/src/components/mycard/CardPreview.tsx) is
// 340x192 landscape / 200x340 portrait — fixed px, so without this a fixed
// `scale` overflows narrow phone viewports (see the cut-off screenshot).
// Recomputes on resize so rotating the phone doesn't leave it oversized.
function useFitScale(baseWidth: number, maxScale = 1.4) {
  const [scale, setScale] = useState(maxScale);
  useEffect(() => {
    function recalc() {
      const available = Math.min(window.innerWidth - 32, 480);
      setScale(Math.min(maxScale, available / baseWidth));
    }
    recalc();
    window.addEventListener("resize", recalc);
    return () => window.removeEventListener("resize", recalc);
  }, [baseWidth, maxScale]);
  return scale;
}

export default function CardloguerCardPage() {
  const params = useParams<{ id: string }>();
  const [side, setSide] = useState<"front" | "back">("front");
  const { lang } = useLang();

  const t = {
    loading: lang === "ko" ? "불러오는 중..." : "Loading...",
    notFound: lang === "ko" ? "명함을 찾을 수 없습니다." : "Card not found.",
    front: lang === "ko" ? "앞면" : "Front",
    back: lang === "ko" ? "뒷면" : "Back",
    saveContact: lang === "ko" ? "연락처 저장" : "Save Contact",
    defaultTitle: lang === "ko" ? "디지털 명함" : "Digital Business Card",
    defaultDescription: lang === "ko" ? "카드로그 디지털 명함" : "A digital business card, made with Cardlogue",
  };

  const { data: card, isLoading, isError } = useQuery<MyCard>({
    queryKey: ["/api/cardlogue/card", params.id],
    queryFn: async () => {
      const res = await fetch(`/api/cardlogue/card/${params.id}`);
      if (!res.ok) throw new Error("Card not found");
      return res.json();
    },
    enabled: !!params.id,
    retry: false,
  });

  const hasBack =
    !!card &&
    [card.back_name, card.back_company, card.back_title, card.back_phone, card.back_company_phone, card.back_fax, card.back_email, card.back_address].some(
      (f) => !!f,
    );

  const pageUrl = card ? `https://www.globalmarketradar.com/cardlogue/card/${card.id}` : "";
  const pageTitle = card ? [card.name, card.company].filter(Boolean).join(" · ") || t.defaultTitle : t.defaultTitle;

  const isPortrait = card ? (side === "front" ? card.orientation === "portrait" : card.back_orientation === "portrait") : false;
  const scale = useFitScale(isPortrait ? 200 : 340);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{ background: "linear-gradient(180deg, #F8FAFC 0%, #E9EDF3 100%)" }}
    >
      {card && (
        <Helmet>
          <title>{pageTitle}</title>
          <meta name="description" content={[card.company, card.title].filter(Boolean).join(" · ") || t.defaultDescription} />
          <meta property="og:title" content={pageTitle} />
          <meta property="og:description" content={[card.company, card.title].filter(Boolean).join(" · ") || t.defaultDescription} />
          <meta property="og:url" content={pageUrl} />
          <meta property="og:type" content="profile" />
          <meta property="og:image" content={card.profile_image_url || "https://www.globalmarketradar.com/cardlogue-icon.png"} />
        </Helmet>
      )}

      <div className="w-full max-w-md flex flex-col items-center gap-6">
        {isLoading && <p className="text-slate-500 text-sm">{t.loading}</p>}

        {isError && <p className="text-slate-500 text-sm">{t.notFound}</p>}

        {card && (
          <>
            <div className="flex justify-center">
              <CardPreview card={card} scale={scale} side={side} />
            </div>

            {hasBack && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={side === "front" ? "default" : "outline"}
                  className="font-brand"
                  style={side === "front" ? { background: GOLD, color: NAVY } : { borderColor: "#CBD5E1", color: "#475569", background: "#fff" }}
                  onClick={() => setSide("front")}
                  data-testid="button-card-front"
                >
                  {t.front}
                </Button>
                <Button
                  size="sm"
                  variant={side === "back" ? "default" : "outline"}
                  className="font-brand"
                  style={side === "back" ? { background: GOLD, color: NAVY } : { borderColor: "#CBD5E1", color: "#475569", background: "#fff" }}
                  onClick={() => setSide("back")}
                  data-testid="button-card-back"
                >
                  {t.back}
                </Button>
              </div>
            )}

            <Button asChild className="font-brand font-semibold" style={{ background: GOLD, color: NAVY }}>
              <a href={`/api/cardlogue/card/${card.id}/vcard`} data-testid="button-download-vcard">
                {t.saveContact}
              </a>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
