import { AdSlot } from "@/components/ads/AdSlot";
import { AnnotationAside } from "@/components/novel/AnnotationAside";
import { RelatedTopics } from "@/components/novel/RelatedTopics";
import type { CulturalNotesFaqItem } from "@/lib/content/meta";

type AnnotationTrackProps = {
  title: string;
  guideHtml: string;
  topics: string[];
  culturalNotesFaq?: CulturalNotesFaqItem[];
  shareUrl?: string;
  shareTitle?: string;
};

export function AnnotationTrack({
  title,
  guideHtml,
  topics,
  culturalNotesFaq,
  shareUrl,
  shareTitle
}: AnnotationTrackProps) {
  return (
    <AnnotationAside
      title={title}
      guideHtml={guideHtml}
      culturalNotesFaq={culturalNotesFaq}
      relatedTopicsSlot={<RelatedTopics topics={topics} />}
      slotTop={<AdSlot page="guide" position="top" />}
      slotMid={<AdSlot page="guide" position="mid" />}
      slotBottom={<AdSlot page="guide" position="bottom" />}
      shareUrl={shareUrl}
      shareTitle={shareTitle}
    />
  );
}
