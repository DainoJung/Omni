"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { projectsApi } from "@/lib/api";
import type { Project } from "@/types";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { ProjectInputForm } from "@/components/forms/ProjectInputForm";

function getNextPath(project: Project): string {
  return `/result/${project.id}`;
}

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [hasProjects, setHasProjects] = useState(false);

  useEffect(() => {
    projectsApi
      .list()
      .then((res) => {
        if (res.items.length > 0) {
          // Sort by created_at DESC and redirect to latest
          const sorted = [...res.items].sort(
            (a, b) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          const latest = sorted[0];
          router.replace(getNextPath(latest));
        } else {
          setHasProjects(false);
          setLoading(false);
        }
      })
      .catch(() => {
        setLoading(false);
      });
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-text-tertiary" />
      </div>
    );
  }

  // Show form only for first-time users (no projects)
  if (!hasProjects) {
    return (
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <header className="h-14 border-b border-border flex items-center px-10">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="SSG" width={28} height={28} />
          </div>
        </header>

        {/* Main */}
        <main className="flex-1 flex flex-col items-center px-6 py-12">
          <div className="w-full max-w-[640px]">
            <ProjectInputForm />
          </div>
        </main>
      </div>
    );
  }

  return null;
}
