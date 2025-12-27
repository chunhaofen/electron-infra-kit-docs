import DefaultTheme from 'vitepress/theme'
import { h, onMounted, watch, nextTick } from 'vue'
import { useRoute } from 'vitepress'
import mermaid from 'mermaid'
import NotFound from './NotFound.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  Layout: () => {
    return h(DefaultTheme.Layout, null, {
      // 使用自定义的 404 页面
      'not-found': () => h(NotFound)
    })
  },
  setup() {
    const route = useRoute()
    
    const initMermaid = () => {
      mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        themeVariables: {
          primaryColor: '#646cff',
          primaryTextColor: '#333',
          primaryBorderColor: '#646cff',
          lineColor: '#666',
          secondaryColor: '#f6f8fa',
          tertiaryColor: '#e9ecef'
        },
        flowchart: {
          useMaxWidth: true,
          htmlLabels: true,
          curve: 'basis'
        },
        sequence: {
          useMaxWidth: true,
          wrap: true
        }
      })
    }

    const renderMermaid = async () => {
      await nextTick()
      const mermaidElements = document.querySelectorAll('pre code.language-mermaid')
      
      for (let i = 0; i < mermaidElements.length; i++) {
        const element = mermaidElements[i] as HTMLElement
        const preElement = element.parentElement as HTMLElement
        
        // 获取原始代码内容，保持换行符
        let code = element.textContent || ''
        
        // 清理代码，移除多余的空白但保留换行
        code = code.trim()
        
        // 跳过已经处理过的元素
        if (preElement.classList.contains('mermaid-processed')) {
          continue
        }
        
        try {
          const { svg } = await mermaid.render(`mermaid-${Date.now()}-${i}`, code)
          const wrapper = document.createElement('div')
          wrapper.className = 'mermaid-wrapper'
          wrapper.innerHTML = svg
          
          // 标记为已处理
          preElement.classList.add('mermaid-processed')
          
          // 替换整个 pre 元素
          if (preElement.parentNode) {
            preElement.parentNode.replaceChild(wrapper, preElement)
          }
        } catch (error) {
          console.error('Mermaid rendering error:', error)
          console.error('Code content:', JSON.stringify(code))
          
          // 显示错误信息
          const errorDiv = document.createElement('div')
          errorDiv.className = 'mermaid-error'
          errorDiv.innerHTML = `<p><strong>Mermaid 渲染错误:</strong> ${error instanceof Error ? error.message : String(error)}</p><details><summary>查看代码</summary><pre>${code}</pre></details>`
          
          if (preElement.parentNode) {
            preElement.parentNode.insertBefore(errorDiv, preElement)
          }
        }
      }
    }

    onMounted(() => {
      initMermaid()
      renderMermaid()
    })

    watch(
      () => route.path,
      () => {
        nextTick(() => {
          renderMermaid()
        })
      }
    )
  }
}