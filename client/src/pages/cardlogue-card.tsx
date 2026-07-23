import { useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { CardPreview } from "@/components/mycard/CardPreview";
import { PageGlow } from "@/components/page-glow";
import { Button } from "@/components/ui/button";
import type { MyCard } from "@shared/mycard";

const NAVY = "#03045E";
const GOLD = "#D4AF37";

function buildVCard(card: MyCard): string {
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${card.name}`,
    card.company ? `ORG:${card.company}` : "",
    card.title ? `TITLE:${card.title}` : "",
    card.phone ? `TEL;TYPE=CELL:${card.phone}` : "",
    card.company_phone ? `TEL;TYPE=WORK:${card.company_phone}` : "",
    card.fax ? `TEL;TYPE=FAX:${card.fax}` : "",
    card.email ? `EMAIL:${card.email}` : "",
    card.address ? `ADR;TYPE=WORK:;;${card.address};;;;` : "",
    "END:VCARD",
  ].filter(Boolean);
  return lines.join("\n");
}

function downloadVCard(card: MyCard) {
  const blob = new Blob([buildVCard(card)], { type: "text/vcard;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${card.name || "card"}.vcf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function CardloguerCardPage() {
  const params = useParams<{ id: string }>();
  const [side, setSide] = useState<"front" | "back">("front");

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
  const pageTitle = card ? [card.name, card.company].filter(Boolean).join(" · ") || "디지털 명함" : "디지털 명함";

  return (
    <div
      className="min-h-screen text-white flex items-center justify-center px-4 py-10"
      style={{ background: `linear-gradient(180deg, #0077B6 0%, ${NAVY} 100%)` }}
    >
      <PageGlow />

      {card && (
        <Helmet>
          <title>{pageTitle}</title>
          <meta name="description" content={[card.company, card.title].filter(Boolean).join(" · ") || "카드로그 디지털 명함"} />
          <meta property="og:title" content={pageTitle} />
          <meta property="og:description" content={[card.company, card.title].filter(Boolean).join(" · ") || "카드로그 디지털 명함"} />
          <meta property="og:url" content={pageUrl} />
          <meta property="og:type" content="profile" />
          {card.profile_image_url && <meta property="og:image" content={card.profile_image_url} />}
        </Helmet>
      )}

      <div className="w-full max-w-md flex flex-col items-center gap-6">
        {isLoading && <p className="text-white/60 text-sm">불러오는 중...</p>}

        {isError && <p className="text-white/60 text-sm">명함을 찾을 수 없습니다.</p>}

        {card && (
          <>
            <div className="flex justify-center">
              <CardPreview card={card} scale={1.4} side={side} />
            </div>

            {hasBack && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={side === "front" ? "default" : "outline"}
                  className="font-brand"
                  style={side === "front" ? { background: GOLD, color: NAVY } : { borderColor: "rgba(255,255,255,0.3)", color: "#fff" }}
                  onClick={() => setSide("front")}
                  data-testid="button-card-front"
                >
                  앞면
                </Button>
                <Button
                  size="sm"
                  variant={side === "back" ? "default" : "outline"}
                  className="font-brand"
                  style={side === "back" ? { background: GOLD, color: NAVY } : { borderColor: "rgba(255,255,255,0.3)", color: "#fff" }}
                  onClick={() => setSide("back")}
                  data-testid="button-card-back"
                >
                  뒷면
                </Button>
              </div>
            )}

            <Button
              className="font-brand font-semibold"
              style={{ background: GOLD, color: NAVY }}
              onClick={() => downloadVCard(card)}
              data-testid="button-download-vcard"
            >
              연락처 저장
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
