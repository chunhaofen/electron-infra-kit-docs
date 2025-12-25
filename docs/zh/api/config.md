# Config API

配置管理系统，提供应用配置的读写和持久化。

## 概述

Config 模块提供了一个简单的配置管理接口，用于存储和检索应用程序配置。

## 主要功能

- 配置读写
- 配置持久化
- 配置验证
- 默认值管理

## 使用示例

```typescript
import { Config } from 'electron-infra-kit';

// 创建配置实例
const config = new Config({
  defaults: {
    theme: 'light',
    language: 'zh-CN'
  }
});

// 读取配置
const theme = config.get('theme');

// 写入配置
config.set('theme', 'dark');

// 保存配置
await config.save();
```

## 相关链接

- [快速开始](/zh/guide/getting-started)
- [最佳实践](/zh/guide/best-practices)
