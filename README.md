# MetronomeApp

App web de metrônomo com músicas (BPM), playlists e player para uso em shows.

## Estrutura

- **`Client/`** — React + Vite (frontend).
- **`Server/`** — API Express + Prisma + SQLite (`DATABASE_URL`).

## Colocar o frontend na Vercel (GitHub)

1. Crie um repositório no GitHub e envie este código (`git push`).
2. Na [Vercel](https://vercel.com), **Add New Project** → importe o repositório.
3. Em **Root Directory**, escolha **`Client`** (importante: o build do Vite fica aí).
4. Variáveis de ambiente (Build / Production):
   - **`VITE_API_URL`** — URL pública da sua API **sem** barra no final.  
     Exemplo: `https://metronome-api.onrender.com`  
     Em branco, o app assume `/api` no mesmo host (útil só em dev com proxy do Vite).
5. Deploy. O site usará `VITE_API_URL` nas chamadas `fetch` (definido no build).

## API em produção (recomendado junto com a Vercel)

A Vercel serve o **site estático** do `Client`. A API em **`Server/`** precisa rodar noutro serviço (ex.: [Render](https://render.com), Railway, Fly.io), porque usa Node + Prisma + ficheiro SQLite (disco).

No host da API:

1. **Root** do serviço: pasta **`Server/`**.
2. **Build command** (exemplo):  
   `npm ci && npm run db:deploy && npm run build`
3. **Start command**:  
   `npm start`
4. Variável **`DATABASE_URL`**: no primeiro deploy pode usar  
   `file:./prod.db`  
   se o plano tiver **disco persistente**; para escalonar depois, use **PostgreSQL** e ajuste o `provider` no `prisma/schema.prisma`.
5. **`PORT`**: a maioria das plataformas define automaticamente; o servidor já usa `process.env.PORT`.

**CORS:** a API já usa `cors({ origin: true })`, aceitando pedidos a partir do domínio da Vercel.

## Desenvolvimento local

Terminal 1 — API (`http://localhost:3001`):

```bash
cd Server
cp .env.example .env   # se ainda não existir
npm install
npm run dev
```

Terminal 2 — Web (`http://localhost:5173`):

```bash
cd Client
npm install
npm run dev
```

O Vite encaminha `/api` para `localhost:3001` (ver `Client/vite.config.ts`).
