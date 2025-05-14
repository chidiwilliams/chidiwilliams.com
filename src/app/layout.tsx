import cn from "classnames";
import type { Metadata } from "next";
import { Source_Serif_4 } from "next/font/google";

import "./globals.css";

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
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.0/styles/github.min.css"
        />
      </head>
      <body
        className={cn(sourceSerif4.className, "text-foreground bg-background")}
      >
        <div className="min-h-screen">{children}</div>
      </body>
    </html>
  );
}
