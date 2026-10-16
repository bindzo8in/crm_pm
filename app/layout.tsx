import type { Metadata } from "next";
import "./globals.css";
import { Instrument_Sans, Inter, Plus_Jakarta_Sans } from "next/font/google";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";

const instrumentSansHeading = Instrument_Sans({ subsets: ['latin'], variable: '--font-heading' });
const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const plusJakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-invoice' });

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
    <html
      lang="en"
      className={cn(
        "font-sans",
        inter.variable,
        instrumentSansHeading.variable,
        plusJakarta.variable
      )}
    >
      <body>{children}<Toaster richColors position="top-right" expand closeButton /></body>
    </html>
  );
}
