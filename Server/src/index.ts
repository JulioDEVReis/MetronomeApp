import "dotenv/config";
import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();

const app = express();
app.use(express.json());

app.use(
  cors({
    origin: true,
  }),
);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

const songCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  bpm: z.number().int().min(20).max(300),
});

const songUpdateSchema = songCreateSchema.partial().refine((v) => Object.keys(v).length > 0, {
  message: "Envie ao menos um campo para atualizar.",
});

app.get("/api/songs", async (_req, res) => {
  const songs = await prisma.song.findMany({ orderBy: { name: "asc" } });
  res.json(songs);
});

app.post("/api/songs", async (req, res) => {
  const parsed = songCreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const song = await prisma.song.create({ data: parsed.data });
    return res.status(201).json(song);
  } catch (e: any) {
    if (typeof e?.code === "string" && e.code === "P2002") {
      return res.status(409).json({ error: "Já existe uma música com esse nome." });
    }
    throw e;
  }
});

app.patch("/api/songs/:id", async (req, res) => {
  const { id } = req.params;
  const parsed = songUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const updated = await prisma.song.update({ where: { id }, data: parsed.data });
    return res.json(updated);
  } catch (e: any) {
    if (typeof e?.code === "string" && e.code === "P2025") {
      return res.status(404).json({ error: "Música não encontrada." });
    }
    if (typeof e?.code === "string" && e.code === "P2002") {
      return res.status(409).json({ error: "Já existe uma música com esse nome." });
    }
    throw e;
  }
});

app.delete("/api/songs/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.song.delete({ where: { id } });
    return res.status(204).send();
  } catch (e: any) {
    if (typeof e?.code === "string" && e.code === "P2025") {
      return res.status(404).json({ error: "Música não encontrada." });
    }
    if (typeof e?.code === "string" && e.code === "P2003") {
      return res.status(409).json({ error: "Remova a música das playlists antes de apagar." });
    }
    throw e;
  }
});

const playlistCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
});

app.get("/api/playlists", async (_req, res) => {
  const playlists = await prisma.playlist.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { items: true } } },
  });
  res.json(playlists);
});

app.post("/api/playlists", async (req, res) => {
  const parsed = playlistCreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const playlist = await prisma.playlist.create({ data: parsed.data });
    return res.status(201).json(playlist);
  } catch (e: any) {
    if (typeof e?.code === "string" && e.code === "P2002") {
      return res.status(409).json({ error: "Já existe uma playlist com esse nome." });
    }
    throw e;
  }
});

app.get("/api/playlists/:id", async (req, res) => {
  const { id } = req.params;
  const playlist = await prisma.playlist.findUnique({
    where: { id },
    include: {
      items: {
        orderBy: { position: "asc" },
        include: { song: true },
      },
    },
  });
  if (!playlist) return res.status(404).json({ error: "Playlist não encontrada." });
  res.json(playlist);
});

const addItemSchema = z.object({
  songId: z.string().min(1),
});

app.post("/api/playlists/:id/items", async (req, res) => {
  const { id: playlistId } = req.params;
  const parsed = addItemSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const playlist = await prisma.playlist.findUnique({ where: { id: playlistId } });
  if (!playlist) return res.status(404).json({ error: "Playlist não encontrada." });

  const last = await prisma.playlistItem.findFirst({
    where: { playlistId },
    orderBy: { position: "desc" },
    select: { position: true },
  });
  const nextPos = (last?.position ?? 0) + 1;

  try {
    const item = await prisma.playlistItem.create({
      data: { playlistId, songId: parsed.data.songId, position: nextPos },
      include: { song: true },
    });
    return res.status(201).json(item);
  } catch (e: any) {
    if (typeof e?.code === "string" && e.code === "P2003") {
      return res.status(404).json({ error: "Música não encontrada." });
    }
    throw e;
  }
});

app.delete("/api/playlists/:playlistId/items/:itemId", async (req, res) => {
  const { playlistId, itemId } = req.params;

  const item = await prisma.playlistItem.findUnique({ where: { id: itemId } });
  if (!item || item.playlistId !== playlistId) {
    return res.status(404).json({ error: "Item não encontrado." });
  }

  await prisma.$transaction(async (tx) => {
    await tx.playlistItem.delete({ where: { id: itemId } });
    const remaining = await tx.playlistItem.findMany({
      where: { playlistId },
      orderBy: { position: "asc" },
      select: { id: true },
    });
    for (let i = 0; i < remaining.length; i++) {
      await tx.playlistItem.update({ where: { id: remaining[i]!.id }, data: { position: i + 1 } });
    }
  });
  return res.status(204).send();
});

const reorderSchema = z.object({
  itemIds: z.array(z.string().min(1)).min(1),
});

app.patch("/api/playlists/:playlistId/items/reorder", async (req, res) => {
  const { playlistId } = req.params;
  const parsed = reorderSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const playlist = await prisma.playlist.findUnique({ where: { id: playlistId } });
  if (!playlist) return res.status(404).json({ error: "Playlist não encontrada." });

  const desiredIds = parsed.data.itemIds;
  const existing = await prisma.playlistItem.findMany({
    where: { playlistId },
    orderBy: { position: "asc" },
    select: { id: true },
  });
  const existingIds = existing.map((x) => x.id);

  if (existingIds.length !== desiredIds.length) {
    return res.status(400).json({ error: "A lista enviada não bate com os itens atuais da playlist." });
  }
  const existingSet = new Set(existingIds);
  for (const id of desiredIds) {
    if (!existingSet.has(id)) {
      return res.status(400).json({ error: "A lista enviada contém item inválido para esta playlist." });
    }
  }

  await prisma.$transaction(async (tx) => {
    // 2 fases para evitar colisão no @@unique([playlistId, position])
    for (let i = 0; i < desiredIds.length; i++) {
      await tx.playlistItem.update({ where: { id: desiredIds[i]! }, data: { position: -(i + 1) } });
    }
    for (let i = 0; i < desiredIds.length; i++) {
      await tx.playlistItem.update({ where: { id: desiredIds[i]! }, data: { position: i + 1 } });
    }
  });

  const playlistUpdated = await prisma.playlist.findUnique({
    where: { id: playlistId },
    include: { items: { orderBy: { position: "asc" }, include: { song: true } } },
  });
  return res.json(playlistUpdated);
});

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API rodando em http://localhost:${port}`);
});

