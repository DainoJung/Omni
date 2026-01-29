"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X } from "lucide-react";

interface ImageUploaderProps {
  files: File[];
  onChange: (files: File[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
}

export function ImageUploader({
  files,
  onChange,
  maxFiles = 5,
  maxSizeMB = 5,
}: ImageUploaderProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const newFiles = [...files, ...acceptedFiles].slice(0, maxFiles);
      onChange(newFiles);
    },
    [files, onChange, maxFiles]
  );

  const removeFile = (index: number) => {
    onChange(files.filter((_, i) => i !== index));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/png": [], "image/jpeg": [] },
    maxSize: maxSizeMB * 1024 * 1024,
    maxFiles: maxFiles - files.length,
    disabled: files.length >= maxFiles,
  });

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-text-primary">
        상품 이미지
      </label>

      {/* Preview */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-3">
          {files.map((file, index) => (
            <div key={index} className="relative group">
              <div className="w-20 h-20 rounded-sm border border-border overflow-hidden">
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="absolute -top-2 -right-2 w-5 h-5 bg-error text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Dropzone */}
      {files.length < maxFiles && (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-sm p-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? "border-accent bg-bg-secondary"
              : "border-border hover:border-text-secondary"
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="w-8 h-8 text-text-tertiary mx-auto mb-3" />
          <p className="text-sm text-text-secondary">
            이미지를 드래그하거나 클릭하여 업로드하세요
          </p>
          <p className="text-xs text-text-tertiary mt-1">
            PNG, JPG / 최대 {maxSizeMB}MB / 최대 {maxFiles}장
          </p>
        </div>
      )}
    </div>
  );
}
