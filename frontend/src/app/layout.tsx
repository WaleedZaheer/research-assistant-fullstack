import type { Metadata } from "next";
import "./globals.css";
import SplashScreen from "@/components/SplashScreen";
import { ToastProvider } from "@/context/ToastContext";
import { ConfirmProvider } from "@/context/ConfirmContext";

export const metadata: Metadata = {
  title: "Research Assistant",
  description: "AI-powered research report generator",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          <ConfirmProvider>
            <SplashScreen>{children}</SplashScreen>
          </ConfirmProvider>
        </ToastProvider>
      </body>
    </html>
  );
}