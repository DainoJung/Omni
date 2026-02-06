"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Download, ChevronDown, Check, Plus, Trash2 } from "lucide-react";
import type { Project } from "@/types";

interface HeaderProps {
  onDownload?: () => void;
  showDownload?: boolean;
  projects?: Project[];
  currentProjectId?: string;
  onProjectSelect?: (projectId: string) => void;
  onNewProject?: () => void;
  onProjectDelete?: (projectId: string) => void;
}

export function Header({
  onDownload,
  showDownload = false,
  projects,
  currentProjectId,
  onProjectSelect,
  onNewProject,
  onProjectDelete,
}: HeaderProps) {
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const currentProject = projects?.find((p) => p.id === currentProjectId);
  const projectName = currentProject?.products?.[0]?.name || currentProject?.brand_name || "프로젝트 선택";

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

  return (
    <header className="h-14 border-b border-border flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.png" alt="SSG" width={28} height={28} />
          <span className="text-lg font-semibold tracking-widest">
            SSG POP MAKER
          </span>
        </Link>

        {/* Project Selector */}
        {projects && projects.length > 0 && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowProjectMenu(!showProjectMenu)}
              className="flex items-center gap-2 px-3 py-1.5 bg-bg-secondary border border-border rounded-md text-sm font-medium hover:bg-bg-tertiary transition-colors"
            >
              <span className="max-w-[200px] truncate">{projectName}</span>
              <ChevronDown size={14} className={`transition-transform ${showProjectMenu ? "rotate-180" : ""}`} />
            </button>

            {showProjectMenu && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-border rounded-lg shadow-xl z-50 overflow-hidden">
                <div className="px-3 py-2 border-b border-border">
                  <span className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">
                    프로젝트
                  </span>
                </div>
                <div className="max-h-64 overflow-y-auto py-1">
                  {projects.map((project) => {
                    const isSelected = project.id === currentProjectId;
                    const name = project.products?.[0]?.name || project.brand_name || "프로젝트";
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
