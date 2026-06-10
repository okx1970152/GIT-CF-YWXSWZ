import type { ReactNode } from "react";
import { SIDE_SLOT_CODES_BY_PAGE } from "@/components/ads/adPositions";
import { SideAdSlot } from "@/components/ads/AdSlot";

type SideAdsPage = keyof typeof SIDE_SLOT_CODES_BY_PAGE;

export function SideAdsLayout({
  page,
  children
}: {
  page: SideAdsPage;
  children: ReactNode;
}) {
  const slots = SIDE_SLOT_CODES_BY_PAGE[page];
  return (
    <div className="mx-auto max-w-[1700px] px-2 sm:px-3">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,180px)_minmax(0,1fr)_minmax(0,180px)]">
        <aside className="hidden xl:block">
          <div className="sticky top-24 grid gap-4">
            {slots.left.map((code) => (
              <SideAdSlot key={code} code={code} />
            ))}
          </div>
        </aside>
        <div className="min-w-0">{children}</div>
        <aside className="hidden xl:block">
          <div className="sticky top-24 grid gap-4">
            {slots.right.map((code) => (
              <SideAdSlot key={code} code={code} />
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
