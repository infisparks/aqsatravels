// app/layout.tsx
"use client";

import localFont from "next/font/local";
import "./globals.css";
import LayoutWrapper from "@/components/LayoutWrapper";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { auth } from "@/lib/firebase"; // Import your Firebase auth instance

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

function AuthWrapper({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Subscribe to Firebase auth state changes
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        // User is logged in
        if (pathname === "/login") {
          router.replace("/dashboard");
        }
      } else {
        // User is not logged in
        if (pathname !== "/login") {
          router.replace("/login");
        }
      }
    });

    // Clean up the subscription on unmount
    return () => unsubscribe();
  }, [pathname, router]);

  return <>{children}</>;
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthWrapper>
          <LayoutWrapper>{children}</LayoutWrapper>
        </AuthWrapper>
      </body>
    </html>
  );
}
