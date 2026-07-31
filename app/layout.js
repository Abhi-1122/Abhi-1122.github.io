import { Rubik, Space_Mono } from "next/font/google";
import "./globals.css";

const rubik = Rubik({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-rubik",
  display: "swap",
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
  display: "swap",
});

export const metadata = {
  title: "G Sai Abhishek's Portfolio",
  description:
    "Garimella Sai Abhishek — Software Engineer & Researcher. Portfolio styled as a Nintendo Switch dashboard.",
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect width='24' height='24' rx='6' fill='%23fef4e6'/%3E%3Cpath d='M2 12a10 6 0 0 1 20 0c0 1-1 2-2 2H4c-1 0-2-1-2-2Z' fill='%23e6231e'/%3E%3Crect x='7' y='13' width='10' height='8' rx='2' fill='%23f2c98a'/%3E%3Ccircle cx='7.5' cy='9' r='1.4' fill='white'/%3E%3Ccircle cx='16.5' cy='8.3' r='1.6' fill='white'/%3E%3Ccircle cx='12' cy='6.3' r='1.3' fill='white'/%3E%3C/svg%3E",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${rubik.variable} ${spaceMono.variable}`}>
      <body className="font-sans text-[#14181c] dark:text-slate-100">{children}</body>
    </html>
  );
}
