import cn from "classnames";
import type { Metadata } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";

import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

const sourceSerif4 = Source_Serif_4({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: `Chidi Williams`,
  description: `Personal website of Chidi Williams, co-founder and CTO of Rulebase.`,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="shortcut icon" href="/favicon/favicon.ico" />
        <link rel="alternate" type="application/rss+xml" href="/feed.xml" />
      </head>
      <body className={cn(sourceSerif4.className, "")}>
        <div className="min-h-screen">{children}</div>
      </body>
    </html>
  );
}
