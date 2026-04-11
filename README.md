# MetronomeApp

Metrônomo para shows: músicas (BPM), playlists e player. **Sem servidor nem base de dados** — os dados ficam no **browser** (`localStorage`), ideal para uso pessoal no telemóvel.

## Funcionalidades

- Músicas e playlists guardadas localmente.
- **Exportar / importar JSON** — cópia de segurança completa (ficheiro para guardar na cloud ou enviar por email).
- **Exportar / importar CSV das músicas** — formato `Nome;BPM` (UTF-8 com BOM, abre bem no Excel em PT).

## Desenvolvimento

```bash
npm install
npm run dev
```

## Nota

Os dados **não** sincronizam entre dispositivos sozinhos: usa **Exportar JSON** noutro telemóvel ou após limpar dados do browser.
