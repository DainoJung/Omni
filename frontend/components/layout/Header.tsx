"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { LogOut, Download } from "lucide-react";
import { authApi } from "@/lib/api";

interface HeaderProps {
  onDownload?: () => void;
  showDownload?: boolean;
}

export function Header({ onDownload, showDownload = false }: HeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    const token = sessionStorage.getItem("auth_token");
    if (token) {
      await authApi.logout(token);
    }
    sessionStorage.removeItem("auth_token");
    router.push("/login");
  };

  return (
    <header className="h-14 border-b border-border flex items-center justify-between px-10">
      <Link href="/" className="flex items-center gap-2">
        <Image src="/logo.png" alt="SSG" width={28} height={28} />
        <span className="text-lg font-semibold tracking-widest">
          SSG PDP MAKER
        </span>
      </Link>
      <div className="flex items-center gap-4">
        {showDownload && onDownload && (
          <button
            onClick={onDownload}
            className="flex items-center gap-1.5 text-sm bg-black text-white border border-gray-700 px-3 py-1.5 rounded-sm hover:bg-gray-900 transition-colors font-medium"
          >
            <Download size={16} />
            이미지 다운로드
          </button>
        )}
        <Link
          href="/"
          className="text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          프로젝트 목록
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          <LogOut size={14} />
          로그아웃
        </button>
      </div>
    </header>
  );
}
