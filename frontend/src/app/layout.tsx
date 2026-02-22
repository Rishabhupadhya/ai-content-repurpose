import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { cn } from "@/lib/utils";

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-sans",
    display: 'swap',
});

export const metadata: Metadata = {
    title: "Repurpose — AI Content Adaptation Platform",
    description: "Transform content for every platform. AI handles the adaptation. You stay in control.",
    icons: {
        icon: [
            { url: '/favicon.png', type: 'image/png' },
        ],
        apple: '/favicon.png',
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={cn("min-h-screen bg-background font-sans antialiased", inter.variable)}>
                <Navbar />
                <main className="pt-20">
                    {children}
                </main>
            </body>
        </html>
    );
}
