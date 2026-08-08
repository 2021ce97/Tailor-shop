import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { getLocale, localeDirections } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Tailor Shop Management",
  description: "Tailoring orders, customers, measurements, fabrics, and accounts.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = getLocale((await cookies()).get("tailor_locale")?.value);

  return (
    <html lang={locale} dir={localeDirections[locale]} className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
