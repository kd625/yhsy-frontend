import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import pinia from './store'
import { useUserStore } from './store/modules/user'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

const app = createApp(App)

// 注册Element Plus图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(pinia)
app.use(router)
app.use(ElementPlus)

// 初始化应用
async function initApp() {
  // 初始化用户认证状态
  const userStore = useUserStore()
  try {
    await userStore.initializeAuth()
  } catch (error) {
    console.error('初始化用户认证状态失败:', error)
  }
  
  // 挂载应用
  app.mount('#app')
}

// 启动应用
initApp()
