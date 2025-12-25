# Changelog

This page documents all notable changes to electron-infra-kit.

## [0.1.2](https://github.com/chunhaofen/electron-infra-kit/compare/v0.1.1...v0.1.2) (2025-12-25)

### ♻️ Refactoring

- **ipc:** Changed success response code from 0 to 200 to comply with HTTP standards

## [0.1.1](https://github.com/chunhaofen/electron-infra-kit/compare/v0.1.0...v0.1.1) (2025-12-25)

### 📝 Documentation

- Updated project documentation and contribution guidelines
- Updated README file and added architecture design diagrams

### ✨ New Features

- **logger:** Added shared logger instance and IPC transport functionality

## [0.1.0](https://github.com/chunhaofen/electron-infra-kit/releases/tag/v0.1.0) (2025-12-23)

### 🚀 Features

#### Core

- Initial release of Electron Infra Kit

#### Window Manager

- Robust window management with state persistence
- Lifecycle hooks and plugin system

#### IPC Router

- Type-safe IPC communication
- Dependency injection and rate limiting

#### Message Bus

- Real-time cross-window state synchronization

#### TypeScript Support

- Full TypeScript support
- Zod schema validation

#### Infrastructure

- Built-in error handling
- Logging system
- Debug tools

---

::: tip
Visit [GitHub Releases](https://github.com/chunhaofen/electron-infra-kit/releases) for more detailed information.
:::
