import "./globals.css";
import BackBar from "@/components/BackBar";
import Navbar from "@/components/Navbar";
import { Roboto_Slab } from "next/font/google";

const playfair = Roboto_Slab({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-playfair",
});

export const metadata = {
  title: "Voluntess — Volunteer Today. Change Tomorrow."
};

export default function Root({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={playfair.variable}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("voluntess_theme");if(!t){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.setAttribute("data-theme",t)}catch(e){}`,
          }}
        />
      </head>
      <body>
        <Navbar />
        <div><BackBar />
        {children}</div>
      </body>
    </html>
  );
}
