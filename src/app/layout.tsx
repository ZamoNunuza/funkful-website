
import type { Metadata } from "next";
import { Montserrat, Poppins } from "next/font/google";
import { CartProvider } from "@/lib/cart-context";
import Header from "@/components/Header/Header";
import Footer from "@/components/Footer/Footer";
import SiteProtection from "@/components/SiteProtection";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  display: "swap",
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "Funkful | Custom Gifts & Scoopful",
  description: "Custom mugs, tumblers, apparel, plus Scoopful mystery scoopd - one cart, every brand.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${montserrat.variable} ${poppins.variable} h-full antialiased`} >
      <body className="min-h-full">
        {/*<SiteProtection />*/}
        <CartProvider>
          <Header />
          {children}
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}