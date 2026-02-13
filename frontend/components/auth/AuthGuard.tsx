"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { authApi } from "@/lib/api";

interface AuthGuardProps {
  children: React.ReactNode;
}

function isLocalhost(): boolean {
  if (typeof window === "undefined") return false;
  const hostname = window.location.hostname;
  return hostname === "localhost" || hostname === "127.0.0.1";
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // localhost에서는 인증 건너뛰기
    if (isLocalhost()) {
      setIsAuthenticated(true);
      return;
    }

    // 로그인 페이지는 체크하지 않음
    if (pathname === "/login") {
      setIsAuthenticated(true);
      return;
    }

    const verifyAuth = async () => {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        const result = await authApi.verify();
        if (result.valid) {
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem("auth_token");
          localStorage.removeItem("auth_user");
          router.replace("/login");
        }
      } catch {
        // 서버 연결 실패 시에도 토큰이 있으면 허용 (오프라인 모드)
        setIsAuthenticated(true);
      }
    };

    verifyAuth();
  }, [pathname, router]);

  // 인증 상태 확인 중
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-secondary">
        <div className="text-text-secondary">로딩 중...</div>
      </div>
    );
  }

  return <>{children}</>;
}
