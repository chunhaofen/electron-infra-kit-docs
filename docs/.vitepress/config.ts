import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'
import { zhConfig } from './config/zh'
import { enConfig } from './config/en'

// https://vitepress.dev/reference/site-config
export default withMermaid(defineConfig({
  title: 'electron-infra-kit',
  description: 'A comprehensive infrastructure toolkit for Electron applications',
  base: '/electron-infra-kit-docs/',
  
  // Vite configuration to fix mermaid dependencies
  vite: {
    optimizeDeps: {
      include: ['mermaid'],
      exclude: ['@mermaid-js/mermaid-mindmap']
    },
    ssr: {
      noExternal: ['mermaid']
    }
  },
  
  // Multi-language support
  locales: {
    root: {
      label: '简体中文',
      lang: 'zh-CN',
      link: '/',
      ...zhConfig
    },
    en: {
      label: 'English',
      lang: 'en-US',
      link: '/en/',
      ...enConfig
    }
  },
  
  // Rewrite paths to map zh folder to root
  rewrites: {
    'zh/:rest*': ':rest*'
  },

  // Markdown configuration
  markdown: {
    lineNumbers: true,
    theme: {
      light: 'github-light',
      dark: 'github-dark'
    }
  },

  // Mermaid configuration
  mermaid: {
    // Configure mermaid theme to match VitePress theme
    theme: 'default',
    themeVariables: {
      primaryColor: '#646cff',
      primaryTextColor: '#fff',
      primaryBorderColor: '#646cff',
      lineColor: '#646cff',
      secondaryColor: '#f6f8fa',
      tertiaryColor: '#f6f8fa'
    }
  },

  // Theme configuration
  themeConfig: {
    logo: '/logo.svg',
    
    socialLinks: [
      { icon: 'github', link: 'https://github.com/chunhaofen/electron-infra-kit' },
      { icon: 'npm', link: 'https://www.npmjs.com/package/electron-infra-kit' }
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024-present electron-infra-kit'
    },

    // Search configuration
    search: {
      provider: 'local',
      options: {
        locales: {
          root: {
            translations: {
              button: {
                buttonText: '搜索文档',
                buttonAriaLabel: '搜索文档'
              },
              modal: {
                noResultsText: '无法找到相关结果',
                resetButtonTitle: '清除查询条件',
                footer: {
                  selectText: '选择',
                  navigateText: '切换',
                  closeText: '关闭'
                }
              }
            }
          },
          en: {
            translations: {
              button: {
                buttonText: 'Search',
                buttonAriaLabel: 'Search'
              },
              modal: {
                noResultsText: 'No results found',
                resetButtonTitle: 'Clear query',
                footer: {
                  selectText: 'to select',
                  navigateText: 'to navigate',
                  closeText: 'to close'
                }
              }
            }
          }
        }
      }
    }
  }
}))
