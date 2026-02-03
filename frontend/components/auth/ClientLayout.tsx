"use client";

import { AuthGuard } from "./AuthGuard";

interface ClientLayoutProps {
  children: React.ReactNode;
}

export function ClientLayout({ children }: ClientLayoutProps) {
  return <AuthGuard>{children}</AuthGuard>;
}
