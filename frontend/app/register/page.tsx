"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { authApi } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    if (password.length < 6) {
      setError("비밀번호는 6자 이상이어야 합니다.");
      return;
    }

    setLoading(true);

    try {
      const result = await authApi.register(
        email,
        username,
        password,
        displayName || undefined
      );

      if (result.success && result.token) {
        localStorage.setItem("auth_token", result.token);
        if (result.user) {
          localStorage.setItem("auth_user", JSON.stringify(result.user));
        }
        router.push("/");
      } else {
        setError(result.message || "회원가입에 실패했습니다.");
      }
    } catch (err: unknown) {
      if (err && typeof err === "object" && "message" in err) {
        setError((err as { message: string }).message);
      } else {
        setError("서버에 연결할 수 없습니다.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-secondary">
      <div className="w-full max-w-sm p-8 bg-bg-primary rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-center mb-6">Omni</h1>
        <p className="text-center text-text-secondary text-sm mb-6">
          회원가입
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-bg-primary focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="email@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">아이디</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-bg-primary focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="Username"
              required
              minLength={2}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              표시 이름 (선택)
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-bg-primary focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="Display Name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-bg-primary focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="6자 이상"
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              비밀번호 확인
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-bg-primary focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="비밀번호 확인"
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "가입 중..." : "회원가입"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-text-secondary">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="text-accent hover:underline">
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
