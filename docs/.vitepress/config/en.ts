import { defineConfig, type DefaultTheme } from 'vitepress'

export const enConfig = defineConfig({
  lang: 'en-US',
  description: 'A comprehensive infrastructure toolkit for Electron applications providing window management, IPC routing, and state synchronization',

  themeConfig: {
    nav: nav(),
    sidebar: {
      '/en/guide/': { base: '/en/guide/', items: sidebarGuide() },
      '/en/api/': { base: '/en/api/', items: sidebarAPI() },
      '/en/examples/': { base: '/en/examples/', items: sidebarExamples() }
    },

    editLink: {
      pattern: 'https://github.com/chunhaofen/electron-infra-kit/edit/main/docs/:path',
      text: 'Edit this page on GitHub'
    },

    docFooter: {
      prev: 'Previous page',
      next: 'Next page'
    },

    outline: {
      label: 'On this page'
    },

    lastUpdated: {
      text: 'Last updated',
      formatOptions: {
        dateStyle: 'short',
        timeStyle: 'medium'
      }
    },

    returnToTopLabel: 'Return to top',
    sidebarMenuLabel: 'Menu',
    darkModeSwitchLabel: 'Appearance',
    lightModeSwitchTitle: 'Switch to light theme',
    darkModeSwitchTitle: 'Switch to dark theme'
  }
})

function nav(): DefaultTheme.NavItem[] {
  return [
    { text: 'Guide', link: '/en/guide/introduction', activeMatch: '/en/guide/' },
    { text: 'API Reference', link: '/en/api/', activeMatch: '/en/api/' },
    { text: 'Examples', link: '/en/examples/', activeMatch: '/en/examples/' },
    {
      text: 'Links',
      items: [
        { text: 'GitHub', link: 'https://github.com/chunhaofen/electron-infra-kit' },
        { text: 'npm', link: 'https://www.npmjs.com/package/electron-infra-kit' },
        { text: 'Live Demo', link: 'https://github.com/chunhaofen/electron-infra-showcase' },
        { text: 'Changelog', link: '/en/changelog' }
      ]
    }
  ]
}

function sidebarGuide(): DefaultTheme.SidebarItem[] {
  return [
    {
      text: 'Getting Started',
      collapsed: false,
      items: [
        { text: 'Introduction', link: 'introduction' },
        { text: 'Getting Started', link: 'getting-started' }
      ]
    },
    {
      text: 'Core Concepts',
      collapsed: false,
      items: [
        { text: 'Window Manager', link: 'core-concepts/window-manager' },
        { text: 'IPC Router', link: 'core-concepts/ipc-router' },
        { text: 'Message Bus', link: 'core-concepts/message-bus' },
        { text: 'Lifecycle', link: 'core-concepts/lifecycle' }
      ]
    },
    {
      text: 'Advanced Topics',
      collapsed: false,
      items: [
        { text: 'Type Safety', link: 'advanced/type-safety' },
        { text: 'Performance', link: 'advanced/performance' },
        { text: 'Error Handling', link: 'advanced/error-handling' },
        { text: 'Debugging', link: 'advanced/debugging' }
      ]
    },
    {
      text: 'Best Practices',
      link: 'best-practices'
    }
  ]
}

function sidebarAPI(): DefaultTheme.SidebarItem[] {
  return [
    {
      text: 'API Reference',
      items: [
        { text: 'Overview', link: 'index' },
        { text: 'WindowManager', link: 'window-manager' },
        { text: 'IpcRouter', link: 'ipc-router' },
        { text: 'MessageBus', link: 'message-bus' },
        { text: 'LifecycleManager', link: 'lifecycle' },
        { text: 'Config', link: 'config' },
        { text: 'Logger', link: 'logger' },
        { text: 'Debug', link: 'debug' },
        { text: 'Types', link: 'types' }
      ]
    }
  ]
}

function sidebarExamples(): DefaultTheme.SidebarItem[] {
  return [
    {
      text: 'Examples',
      items: [
        { text: 'Overview', link: 'index' },
        { text: 'Basic Setup', link: 'basic-setup' },
        { text: 'Multi-Window', link: 'multi-window' },
        { text: 'IPC Communication', link: 'ipc-communication' },
        { text: 'State Sync', link: 'state-sync' },
        { text: 'Complete App', link: 'complete-app' }
      ]
    }
  ]
}
