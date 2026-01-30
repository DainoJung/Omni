"use client";

import Link from "next/link";
import Image from "next/image";

export function Header() {
  return (
    <header className="h-14 border-b border-border flex items-center justify-between px-10">
      <Link href="/" className="flex items-center gap-2">
        <Image src="/logo.png" alt="SHINSEGAE" width={28} height={28} />
        <span className="text-lg font-semibold tracking-widest">
          SHINSEGAE PDP MAKER
        </span>
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
