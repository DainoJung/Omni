"use client";

import Image from "next/image";
import { ProjectInputForm } from "@/components/forms/ProjectInputForm";

export default function NewProjectPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="h-14 border-b border-border flex items-center px-10">
        <a href="/dashboard" className="flex items-center gap-2">
          <Image src="/logo.png" alt="Omni" width={35} height={35} />
          <h1 className="text-2xl font-bold">Omni</h1>
        </a>
      </header>
      <main className="flex-1 flex flex-col items-center px-6 py-12">
        <div className="w-full max-w-[640px]">
          <ProjectInputForm />
        </div>
      </main>
    </div>
  );
}
