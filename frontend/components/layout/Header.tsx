"use client";

import Link from "next/link";

export function Header() {
  return (
    <header className="h-14 border-b border-border flex items-center justify-between px-10">
      <Link href="/" className="text-lg font-semibold tracking-widest">
        SHINSEGAE POP MAKER
      </Link>
      <Link
        href="/"
        className="text-sm text-text-secondary hover:text-text-primary transition-colors"
      >
        프로젝트 목록
      </Link>
    </header>
  );
}
