import type { Metadata } from "next";
import "./globals.css";
import { Raleway, Instrument_Sans } from "next/font/google";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";

const instrumentSansHeading = Instrument_Sans({ subsets: ['latin'], variable: '--font-heading' });

const raleway = Raleway({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: {
    default: "Internal CRM",
    template: "%s | Internal CRM"
  },
  description: "Internal CRM Application",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", raleway.variable, instrumentSansHeading.variable)}>
      <body>{children}<Toaster richColors position="top-right" expand closeButton /></body>
    </html>
  );
}
