"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { projectsApi } from "@/lib/api";
import type { Project } from "@/types";
import { Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import { ProjectInputForm } from "@/components/forms/ProjectInputForm";

const STATUS_LABEL: Record<string, { text: string; className: string }> = {
  draft: { text: "초안", className: "bg-gray-100 text-gray-600" },
  generating: { text: "생성 중", className: "bg-blue-100 text-blue-600" },
  editing: { text: "편집 중", className: "bg-yellow-100 text-yellow-700" },
  completed: { text: "완료", className: "bg-green-100 text-green-700" },
  failed: { text: "실패", className: "bg-red-100 text-red-600" },
};

function getNextPath(project: Project): string {
  if (project.rendered_sections?.length) return `/result/${project.id}`;
  return `/generate/${project.id}`;
}

export default function HomePage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProjects, setShowProjects] = useState(false);

  useEffect(() => {
    projectsApi
      .list()
      .then((res) => setProjects(res.items))
      .catch(() => toast.error("프로젝트 목록을 불러올 수 없습니다."))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("이 프로젝트를 삭제하시겠습니까?")) return;
    try {
      await projectsApi.delete(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      toast.success("삭제되었습니다.");
    } catch {
      toast.error("삭제에 실패했습니다.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="h-14 border-b border-border flex items-center px-10">
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="SSG" width={28} height={28} />
          <h1 className="text-lg font-semibold tracking-widest">
            SSG PDP MAKER
          </h1>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center px-6 py-12">
        <div className="w-full max-w-[640px] space-y-10">
          {/* Input Form */}
          <ProjectInputForm />

          {/* Project list toggle */}
          {!loading && projects.length > 0 && (
            <div className="space-y-3">
              <button
                onClick={() => setShowProjects((v) => !v)}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                내 프로젝트 ({projects.length})
                {showProjects ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {showProjects && (
                <div className="grid gap-3">
                  {projects.map((project) => {
                    const status = STATUS_LABEL[project.status] ?? STATUS_LABEL.draft;
                    return (
                      <div
                        key={project.id}
                        onClick={() => router.push(getNextPath(project))}
                        className="flex items-center justify-between border border-border rounded-sm p-4 hover:bg-bg-secondary transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <span
                            className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded ${status.className}`}
                          >
                            {status.text}
                          </span>
                          <div className="min-w-0">
                            <p className="font-medium truncate">
                              {project.products?.[0]?.name || project.brand_name || "프로젝트"}
                            </p>
                            <p className="text-xs text-text-tertiary">
                              {new Date(project.created_at).toLocaleDateString("ko-KR")}
                              {project.theme_id && ` · ${project.theme_id}`}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={(e) => handleDelete(e, project.id)}
                          className="shrink-0 p-2 text-text-tertiary hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
