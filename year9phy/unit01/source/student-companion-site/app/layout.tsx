import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const incoming = await headers();
  const host = incoming.get("host") ?? "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const ogImage = `${protocol}://${host}/og.png`;

  return {
    title: "Work Like a Physicist | Year 9 Skills Lab",
    description: "Interactive practice, hints and AQA GCSE–styled questions for the Work Like a Physicist unit.",
    openGraph: {
      title: "Work Like a Physicist",
      description: "Evidence. Not guesses. A Year 9 physics skills lab.",
      images: [{ url: ogImage, width: 1200, height: 630, alt: "Work Like a Physicist — Evidence. Not guesses." }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Work Like a Physicist",
      description: "Evidence. Not guesses. A Year 9 physics skills lab.",
      images: [ogImage],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
