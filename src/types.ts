export interface User {
  id: string;
  login: string;
}

export interface FileData {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  path: string;
  isPublic: boolean;
  shareToken: string | null;
  isStarred: boolean;
  createdAt: string;
  updatedAt: string;
  folderId: string | null;
}

export interface FolderData {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
}
