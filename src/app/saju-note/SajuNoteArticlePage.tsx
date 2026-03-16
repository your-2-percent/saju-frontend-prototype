import SajuNoteReaderPage from "@/app/saju-note/SajuNoteReaderPage";

type SajuNoteArticlePageProps = {
  slug: string;
};

export default function SajuNoteArticlePage({ slug }: SajuNoteArticlePageProps) {
  return <SajuNoteReaderPage forcedSlug={slug} />;
}
