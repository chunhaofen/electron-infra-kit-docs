# Config API

Configuration management system providing application configuration read/write and persistence.

## Overview

The Config module provides a simple configuration management interface for storing and retrieving application settings.

## Key Features

- Configuration read/write
- Configuration persistence
- Configuration validation
- Default value management

## Usage Example

```typescript
import { Config } from 'electron-infra-kit';

// Create config instance
const config = new Config({
  defaults: {
    theme: 'light',
    language: 'en-US'
  }
});

// Read configuration
const theme = config.get('theme');

// Write configuration
config.set('theme', 'dark');

// Save configuration
await config.save();
```

## Related Links

- [Getting Started](/en/guide/getting-started)
- [Best Practices](/en/guide/best-practices)
