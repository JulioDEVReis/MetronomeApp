# MetronomeApp

Metrônomo para shows: músicas (BPM), playlists e player. **Sem servidor nem base de dados** — os dados ficam no **browser** (`localStorage`), ideal para uso pessoal no telemóvel.

## Funcionalidades

- **Adicionar e editar** músicas (nome, BPM, nota) independentemente de playlist.
- Inclusão de notas para cada música (por exemplo: Musica finaliza com solo na guitarra). Essa nota será apresentada na Playlist e em tela cheia.
- Criação de Playlists para shows, podendo adicionar musicas a Playlist e editar, alterando as posições das musicas na Playlist.
- Função tela cheia para que toda a tela pisque em verde de acordo com o BPM da musica. Inclui o nome da musica, o BPM e a nota adicionada.
- Músicas e playlists guardadas localmente.
- **Exportar / importar JSON** — cópia de segurança completa (ficheiro para guardar na cloud ou enviar por email).
- **Exportar / importar CSV das músicas** — formato `Nome;BPM` (UTF-8 com BOM, abre bem no Excel em PT).
- Inclui a função "nosleep.js" para evitar que a tela do telemovel escureça durante a Playlist.

## Desenvolvimento

```bash
npm install
npm run dev
```

## Nota

Os dados **não** sincronizam entre dispositivos sozinhos: usa **Exportar JSON** noutro telemóvel ou após limpar dados do browser.

## Falta ainda

- Deploy (Vercel? PostgreSQL?).
