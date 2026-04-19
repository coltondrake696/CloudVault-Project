import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import multer from "multer";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import { v4 as uuidv4 } from "uuid";
import cors from "cors";
import helmet from "helmet";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();
const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "cloudvault-secret-key-123";
const STORAGE_PATH = path.join(__dirname, "storage");

// Создаем директорию для хранения, если ее нет
if (!fs.existsSync(STORAGE_PATH)) {
  fs.mkdirSync(STORAGE_PATH, { recursive: true });
}

// --- Безопасность и CORS (CORE FIX для 403) ---

app.use(helmet({
  contentSecurityPolicy: false, // Отключаем CSP, так как он может блокировать превью в Iframe
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "unsafe-none" },
}));

app.use(cors({
  origin: true, // Разрешаем любой origin (автоматически подстраивается под запрос)
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
}));

// Кастомные заголовки для обхода ограничений Iframe
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Private-Network", "true");
  res.setHeader("Referrer-Policy", "no-referrer");
  next();
});

app.use(express.json());
app.use(cookieParser());

// --- Middleware ---

const authenticateToken = async (req: any, res: any, next: any) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: "Неавторизован" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(403).json({ error: "Неверный токен доступа" });
  }
};

// --- Multer Setup ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, STORAGE_PATH);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});
const upload = multer({ storage });

// --- Auth Routes ---

app.post("/api/auth/register", async (req, res) => {
  const { login, password } = req.body;
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: { login, passwordHash },
    });
    res.json({ message: "Регистрация успешна" });
  } catch (err) {
    res.status(400).json({ error: "Логин уже занят" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { login, password } = req.body;
  const user = await prisma.user.findUnique({ where: { login } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: "Неверный логин или пароль" });
  }

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "none", // Важно для Iframe
    secure: true,      // Нужно для sameSite: "none"
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  res.json({ user: { id: user.id, login: user.login } });
});

app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("token", { sameSite: "none", secure: true });
  res.json({ message: "Выход выполнен" });
});

app.get("/api/auth/me", authenticateToken, async (req: any, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) return res.status(404).json({ error: "Пользователь не найден" });
  res.json({ user: { id: user.id, login: user.login } });
});

// --- File & Folder Routes ---

app.post("/api/fs/restore/:type/:id", authenticateToken, async (req: any, res) => {
  const { type, id } = req.params;

  if (type === "folder") {
    const markRestored = async (fid: string) => {
      await prisma.file.updateMany({
        where: { folderId: fid, userId: req.userId },
        data: { isDeleted: false },
      });
      const subfolders = await prisma.folder.findMany({ where: { parentId: fid, userId: req.userId } });
      for (const sub of subfolders) {
        await markRestored(sub.id);
      }
      await prisma.folder.update({ where: { id: fid, userId: req.userId }, data: { isDeleted: false } });
    };
    await markRestored(id);
  } else {
    await prisma.file.update({
      where: { id, userId: req.userId },
      data: { isDeleted: false },
    });
  }
  res.json({ message: "Восстановлено" });
});

app.delete("/api/fs/trash/empty", authenticateToken, async (req: any, res) => {
  // Физическое удаление файлов с диска перед удалением из БД
  const deletedFiles = await prisma.file.findMany({
    where: { userId: req.userId, isDeleted: true },
  });

  for (const file of deletedFiles) {
    const filePath = path.join(STORAGE_PATH, file.path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  await prisma.file.deleteMany({
    where: { userId: req.userId, isDeleted: true },
  });
  await prisma.folder.deleteMany({
    where: { userId: req.userId, isDeleted: true },
  });

  res.json({ message: "Корзина очищена" });
});

app.get("/api/fs", authenticateToken, async (req: any, res) => {
  const { parentId, category } = req.query;
  
  let where: any = { userId: req.userId };
  
  if (category === "trash") {
    where.isDeleted = true;
  } else {
    where.isDeleted = false;
    if (parentId === "root") {
      where.parentId = null;
      where.folderId = null;
    } else if (parentId) {
      where.parentId = parentId;
      where.folderId = parentId;
    } else {
      // Default view usually shows root
      where.parentId = null;
      where.folderId = null;
    }
  }

  const folders = await prisma.folder.findMany({
    where: category === "trash" ? { userId: req.userId, isDeleted: true } : { userId: req.userId, parentId: where.parentId, isDeleted: false },
  });
  const files = await prisma.file.findMany({
    where: category === "trash" ? { userId: req.userId, isDeleted: true } : { userId: req.userId, folderId: where.folderId, isDeleted: false },
  });
  res.json({ folders, files });
});

app.post("/api/folders", authenticateToken, async (req: any, res) => {
  const { name, parentId } = req.body;
  const folder = await prisma.folder.create({
    data: {
      name,
      userId: req.userId,
      parentId: parentId === "root" ? null : parentId,
    },
  });
  res.json(folder);
});

app.post("/api/files/upload", authenticateToken, upload.array("files"), async (req: any, res) => {
  const folderId = req.body.folderId === "root" ? null : req.body.folderId;
  const files = req.files as Express.Multer.File[];

  const results = await Promise.all(
    files.map((file) =>
      prisma.file.create({
        data: {
          name: file.originalname,
          size: file.size,
          mimeType: file.mimetype,
          path: file.filename,
          userId: req.userId,
          folderId: folderId,
        },
      })
    )
  );
  res.json(results);
});

app.get("/api/files/download/:id", authenticateToken, async (req: any, res) => {
  const file = await prisma.file.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!file) return res.status(404).json({ error: "Файл не найден" });

  const filePath = path.join(STORAGE_PATH, file.path);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Файл на диске отсутствует" });

  res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(file.name)}"`);
  res.setHeader("Content-Type", file.mimeType);
  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
});

app.delete("/api/fs/:type/:id", authenticateToken, async (req: any, res) => {
  const { type, id } = req.params;

  if (type === "folder") {
    const markDeleted = async (fid: string) => {
      await prisma.file.updateMany({
        where: { folderId: fid, userId: req.userId },
        data: { isDeleted: true },
      });
      const subfolders = await prisma.folder.findMany({ where: { parentId: fid, userId: req.userId } });
      for (const sub of subfolders) {
        await markDeleted(sub.id);
      }
      await prisma.folder.update({ where: { id: fid, userId: req.userId }, data: { isDeleted: true } });
    };
    await markDeleted(id);
  } else {
    await prisma.file.update({
      where: { id, userId: req.userId },
      data: { isDeleted: true },
    });
  }
  res.json({ message: "Удалено" });
});

app.patch("/api/files/:id/star", authenticateToken, async (req: any, res) => {
  const { isStarred } = req.body;
  const file = await prisma.file.update({
    where: { id: req.params.id, userId: req.userId },
    data: { isStarred },
  });
  res.json(file);
});

// --- Public Sharing ---

app.post("/api/files/:id/share", authenticateToken, async (req: any, res) => {
  const { isPublic } = req.body;
  const shareToken = isPublic ? uuidv4() : null;
  const file = await prisma.file.update({
    where: { id: req.params.id, userId: req.userId },
    data: { isPublic, shareToken },
  });
  res.json(file);
});

app.get("/api/share/:token", async (req, res) => {
  const file = await prisma.file.findUnique({
    where: { shareToken: req.params.token, isPublic: true },
  });
  if (!file) return res.status(403).send("Доступ запрещен: файл приватный или ссылка неверна");

  const filePath = path.join(STORAGE_PATH, file.path);
  res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(file.name)}"`);
  res.setHeader("Content-Type", file.mimeType);
  fs.createReadStream(filePath).pipe(res);
});

// --- Vite Middleware ---

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Сервер CloudVault запущен на порту ${PORT}`);
  });
}

startServer();
