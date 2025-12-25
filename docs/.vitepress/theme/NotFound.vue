<template>
  <div class="NotFound">
    <div class="container">
      <div class="content">
        <h1 class="title">404</h1>
        <p class="quote">{{ quote }}</p>
        <p class="description">{{ description }}</p>
        
        <div class="actions">
          <a :href="homeLink" class="action primary">
            {{ homeText }}
          </a>
          <button @click="goBack" class="action secondary">
            {{ backText }}
          </button>
        </div>

        <div class="suggestions">
          <p class="suggestions-title">{{ suggestionsTitle }}</p>
          <ul class="suggestions-list">
            <li v-for="link in suggestions" :key="link.link">
              <a :href="link.link">{{ link.text }}</a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'

const { lang } = useData()

const isZh = computed(() => lang.value === 'zh-CN')

const quote = computed(() => 
  isZh.value 
    ? '页面走丢了...' 
    : 'Page Not Found'
)

const description = computed(() => 
  isZh.value 
    ? '抱歉，您访问的页面不存在。可能是链接已失效，或者页面已被移动。'
    : 'Sorry, the page you are looking for does not exist. The link may be broken or the page may have been moved.'
)

const homeText = computed(() => 
  isZh.value ? '返回首页' : 'Back to Home'
)

const backText = computed(() => 
  isZh.value ? '返回上一页' : 'Go Back'
)

const suggestionsTitle = computed(() => 
  isZh.value ? '您可能想访问：' : 'You might want to visit:'
)

const homeLink = computed(() => 
  isZh.value ? '/' : '/en/'
)

const suggestions = computed(() => 
  isZh.value 
    ? [
        { text: '快速开始', link: '/guide/getting-started' },
        { text: 'API 参考', link: '/api/' },
        { text: '示例代码', link: '/examples/' },
        { text: '核心概念', link: '/guide/core-concepts/window-manager' }
      ]
    : [
        { text: 'Getting Started', link: '/en/guide/getting-started' },
        { text: 'API Reference', link: '/en/api/' },
        { text: 'Examples', link: '/en/examples/' },
        { text: 'Core Concepts', link: '/en/guide/core-concepts/window-manager' }
      ]
)

function goBack() {
  if (typeof window !== 'undefined') {
    window.history.back()
  }
}
</script>

<style scoped>
.NotFound {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--vp-c-bg);
}

.container {
  max-width: 640px;
  width: 100%;
  text-align: center;
}

.content {
  padding: 48px 24px;
}

.title {
  font-size: 120px;
  font-weight: 800;
  line-height: 1;
  margin: 0;
  background: linear-gradient(120deg, var(--vp-c-brand-1), var(--vp-c-brand-2));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: fadeInUp 0.6s ease-out;
}

.quote {
  font-size: 24px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  margin: 24px 0;
  animation: fadeInUp 0.6s ease-out 0.1s both;
}

.description {
  font-size: 16px;
  color: var(--vp-c-text-2);
  line-height: 1.6;
  margin: 16px 0 32px;
  animation: fadeInUp 0.6s ease-out 0.2s both;
}

.actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
  animation: fadeInUp 0.6s ease-out 0.3s both;
}

.action {
  display: inline-block;
  padding: 12px 32px;
  font-size: 16px;
  font-weight: 500;
  border-radius: 8px;
  text-decoration: none;
  transition: all 0.3s;
  cursor: pointer;
  border: none;
  font-family: inherit;
}

.action.primary {
  background: var(--vp-c-brand-1);
  color: var(--vp-c-white);
}

.action.primary:hover {
  background: var(--vp-c-brand-2);
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
}

.action.secondary {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  border: 1px solid var(--vp-c-divider);
}

.action.secondary:hover {
  background: var(--vp-c-bg-mute);
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.05);
}

.suggestions {
  margin-top: 48px;
  padding-top: 32px;
  border-top: 1px solid var(--vp-c-divider);
  animation: fadeInUp 0.6s ease-out 0.4s both;
}

.suggestions-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--vp-c-text-2);
  margin-bottom: 16px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.suggestions-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.suggestions-list li a {
  display: block;
  padding: 12px 16px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  color: var(--vp-c-brand-1);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s;
}

.suggestions-list li a:hover {
  background: var(--vp-c-brand-1);
  color: var(--vp-c-white);
  border-color: var(--vp-c-brand-1);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 640px) {
  .title {
    font-size: 80px;
  }

  .quote {
    font-size: 20px;
  }

  .description {
    font-size: 14px;
  }

  .actions {
    flex-direction: column;
  }

  .action {
    width: 100%;
  }

  .suggestions-list {
    grid-template-columns: 1fr;
  }
}
</style>
