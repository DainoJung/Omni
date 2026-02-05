"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { ProjectInputForm } from "@/components/forms/ProjectInputForm";
import { projectsApi } from "@/lib/api";
import type { Project } from "@/types";
import { Trash2, ChevronDown, ChevronUp, FolderOpen } from "lucide-react";
import { toast } from "sonner";

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
    <div className="h-screen flex flex-col overflow-hidden">
      <Header />

      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Center: Input Form */}
        <main className="flex-1 bg-bg-secondary overflow-auto flex justify-center">
          <div className="w-full max-w-[640px] px-6 py-10">
            <ProjectInputForm />
          </div>
        </main>

        {/* Right Panel: Project History */}
        <aside className="w-[320px] shrink-0 border-l border-border overflow-y-auto bg-bg-primary">
          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-lg font-bold mb-1">PDP 자동 생성</h3>
              <p className="text-xs text-text-secondary">
                상품 정보를 입력하면 AI가 상세페이지를 만들어 드립니다.
              </p>
            </div>

            <hr className="border-border" />

            {/* Project History Toggle */}
            <div>
              <button
                onClick={() => setShowProjects((v) => !v)}
                className="w-full flex items-center justify-between text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
              >
                <div className="flex items-center gap-2">
                  <FolderOpen size={14} />
                  <span>내 프로젝트</span>
                  {!loading && projects.length > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                      {projects.length}
                    </span>
                  )}
                </div>
                {showProjects ? (
                  <ChevronUp size={14} />
                ) : (
                  <ChevronDown size={14} />
                )}
              </button>

              {showProjects && (
                <div className="mt-3 space-y-0">
                  {loading ? (
                    <p className="text-xs text-text-tertiary py-2">
                      불러오는 중...
                    </p>
                  ) : projects.length === 0 ? (
                    <p className="text-xs text-text-tertiary py-2">
                      아직 프로젝트가 없습니다.
                    </p>
                  ) : (
                    projects.map((project, i) => {
                      const status =
                        STATUS_LABEL[project.status] ?? STATUS_LABEL.draft;
                      return (
                        <div key={project.id}>
                          {/* Connector */}
                          {i > 0 && (
                            <div className="flex justify-start ml-[8px]">
                              <div className="w-0.5 h-2 bg-border" />
                            </div>
                          )}
                          {/* Card */}
                          <div
                            onClick={() =>
                              router.push(getNextPath(project))
                            }
                            className="bg-white rounded-lg border border-border hover:border-accent/30 hover:shadow-sm transition-all duration-200 cursor-pointer"
                          >
                            <div className="p-3 flex items-start gap-3">
                              <span
                                className={`mt-0.5 shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${status.className}`}
                              >
                                {status.text}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate text-text-primary">
                                  {project.products?.[0]?.name ||
                                    project.brand_name ||
                                    "프로젝트"}
                                </p>
                                <p className="text-[11px] text-text-tertiary mt-0.5">
                                  {new Date(
                                    project.created_at
                                  ).toLocaleDateString("ko-KR")}
                                  {project.theme_id &&
                                    ` · ${project.theme_id}`}
                                </p>
                              </div>
                              <button
                                onClick={(e) =>
                                  handleDelete(e, project.id)
                                }
                                className="shrink-0 p-1 text-text-tertiary hover:text-red-500 transition-colors"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
