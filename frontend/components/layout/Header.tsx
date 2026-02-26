"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Download, ChevronDown, Check, Plus, Trash2, Pencil } from "lucide-react";
import type { Project } from "@/types";
import { projectsApi } from "@/lib/api";

const PAGE_TYPE_LABELS: Record<string, { name: string; color: string }> = {
  product_detail: { name: "상품 포인트", color: "bg-blue-100 text-blue-700" },
  promotion: { name: "상품 기획전", color: "bg-pink-100 text-pink-700" },
  gourmet: { name: "맛집 기획전", color: "bg-amber-100 text-amber-700" },
  brand_promotion: { name: "브랜드 기획전", color: "bg-gray-200 text-gray-700" },
  vip_special: { name: "VIP 스페셜", color: "bg-purple-100 text-purple-700" },
  vip_private: { name: "VIP 프라이빗", color: "bg-gray-800 text-white" },
  shinsegae: { name: "뱅드신세계", color: "bg-red-100 text-red-700" },
  custom: { name: "커스텀", color: "bg-indigo-100 text-indigo-700" },
};

function getProjectDisplayName(project?: Project): string {
  if (!project) return "프로젝트 선택";
  const customName = (project.input_data as Record<string, unknown>)?.project_name as string | undefined;
  if (customName) return customName;
  if (project.theme_id === "gourmet" && project.restaurants?.length) {
    return project.restaurants[0].name;
  }
  return project.products?.[0]?.name || project.brand_name || "프로젝트";
}

interface HeaderProps {
  onDownload?: () => void;
  showDownload?: boolean;
  projects?: Project[];
  currentProjectId?: string;
  onProjectSelect?: (projectId: string) => void;
  onNewProject?: () => void;
  onProjectDelete?: (projectId: string) => void;
  onProjectUpdate?: (project: Project) => void;
}

export function Header({
  onDownload,
  showDownload = false,
  projects,
  currentProjectId,
  onProjectSelect,
  onNewProject,
  onProjectDelete,
  onProjectUpdate,
}: HeaderProps) {
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentProject = projects?.find((p) => p.id === currentProjectId);
  const projectName = getProjectDisplayName(currentProject);
  const pageType = currentProject?.theme_id ? PAGE_TYPE_LABELS[currentProject.theme_id] : null;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowProjectMenu(false);
      }
    };

    if (showProjectMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showProjectMenu]);

  useEffect(() => {
    if (editingName && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingName]);

  const handleStartEdit = () => {
    if (!currentProject) return;
    setNameInput(projectName);
    setEditingName(true);
  };

  const handleSaveName = async () => {
    if (!currentProject) return;
    setEditingName(false);
    const trimmed = nameInput.trim();
    if (!trimmed || trimmed === projectName) return;

    const existingInputData = (currentProject.input_data as Record<string, unknown>) || {};
    const updatedInputData = { ...existingInputData, project_name: trimmed };
    try {
      const updated = await projectsApi.update(currentProject.id, { input_data: updatedInputData });
      onProjectUpdate?.(updated);
    } catch {
      // 실패 시 무시
    }
  };

  return (
    <header className="h-14 border-b border-border flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.png" alt="SSG" width={120} height={40} />
          <h1 className="text-lg font-semibold text-center text-gray-700">CONTENTS MAKER</h1>
        </Link>

        {/* Project Selector */}
        {projects && projects.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowProjectMenu(!showProjectMenu)}
                className="flex items-center gap-2 px-3 py-1.5 bg-bg-secondary border border-border rounded-md text-sm font-medium hover:bg-bg-tertiary transition-colors"
              >
                {pageType && (
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${pageType.color}`}>
                    {pageType.name}
                  </span>
                )}
                {editingName ? (
                  <input
                    ref={inputRef}
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onBlur={handleSaveName}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveName();
                      if (e.key === "Escape") setEditingName(false);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-40 bg-white border border-accent rounded px-1.5 py-0.5 text-sm outline-none"
                    maxLength={50}
                  />
                ) : (
                  <span className="max-w-[200px] truncate">{projectName}</span>
                )}
                <ChevronDown size={14} className={`transition-transform ${showProjectMenu ? "rotate-180" : ""}`} />
              </button>

              {showProjectMenu && (
                <div className="absolute top-full left-0 mt-1 w-72 bg-white border border-border rounded-lg shadow-xl z-50 overflow-hidden">
                  <div className="px-3 py-2 border-b border-border">
                    <span className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">
                      프로젝트
                    </span>
                  </div>
                  <div className="max-h-64 overflow-y-auto py-1">
                    {projects.map((project) => {
                      const isSelected = project.id === currentProjectId;
                      const name = getProjectDisplayName(project);
                      const pt = project.theme_id ? PAGE_TYPE_LABELS[project.theme_id] : null;
                      return (
                        <div
                          key={project.id}
                          className={`group flex items-center gap-2 px-3 py-2 text-sm transition-colors ${isSelected
                            ? "bg-accent/10 text-accent"
                            : "text-text-primary hover:bg-bg-secondary"
                            }`}
                        >
                          <button
                            onClick={() => {
                              if (!isSelected && onProjectSelect) {
                                onProjectSelect(project.id);
                              }
                              setShowProjectMenu(false);
                            }}
                            className="flex-1 flex items-center gap-2 text-left min-w-0"
                          >
                            <span className="w-4 shrink-0">
                              {isSelected && <Check size={14} />}
                            </span>
                            {pt && (
                              <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold ${pt.color}`}>
                                {pt.name}
                              </span>
                            )}
                            <span className="truncate">{name}</span>
                          </button>
                          {onProjectDelete && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onProjectDelete(project.id);
                              }}
                              className="shrink-0 p-1 text-text-tertiary hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {onNewProject && (
                    <>
                      <div className="border-t border-border" />
                      <button
                        onClick={() => {
                          onNewProject();
                          setShowProjectMenu(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-text-secondary hover:bg-bg-secondary transition-colors"
                      >
                        <Plus size={14} />
                        <span>새 프로젝트</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* 제목 수정 버튼 */}
            {currentProject && !editingName && (
              <button
                onClick={handleStartEdit}
                className="p-1 text-text-tertiary hover:text-text-primary transition-colors"
                title="프로젝트 제목 수정"
              >
                <Pencil size={13} />
              </button>
            )}
          </div>
        )}
      </div>

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
