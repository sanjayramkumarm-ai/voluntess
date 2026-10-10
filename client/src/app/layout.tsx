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
        <div>{children}</div>
      </body>
    </html>
  );
}
