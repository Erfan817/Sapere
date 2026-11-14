<div align="center">
<img src="docs/brand/sapere-logo-kit/svg/sapere-symbol-color.svg" alt="Sapere open-page symbol" width="112" />

# Sapere · 致知

A local-first desktop learning workspace for understanding, practicing and remembering what you learn.

[中文](README.md) · [Repository](https://github.com/Erfan817/Sapere) · [Issues](https://github.com/Erfan817/Sapere/issues)
</div>

Sapere is in early development. Windows 11 x64 is the first verified platform. Desktop startup, isolated workspaces, note persistence across restarts and the monochrome open-page identity have been verified. Course organization and spaced repetition are planned work, not completed features.

No validated Sapere installer or automatic update feed is available yet. Use this repository for project progress.

## Development

Use Node 24.16.x and pnpm 10.34.9.

```bash
corepack pnpm install --frozen-lockfile
```

```bash
corepack pnpm dev --host 127.0.0.1 --strictPort
```

```bash
corepack pnpm run build:electron
```

Development data is isolated under the ignored `.sapere/` directory. Keep native SQLite modules compatible with the Electron runtime ABI.

## Data and services

Files and notes are local-first. Cloud models, OCR, transcription and remote tools may send content to the providers you configure. Sapere does not operate an official account service, paid model service or community.

## Attribution and licensing

Sapere is derived from [Reviva](https://github.com/mingchen666/Reviva). Upstream authorship and history are retained. The package retains the upstream AGPL-3.0 declaration; the original license and commercial-use statements are archived in [the upstream README](docs/upstream/Reviva-README_EN.md). This project does not claim additional commercial rights or ownership of upstream code and assets. Third-party skills and fonts retain their original licenses.

See [brand assets](docs/brand/sapere-logo-kit/README.md) and [the project brief](docs/Sapere_致知_项目立项书_v0.2_Reviva二开版.md) for more information.
