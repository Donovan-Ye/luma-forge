import { ImageEditor } from "@/components/editor/ImageEditor";
import { siteUrl } from "@/lib/config/site";

const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Luma Forge",
  alternateName: "Luma Forge 在线图片编辑器",
  inLanguage: ["en", "zh"],
  url: siteUrl,
  applicationCategory: "MultimediaApplication",
  operatingSystem: "Web",
  description:
    "Luma Forge is a premium, browser-native image editor with pro-level adjustments, precise cropping, and export-ready workflows. Luma Forge 是一款运行在浏览器中的专业级在线图片编辑器，提供曝光、曲线、色温、裁剪等完整调色工具。",
  image: `${siteUrl}/logo.png`,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    availability: "https://schema.org/InStock",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: 4.9,
    ratingCount: 128,
  },
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <main className="min-h-screen bg-background">
        <ImageEditor />
      </main>
    </>
  );
}
