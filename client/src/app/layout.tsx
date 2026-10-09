import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata = {
  title: "Voluntess — Volunteer Today. Change Tomorrow."
};

export default function Root({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main className="mx-auto max-w-6xl px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
