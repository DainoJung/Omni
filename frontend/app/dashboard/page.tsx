"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { projectsApi, usersApi } from "@/lib/api";
import type { Project } from "@/types";
import Image from "next/image";
import { Plus, FileText, Clock, CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface UserUsage {
  plan: string;
  credits_remaining: number;
  credits_used: number;
  total_projects: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [usage, setUsage] = useState<UserUsage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      projectsApi.list().then((res) => {
        const sorted = [...res.items].sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setProjects(sorted);
      }),
      usersApi.getUsage().then(setUsage).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const handleNewProject = () => {
    router.push("/new");
  };

  const handleOpenProject = (id: string) => {
    router.push(`/result/${id}`);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getTemplateLabel = (project: Project): string => {
    if (project.template_style) {
      return project.template_style.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    }
    if (project.theme_id) return project.theme_id;
    return "기본";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-text-tertiary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="h-14 border-b border-border flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="Omni" width={28} height={28} />
          <span className="text-lg font-bold">Omni</span>
        </div>
        <Button size="sm" onClick={handleNewProject} className="flex items-center gap-1.5">
          <Plus size={16} />
          새 프로젝트
        </Button>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-8">
        {/* Usage Stats */}
        {usage && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="border border-border rounded-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard size={16} className="text-accent" />
                <span className="text-xs text-text-tertiary">크레딧</span>
              </div>
              <p className="text-2xl font-bold text-text-primary">
                {usage.credits_remaining}
              </p>
              <p className="text-xs text-text-tertiary mt-1">
                {usage.credits_used}개 사용 / {usage.plan} 플랜
              </p>
            </div>
            <div className="border border-border rounded-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText size={16} className="text-accent" />
                <span className="text-xs text-text-tertiary">총 프로젝트</span>
              </div>
              <p className="text-2xl font-bold text-text-primary">
                {usage.total_projects}
              </p>
            </div>
            <div className="border border-border rounded-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={16} className="text-accent" />
                <span className="text-xs text-text-tertiary">최근 활동</span>
              </div>
              <p className="text-sm font-medium text-text-primary">
                {projects.length > 0
                  ? formatDate(projects[0].created_at)
                  : "아직 프로젝트가 없습니다"}
              </p>
            </div>
          </div>
        )}

        {/* Projects List */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-text-primary">내 프로젝트</h2>

          {projects.length === 0 ? (
            <div className="border border-dashed border-border rounded-sm p-12 text-center">
              <FileText
                size={48}
                className="mx-auto text-text-tertiary mb-4"
              />
              <p className="text-text-secondary mb-4">
                아직 생성된 프로젝트가 없습니다.
              </p>
              <Button onClick={handleNewProject}>
                <Plus size={16} className="mr-1.5" />
                첫 번째 프로젝트 만들기
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => handleOpenProject(project.id)}
                  className="border border-border rounded-sm p-4 text-left hover:border-accent transition-colors group"
                >
                  {/* Thumbnail placeholder */}
                  <div className="w-full h-32 bg-bg-secondary rounded-sm mb-3 flex items-center justify-center overflow-hidden">
                    {project.rendered_sections &&
                    project.rendered_sections.length > 0 ? (
                      <div className="w-full h-full bg-gradient-to-br from-bg-secondary to-bg-tertiary flex items-center justify-center">
                        <FileText
                          size={24}
                          className="text-text-tertiary"
                        />
                      </div>
                    ) : (
                      <FileText
                        size={24}
                        className="text-text-tertiary"
                      />
                    )}
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm font-medium text-text-primary group-hover:text-accent transition-colors line-clamp-1">
                      {project.brand_name || project.products?.[0]?.name || `프로젝트 ${project.id.slice(0, 8)}`}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-text-tertiary">
                      <span>{getTemplateLabel(project)}</span>
                      <span>·</span>
                      <span>{formatDate(project.created_at)}</span>
                    </div>
                    {project.rendered_sections && (
                      <p className="text-xs text-text-tertiary">
                        {project.rendered_sections.length}개 섹션
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
