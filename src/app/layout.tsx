import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Acompanha · Pedagogia & Psicopedagogia",
    template: "%s · Acompanha",
  },
  description: "Plataforma para pedagogos e psicopedagogos gerenciarem alunos, agenda, prontuários e cobranças.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-app-gradient">
        {children}
        <Toaster richColors position="top-right" closeButton />
      </body>
    </html>
  );
}