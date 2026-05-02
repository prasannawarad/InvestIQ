import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ symbol: string }>;
};

/** Legacy route from PROJECT_SPEC — canonical detail lives under `/Kuber/preview/[symbol]`. */
export default async function LegacyPreviewRedirect({ params }: PageProps) {
  const { symbol } = await params;
  redirect(`/Kuber/preview/${encodeURIComponent(symbol)}`);
}
