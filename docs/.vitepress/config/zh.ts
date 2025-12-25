import { defineConfig, type DefaultTheme } from 'vitepress'

export const zhConfig = defineConfig({
  lang: 'zh-CN',
  description: '为 Electron 应用提供窗口管理、IPC 路由和状态同步的基础设施工具包',

  themeConfig: {
    nav: nav(),
    sidebar: {
      '/guide/': { base: '/guide/', items: sidebarGuide() },
      '/api/': { base: '/api/', items: sidebarAPI() },
      '/examples/': { base: '/examples/', items: sidebarExamples() }
    },

    editLink: {
      pattern: 'https://github.com/chunhaofen/electron-infra-kit/edit/main/docs/:path',
      text: '在 GitHub 上编辑此页面'
    },

    docFooter: {
      prev: '上一页',
      next: '下一页'
    },

    outline: {
      label: '页面导航'
    },

    lastUpdated: {
      text: '最后更新于',
      formatOptions: {
        dateStyle: 'short',
        timeStyle: 'medium'
      }
    },

    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '菜单',
    darkModeSwitchLabel: '主题',
    lightModeSwitchTitle: '切换到浅色模式',
    darkModeSwitchTitle: '切换到深色模式'
  }
})

function nav(): DefaultTheme.NavItem[] {
  return [
    { text: '指南', link: '/guide/introduction', activeMatch: '/guide/' },
    { text: 'API 参考', link: '/api/', activeMatch: '/api/' },
    { text: '示例', link: '/examples/', activeMatch: '/examples/' },
    {
      text: '链接',
      items: [
        { text: 'GitHub', link: 'https://github.com/chunhaofen/electron-infra-kit' },
        { text: 'npm', link: 'https://www.npmjs.com/package/electron-infra-kit' },
        { text: '在线示例', link: 'https://github.com/chunhaofen/electron-infra-showcase' },
        { text: '更新日志', link: '/changelog' }
      ]
    }
  ]
}

function sidebarGuide(): DefaultTheme.SidebarItem[] {
  return [
    {
      text: '开始',
      collapsed: false,
      items: [
        { text: '介绍', link: 'introduction' },
        { text: '快速开始', link: 'getting-started' }
      ]
    },
    {
      text: '核心概念',
      collapsed: false,
      items: [
        { text: '窗口管理器', link: 'core-concepts/window-manager' },
        { text: 'IPC 路由', link: 'core-concepts/ipc-router' },
        { text: '消息总线', link: 'core-concepts/message-bus' },
        { text: '生命周期管理', link: 'core-concepts/lifecycle' }
      ]
    },
    {
      text: '进阶主题',
      collapsed: false,
      items: [
        { text: '类型安全', link: 'advanced/type-safety' },
        { text: '性能优化', link: 'advanced/performance' },
        { text: '错误处理', link: 'advanced/error-handling' },
        { text: '调试技巧', link: 'advanced/debugging' }
      ]
    },
    {
      text: '最佳实践',
      link: 'best-practices'
    }
  ]
}

function sidebarAPI(): DefaultTheme.SidebarItem[] {
  return [
    {
      text: 'API 参考',
      items: [
        { text: '概览', link: 'index' },
        { text: 'WindowManager', link: 'window-manager' },
        { text: 'IpcRouter', link: 'ipc-router' },
        { text: 'MessageBus', link: 'message-bus' },
        { text: 'LifecycleManager', link: 'lifecycle' },
        { text: 'Config', link: 'config' },
        { text: 'Logger', link: 'logger' },
        { text: 'Debug', link: 'debug' },
        { text: '类型定义', link: 'types' }
      ]
    }
  ]
}

function sidebarExamples(): DefaultTheme.SidebarItem[] {
  return [
    {
      text: '示例',
      items: [
        { text: '概览', link: 'index' },
        { text: '基础配置', link: 'basic-setup' },
        { text: '多窗口应用', link: 'multi-window' },
        { text: 'IPC 通信', link: 'ipc-communication' },
        { text: '状态同步', link: 'state-sync' },
        { text: '完整应用', link: 'complete-app' }
      ]
    }
  ]
}
