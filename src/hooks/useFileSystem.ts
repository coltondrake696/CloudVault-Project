import { useState, useCallback, useEffect } from "react";
import { FileData, FolderData } from "../types";

export function useFileSystem(currentFolderId: string | null, activeCategory?: string) {
  const [files, setFiles] = useState<FileData[]>([]);
  const [folders, setFolders] = useState<FolderData[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});

  const refreshAction = useCallback(async () => {
    setLoading(true);
    try {
      const url = activeCategory === "trash" 
        ? `/api/fs?category=trash`
        : `/api/fs?parentId=${currentFolderId || "root"}`;
      const res = await fetch(url);
      const data = await res.json();
      setFiles(data.files);
      setFolders(data.folders);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentFolderId, activeCategory]);

  useEffect(() => {
    refreshAction();
  }, [refreshAction]);

  const createFolder = async (name: string) => {
    const res = await fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, parentId: currentFolderId || "root" }),
    });
    if (res.ok) refreshAction();
  };

  const uploadFiles = async (selectedFiles: FileList | File[]) => {
    const formData = new FormData();
    formData.append("folderId", currentFolderId || "root");
    Array.from(selectedFiles).forEach((file) => {
      formData.append("files", file);
    });

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/files/upload");
    
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        setUploadProgress({ "all": percent });
      }
    };

    xhr.onload = () => {
      setUploadProgress({});
      refreshAction();
    };

    xhr.send(formData);
  };

  const deleteItem = async (id: string, type: "file" | "folder") => {
    const res = await fetch(`/api/fs/${type}/${id}`, { method: "DELETE" });
    if (res.ok) refreshAction();
  };

  const restoreItem = async (id: string, type: "file" | "folder") => {
    const res = await fetch(`/api/fs/restore/${type}/${id}`, { method: "POST" });
    if (res.ok) refreshAction();
  };

  const emptyTrash = async () => {
    const res = await fetch(`/api/fs/trash/empty`, { method: "DELETE" });
    if (res.ok) refreshAction();
  };

  const toggleStar = async (id: string, isStarred: boolean) => {
    const res = await fetch(`/api/files/${id}/star`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isStarred }),
    });
    if (res.ok) refreshAction();
  };

  const shareFile = async (id: string, isPublic: boolean) => {
    const res = await fetch(`/api/files/${id}/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublic }),
    });
    if (res.ok) {
      const data = await res.json();
      refreshAction();
      return data.shareToken;
    }
    return null;
  };

  return {
    files,
    folders,
    loading,
    uploadProgress,
    refresh: refreshAction,
    createFolder,
    uploadFiles,
    deleteItem,
    restoreItem,
    emptyTrash,
    toggleStar,
    shareFile,
  };
}
