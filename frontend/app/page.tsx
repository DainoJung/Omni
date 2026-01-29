import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="h-14 border-b border-border flex items-center px-10">
        <h1 className="text-lg font-semibold tracking-widest">
          SHINSEGAE POP MAKER
        </h1>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-6">
          <h2 className="text-3xl font-bold">POP 상세페이지 자동 생성</h2>
          <p className="text-text-secondary text-lg">
            브랜드 정보를 입력하면 AI가 상세페이지를 만들어 드립니다.
          </p>
          <Link
            href="/create"
            className="inline-flex items-center justify-center h-12 px-8 bg-accent text-white rounded-sm font-medium hover:bg-accent-hover transition-colors"
          >
            새 프로젝트 만들기
          </Link>
        </div>
      </main>
    </div>
  );
}
