/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from "react";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { useFileSystem } from "./hooks/useFileSystem";
import { 
  FolderIcon, 
  FileIcon, 
  MoreVertical, 
  Star, 
  Trash2, 
  Download, 
  Share2, 
  ChevronRight, 
  Plus, 
  Upload, 
  LogOut, 
  Search,
  HardDrive,
  Users,
  LayoutGrid,
  List as ListIcon,
  X,
  RefreshCw,
  RotateCcw,
  Menu,
  Home
} from "lucide-react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "motion/react";
import { cn, formatBytes, formatDate } from "./lib/utils";
import { FileData, FolderData } from "./types";

// --- Hooks ---

const useOrientation = () => {
  const [isLandscape, setIsLandscape] = useState(window.innerWidth > window.innerHeight);

  useEffect(() => {
    const handleResize = () => setIsLandscape(window.innerWidth > window.innerHeight);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return isLandscape;
};

const useLongPress = (callback: () => void, ms = 500) => {
  const [startLongPress, setStartLongPress] = useState(false);

  useEffect(() => {
    let timerId: any;
    if (startLongPress) {
      timerId = setTimeout(callback, ms);
    } else {
      clearTimeout(timerId);
    }

    return () => clearTimeout(timerId);
  }, [startLongPress, callback, ms]);

  return {
    onMouseDown: () => setStartLongPress(true),
    onMouseUp: () => setStartLongPress(false),
    onMouseLeave: () => setStartLongPress(false),
    onTouchStart: () => setStartLongPress(true),
    onTouchEnd: () => setStartLongPress(false),
  };
};

// --- Components ---

const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn("animate-pulse bg-gray-200 rounded", className)} />
);

const FileSkeleton = () => (
  <div className="p-4 border border-gray-100 rounded-xl">
    <Skeleton className="w-10 h-10 mb-3" />
    <Skeleton className="h-4 w-3/4 mb-2" />
    <Skeleton className="h-3 w-1/2" />
  </div>
);

const BottomNav = ({ activeCategory, setActiveCategory }: { activeCategory: string, setActiveCategory: (c: string) => void }) => {
  const items = [
    { id: "my-drive", label: "Файлы", icon: HardDrive },
    { id: "shared", label: "Общие", icon: Users },
    { id: "starred", label: "Избранное", icon: Star },
    { id: "trash", label: "Корзина", icon: Trash2 },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 flex items-center justify-around px-4 md:hidden z-50 safe-area-bottom">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => {
            setActiveCategory(item.id);
            if (window.navigator.vibrate) window.navigator.vibrate(5);
          }}
          className={cn(
            "flex flex-col items-center gap-1 transition-colors",
            activeCategory === item.id ? "text-blue-600" : "text-gray-400"
          )}
        >
          <item.icon size={20} />
          <span className="text-[10px] uppercase font-bold tracking-wider">{item.label}</span>
        </button>
      ))}
    </div>
  );
};

const Sidebar = ({ 
  activeCategory, 
  setActiveCategory, 
  isOpen, 
  onClose 
}: { 
  activeCategory: string, 
  setActiveCategory: (c: string) => void,
  isOpen?: boolean,
  onClose?: () => void
}) => {
  const { logout, user } = useAuth();

  const items = [
    { id: "my-drive", label: "Мой Диск", icon: HardDrive },
    { id: "shared", label: "Общие", icon: Users },
    { id: "starred", label: "Избранное", icon: Star },
    { id: "trash", label: "Корзина", icon: Trash2 },
  ];

  const content = (
    <div className="h-full flex flex-col bg-white">
      <div className="p-6 flex items-center justify-between">
        <h1 id="app-logo" className="text-xl font-bold text-blue-600 flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
            CV
          </div>
          CloudVault
        </h1>
        {onClose && (
          <button onClick={onClose} className="md:hidden p-2 hover:bg-gray-100 rounded-full">
            <X size={20} />
          </button>
        )}
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setActiveCategory(item.id);
              if (onClose) onClose();
              if (window.navigator.vibrate) window.navigator.vibrate(5);
            }}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              activeCategory === item.id 
                ? "bg-blue-50 text-blue-700" 
                : "text-gray-600 hover:bg-gray-50"
            )}
          >
            <item.icon size={18} />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-100 mb-safe">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
            {user?.login[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate uppercase tracking-tight">{user?.login}</p>
          </div>
          <button onClick={logout} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-red-500">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div id="sidebar-container" className="hidden md:flex w-64 border-r border-gray-200 h-full flex-col bg-white shrink-0">
        {content}
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] md:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute left-0 top-0 bottom-0 w-[280px] shadow-2xl"
            >
              {content}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

const Breadcrumbs = ({ path, onNavigate }: { path: { id: string, name: string }[], onNavigate: (id: string | null) => void }) => {
  return (
    <div className="flex items-center gap-1 text-sm text-gray-500 mb-4">
      <button onClick={() => onNavigate(null)} className="hover:text-blue-600">Мой Диск</button>
      {path.map((item, index) => (
        <React.Fragment key={item.id}>
          <ChevronRight size={14} />
          <button 
            onClick={() => onNavigate(item.id)}
            className={cn("hover:text-blue-600", index === path.length - 1 && "font-semibold text-gray-900")}
          >
            {item.name}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
};

const FileActionMenu = ({ 
  item, 
  type, 
  onDelete, 
  onStar, 
  onShare,
  onRestore,
  isInTrash = false
}: { 
  item: FileData | FolderData, 
  type: 'file' | 'folder',
  onDelete: () => void,
  onStar?: (starred: boolean) => void,
  onShare?: () => void,
  onRestore?: () => void,
  isInTrash?: boolean
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button 
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        className="p-1.5 hover:bg-black/5 rounded-full"
      >
        <MoreVertical size={16} className="text-gray-400" />
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1"
            >
              {isInTrash ? (
                <button 
                  onClick={() => { onRestore?.(); setIsOpen(false); }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50"
                >
                  <RotateCcw size={14} /> Восстановить
                </button>
              ) : (
                <>
                  {type === 'file' && (
                    <>
                      <a 
                        href={`/api/files/download/${item.id}`} 
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Download size={14} /> Скачать
                      </a>
                      <button 
                        onClick={() => { onShare?.(); setIsOpen(false); }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Share2 size={14} /> Поделиться
                      </button>
                      <button 
                        onClick={() => { onStar?.(!(item as FileData).isStarred); setIsOpen(false); }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Star size={14} fill={(item as FileData).isStarred ? "currentColor" : "none"} /> {(item as FileData).isStarred ? "Убрать из избранного" : "В избранное"}
                      </button>
                    </>
                  )}
                </>
              )}
              <button 
                onClick={() => { 
                  if (isInTrash) {
                    if (confirm("Вы уверены, что хотите навсегда удалить этот элемент?")) {
                      onDelete();
                    }
                  } else {
                    onDelete();
                  }
                  setIsOpen(false); 
                }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <Trash2 size={14} /> {isInTrash ? "Удалить навсегда" : "В корзину"}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

const AuthForm = () => {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      if (isLogin) {
        await login(username, password);
      } else {
        await register(username, password);
        setError("Регистрация успешна! Теперь вы можете войти.");
        setIsLogin(true);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-100"
      >
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white text-xl font-bold mx-auto mb-4">
            CV
          </div>
          <h2 className="text-2xl font-bold text-gray-900">CloudVault</h2>
          <p className="text-gray-500 mt-2">
            {isLogin ? "Войдите в свой аккаунт" : "Создайте новый аккаунт"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Логин</label>
            <input 
              type="text" 
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Пароль</label>
            <input 
              type="password" 
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-500 text-center">{error}</p>}
          <button 
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            {isLogin ? "Войти" : "Зарегистрироваться"}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-gray-600">
          {isLogin ? "Нет аккаунта?" : "Уже есть аккаунт?"}{" "}
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-blue-600 font-medium hover:underline"
          >
            {isLogin ? "Зарегистрироваться" : "Войти"}
          </button>
        </p>
      </motion.div>
    </div>
  );
};

const Dashboard = () => {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<{ id: string, name: string }[]>([]);
  const [activeCategory, setActiveCategory] = useState("my-drive");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const isLandscape = useOrientation();

  const { 
    files, 
    folders, 
    loading, 
    uploadProgress, 
    refresh,
    createFolder, 
    uploadFiles, 
    deleteItem, 
    restoreItem,
    emptyTrash,
    toggleStar,
    shareFile 
  } = useFileSystem(currentFolderId, activeCategory);

  const handleNavigate = (id: string | null, name?: string) => {
    setCurrentFolderId(id);
    if (id === null) {
      setFolderPath([]);
    } else if (name) {
      setFolderPath([...folderPath, { id, name }]);
    } else {
      const index = folderPath.findIndex(p => p.id === id);
      setFolderPath(folderPath.slice(0, index + 1));
    }
    if (window.navigator.vibrate) window.navigator.vibrate(5);
  };

  const filteredItems = useMemo(() => {
    let baseFiles = files;
    let baseFolders = folders;

    if (activeCategory === "starred") {
      baseFiles = files.filter(f => f.isStarred);
      baseFolders = [];
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      baseFiles = baseFiles.filter(f => f.name.toLowerCase().includes(q));
      baseFolders = baseFolders.filter(f => f.name.toLowerCase().includes(q));
    }

    return { files: baseFiles, folders: baseFolders };
  }, [files, folders, activeCategory, searchQuery]);

  // Touch triggers for context menu
  const ContextMenuTrigger = ({ children, onOpen }: { children: React.ReactNode, onOpen: () => void }) => {
    const longPressOptions = useLongPress(() => {
      if (window.navigator.vibrate) window.navigator.vibrate(15);
      onOpen();
    }, 600);

    return <div {...longPressOptions}>{children}</div>;
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden flex-col md:flex-row">
      <Sidebar 
        activeCategory={activeCategory} 
        setActiveCategory={setActiveCategory} 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)}
      />
      
      <main id="main-content" className="flex-1 flex flex-col min-w-0 bg-white relative">
        {/* Topbar */}
        <header id="top-navbar" className="h-16 border-b border-gray-100 flex items-center justify-between px-4 md:px-8 bg-white shrink-0 sticky top-0 z-40 pt-safe">
          <div className="flex items-center gap-3 flex-1 max-w-xl">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 hover:bg-gray-50 rounded-lg text-gray-500"
            >
              <Menu size={20} />
            </button>
            <div className="relative group flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={16} />
              <input 
                id="search-input"
                type="text" 
                placeholder="Поиск..."
                className="w-full pl-9 pr-4 py-2 bg-gray-100 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-100 rounded-lg outline-none transition-all text-sm h-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4 ml-2">
            <div id="view-mode-switcher" className="hidden sm:flex border border-gray-200 rounded-lg p-0.5 bg-gray-50">
              <button 
                id="grid-view-btn"
                onClick={() => setViewMode('grid')}
                className={cn("p-1.5 rounded", viewMode === 'grid' ? "bg-white shadow-sm text-blue-600" : "text-gray-400")}
              >
                <LayoutGrid size={18} />
              </button>
              <button 
                id="list-view-btn"
                onClick={() => setViewMode('list')}
                className={cn("p-1.5 rounded", viewMode === 'list' ? "bg-white shadow-sm text-blue-600" : "text-gray-400")}
              >
                <ListIcon size={18} />
              </button>
            </div>
            
            {activeCategory === "trash" ? (
              <button 
                id="empty-trash-btn"
                onClick={() => {
                  if (confirm("Очистить корзину навсегда?")) {
                    emptyTrash();
                    if (window.navigator.vibrate) window.navigator.vibrate([10, 50, 10]);
                  }
                }}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg md:px-4 md:py-2 md:text-sm md:font-medium md:border md:border-red-200 flex items-center gap-2"
                disabled={files.length === 0 && folders.length === 0}
              >
                <Trash2 size={18} /> <span className="hidden md:inline">Очистить</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button 
                  id="new-folder-btn"
                  onClick={() => {
                    const name = prompt("Введите имя папки:");
                    if (name) createFolder(name);
                  }}
                  className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg md:px-4 md:py-2 md:text-sm md:font-medium md:border md:border-gray-200 flex items-center gap-2"
                >
                  <Plus size={18} /> <span className="hidden md:inline">Папка</span>
                </button>
                <label id="upload-btn-label" className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer shadow-md shadow-blue-100 md:px-4 md:py-2 md:text-sm md:font-medium flex items-center gap-2">
                  <Upload size={18} /> <span className="hidden md:inline">Загрузить</span>
                  <input 
                    id="file-upload-input"
                    type="file" 
                    multiple 
                    className="hidden" 
                    accept="*/*"
                    onChange={(e) => e.target.files && uploadFiles(e.target.files)} 
                  />
                </label>
              </div>
            )}
          </div>
        </header>

        {/* Content area */}
        <div id="content-scroll" className="flex-1 overflow-y-auto p-4 md:p-8 relative touch-pan-y no-scrollbar pb-24 md:pb-8">
          <Breadcrumbs path={folderPath} onNavigate={handleNavigate} />

          {loading ? (
            <div className={cn(
              viewMode === 'grid' 
                ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 md:gap-6" 
                : "space-y-4"
            )}>
              {[...Array(8)].map((_, i) => <FileSkeleton key={i} />)}
            </div>
          ) : (
            <div className={cn(
              viewMode === 'grid' 
                ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4 md:gap-6" 
                : "flex flex-col gap-2"
            )}>
              {filteredItems.folders.map((folder) => (
                <ContextMenuTrigger 
                  key={folder.id} 
                  onOpen={() => {
                    // Logic to open menu could be added here, 
                    // but for now FileActionMenu already has its own button.
                    // To make it better, I'll pass a ref or trigger to the menu.
                  }}
                >
                  <motion.div 
                    layout
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }}
                    onClick={() => handleNavigate(folder.id, folder.name)}
                    className={cn(
                      "group relative bg-white border border-gray-200 rounded-xl hover:shadow-md transition-all cursor-pointer min-h-[44px]",
                      viewMode === 'grid' ? "p-4" : "flex items-center p-3 gap-4"
                    )}
                  >
                    <div className={cn("text-blue-500 bg-blue-50 rounded-lg flex items-center justify-center", viewMode === 'grid' ? "w-10 h-10 mb-3" : "w-10 h-10 shrink-0")}>
                      <FolderIcon size={24} fill="currentColor" fillOpacity={0.2} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate leading-tight uppercase tracking-tight">{folder.name}</p>
                      {viewMode === 'list' && <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">{formatDate(folder.createdAt)}</p>}
                    </div>
                    <FileActionMenu 
                      item={folder} 
                      type="folder" 
                      onDelete={() => deleteItem(folder.id, "folder")}
                      onRestore={() => restoreItem(folder.id, "folder")}
                      isInTrash={activeCategory === "trash"}
                    />
                  </motion.div>
                </ContextMenuTrigger>
              ))}

              {filteredItems.files.map((file) => (
                <ContextMenuTrigger 
                  key={file.id} 
                  onOpen={() => {
                    // Similar to folder
                  }}
                >
                  <motion.div 
                    layout
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }}
                    className={cn(
                      "group relative bg-white border border-gray-200 rounded-xl hover:shadow-md transition-all min-h-[44px]",
                      viewMode === 'grid' ? "p-4" : "flex items-center p-3 gap-4"
                    )}
                  >
                    <div className={cn("text-orange-500 bg-orange-50 rounded-lg flex items-center justify-center", viewMode === 'grid' ? "w-10 h-10 mb-3" : "w-10 h-10 shrink-0")}>
                      <FileIcon size={24} fill="currentColor" fillOpacity={0.2} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate leading-tight uppercase tracking-tight">{file.name}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">
                        {formatBytes(file.size)} • {formatDate(file.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="hidden md:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {file.isStarred && <Star size={14} className="text-yellow-400 fill-current" />}
                        {file.isPublic && <Share2 size={14} className="text-green-500" />}
                      </div>
                      <FileActionMenu 
                        item={file} 
                        type="file" 
                        onDelete={() => deleteItem(file.id, "file")}
                        onStar={(starred) => toggleStar(file.id, starred)}
                        onRestore={() => restoreItem(file.id, "file")}
                        isInTrash={activeCategory === "trash"}
                        onShare={async () => {
                          const token = await shareFile(file.id, !file.isPublic);
                          if (token) {
                            const url = `${window.location.origin}/share/${token}`;
                            navigator.clipboard.writeText(url);
                            alert("Ссылка скопирована!");
                          }
                        }}
                      />
                    </div>
                  </motion.div>
                </ContextMenuTrigger>
              ))}

              {filteredItems.files.length === 0 && filteredItems.folders.length === 0 && !loading && (
                <div className="col-span-full py-20 text-center">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                    <HardDrive size={32} />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 uppercase">Здесь пусто</h3>
                  <p className="text-xs text-gray-500 mt-1 uppercase">Загрузите файлы для начала работы</p>
                </div>
              )}
            </div>
          )}

          {/* Upload Progress */}
          <AnimatePresence>
            {uploadProgress.all !== undefined && (
              <motion.div 
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="fixed bottom-20 md:bottom-8 right-4 md:right-8 w-[calc(100vw-2rem)] md:w-80 bg-white rounded-xl shadow-2xl border border-gray-100 p-4 z-[60]"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-gray-900 uppercase">Загрузка...</span>
                  <span className="text-sm font-black text-blue-600">{uploadProgress.all}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress.all}%` }}
                    className="bg-blue-600 h-full"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <BottomNav activeCategory={activeCategory} setActiveCategory={setActiveCategory} />
    </div>
  );
};

const AppContent = () => {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return user ? <Dashboard /> : <AuthForm />;
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
