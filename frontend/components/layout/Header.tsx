import Link from "next/link";
import Image from "next/image";
import { Download } from "lucide-react";

interface HeaderProps {
  onDownload?: () => void;
  showDownload?: boolean;
}

export function Header({ onDownload, showDownload = false }: HeaderProps) {
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
      </div>
    </header>
  );
}
