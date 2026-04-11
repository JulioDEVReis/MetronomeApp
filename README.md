# MetronomeApp

App web de metrônomo com músicas (BPM), playlists e player para uso em shows.

## Estrutura

- **`Client/`** — React + Vite (frontend estático).
- **`Server/`** — API Express + Prisma (PostgreSQL).
- **`api/index.ts`** — entrada **serverless** na Vercel (a mesma app Express, sem `listen`).

## Deploy só na Vercel (site + API no mesmo projeto)

Na Vercel, o frontend e as rotas `/api/*` podem ficar **no mesmo domínio**:

1. O repositório deve ser o **root** do projeto na Vercel (não uses “Root Directory” = `Client`; deixa a raiz do repo).
2. O ficheiro **`vercel.json`** na raiz já define:
   - build do `Client` para `Client/dist`;
   - `rewrites` de `/api/:path*` para a função **`api/index.ts`**.
3. **Base de dados**: em serverless **não** se usa SQLite em ficheiro de forma fiável. Usa **PostgreSQL**. Na Vercel podes ligar **Vercel Postgres** (Storage → Postgres) ao projeto; isso cria a variável **`DATABASE_URL`** automaticamente.
4. No primeiro deploy, o comando **`vercel-build`** corre `prisma migrate deploy` no `Server/` (precisa de **`DATABASE_URL`** já definida antes do build).
5. No **Client**, deixa **`VITE_API_URL` vazio** (ou não definas): o browser chama **`/api/...`** no mesmo domínio da Vercel.

### Resumo das variáveis na Vercel

| Variável | Obrigatório | Notas |
|----------|-------------|--------|
| `DATABASE_URL` | Sim | Vem do Vercel Postgres (ou outra URL Postgres compatível). |
| `VITE_API_URL` | Não | Vazio = API no mesmo host (`/api`). |

### GitHub

Cria o repositório, faz push, importa na Vercel e liga o **Postgres** ao projeto antes de confiar no primeiro build com migrações.

### Erros comuns no deploy (Vercel)

- **`prisma: command not found` / `Cannot find module 'prisma'`** — na Vercel o `npm install` corre muitas vezes em modo produção e **não instala `devDependencies`**. Neste repo o `prisma` está em **`dependencies`** do `Server` e o `installCommand` usa **`--include=dev`** para o `Client` (Vite/TypeScript).
- **`Environment variable not found: DATABASE_URL`** ou **falha de ligação (P1001)** — liga **Vercel Postgres** (ou define `DATABASE_URL` manualmente) no projeto **e** garante que está disponível para **Production** (e Preview, se usares). O `vercel-build` corre `prisma migrate deploy`, que precisa de aceder à base durante o build.

## Desenvolvimento local

### 1) PostgreSQL com Docker

Na raiz do repo:

```bash
docker compose up -d
```

### 2) API

```bash
cd Server
cp .env.example .env
npm install
npx prisma migrate deploy
npm run dev
```

### 3) Web

```bash
cd Client
npm install
npm run dev
```

O Vite encaminha `/api` para `http://localhost:3001` (ver `Client/vite.config.ts`).

### Prisma em funções serverless

O `schema.prisma` inclui `binaryTargets` com `rhel-openssl-3.0.x` para o runtime da Vercel. Em URLs Postgres com **PgBouncer** (comum em serviços geridos), segue a documentação do teu provider (por vezes `?pgbouncer=true&connection_limit=1`).

## Migração a partir da versão antiga (SQLite)

Quem tinha dados em `Server/dev.db` (SQLite) precisa de **exportar e voltar a inserir** na Postgres ou fazer um script de migração à parte; o schema em Postgres é o mesmo modelo, mas a base é nova.
