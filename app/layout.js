import { Press_Start_2P, DotGothic16, VT323 } from "next/font/google";
import "./globals.css";

const display = Press_Start_2P({ subsets: ["latin"], weight: "400", variable: "--font-display", display: "swap" });
// DotGothic16: pixel body font with unambiguous digits (Pixelify Sans drew 5 like S/8)
const body = DotGothic16({ subsets: ["latin"], weight: "400", variable: "--font-body", display: "swap" });
const mono = VT323({ subsets: ["latin"], weight: "400", variable: "--font-mono", display: "swap" });

export const metadata = {
  title: "G Sai Abhishek's Game Deck",
  description: "Garimella Sai Abhishek, software engineer and researcher. Browse my projects on a handheld game console.",
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 12' shape-rendering='crispEdges'%3E%3Crect width='10' height='12' fill='%23c9c7c2'/%3E%3Crect x='1' y='1' width='8' height='6' fill='%230f380f'/%3E%3Crect x='2' y='2' width='6' height='4' fill='%238bac0f'/%3E%3Crect x='2' y='8' width='1' height='3' fill='%232a2a2e'/%3E%3Crect x='1' y='9' width='3' height='1' fill='%232a2a2e'/%3E%3Crect x='6' y='9' width='1' height='1' fill='%23a3195b'/%3E%3Crect x='8' y='8' width='1' height='1' fill='%23a3195b'/%3E%3C/svg%3E",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-palette="gbc" data-shell="classic" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="font-sans text-gb-3">{children}</body>
    </html>
  );
}
