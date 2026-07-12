import type { ReactNode } from "react";
import type { LegalBlock } from "@/lib/translations";

const CYAN = "#00D4FF";
const EMAIL = "globalmarketradar@gmail.com";

export function linkifyEmail(text: string): ReactNode {
  const parts = text.split(EMAIL);
  if (parts.length === 1) return text;
  return parts.flatMap((part, i) =>
    i === 0
      ? [part]
      : [
          <a key={i} href={`mailto:${EMAIL}`} style={{ color: CYAN }} className="hover:underline">
            {EMAIL}
          </a>,
          part,
        ]
  );
}

export function LegalBlockView({ block }: { block: LegalBlock }) {
  switch (block.type) {
    case "heading":
      return (
        <h2 className="font-brand text-lg font-bold mt-2" style={{ color: CYAN }}>
          {block.text}
        </h2>
      );
    case "subheading":
      return <h3 className="font-brand text-base font-semibold text-white/90">{block.text}</h3>;
    case "paragraph":
      return <p className="text-white/70 leading-relaxed">{linkifyEmail(block.text)}</p>;
    case "list":
      return (
        <ul className="space-y-2">
          {block.items.map((item) => (
            <li key={item} className="text-white/70 leading-relaxed pl-4 relative before:absolute before:left-0 before:content-['—']">
              {linkifyEmail(item)}
            </li>
          ))}
        </ul>
      );
    case "table":
      return (
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-white/[0.04]">
                {block.headers.map((header) => (
                  <th key={header} className="text-left font-semibold text-white/90 px-3 py-2 border-b border-white/10">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, i) => (
                <tr key={i} className="border-b border-white/10 last:border-0">
                  {row.map((cell, j) => (
                    <td key={j} className="text-white/70 px-3 py-2 align-top">
                      {linkifyEmail(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "callout":
      return (
        <div className="rounded-lg border px-4 py-3 text-sm text-white/70" style={{ borderColor: `${CYAN}40`, background: `${CYAN}0d` }}>
          {block.text}
        </div>
      );
  }
}
