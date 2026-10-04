import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Providers from "./Providers";

const uiFont = localFont({
  src: [{ path: "../public/fonts/Nunito.ttf", weight: "200 1000", style: "normal" }],
  variable: "--font-ui",
  display: "swap",
});


export const metadata: Metadata = {
  title: "Mây Trà Sữa — Trà ngon, vui mỗi ngày",
  description: "Chọn vị trà, điều chỉnh đường đá và đặt trà sữa yêu thích.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="vi"
      className={`${uiFont.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
