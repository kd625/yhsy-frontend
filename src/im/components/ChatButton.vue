<template>
  <el-button
    type="primary"
    :icon="ChatDotRound"
    @click="handleStartChat"
    :loading="loading"
    :disabled="disabled"
  >
    {{ buttonText }}
  </el-button>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { ChatDotRound } from '@element-plus/icons-vue'
import { useUserStore } from '@/store/modules/user'
import { useRouter } from 'vue-router'
import { getOrCreateSession } from '../api/session'
import { IMClient } from '../client/IMClient'
import type { SessionVO } from '../api/session'
import type { IMClientConfig } from '../types'

interface Props {
  /** 卖家用户ID */
  sellerId: number
  /** 买家用户ID */
  buyerId?: number
  /** 图书ID */
  bookId: number
  /** 按钮文本 */
  buttonText?: string
  /** 是否禁用 */
  disabled?: boolean
}

interface Emits {
  (e: 'chat-start', session: SessionVO): void
  (e: 'error', error: Error): void
}

const props = withDefaults(defineProps<Props>(), {
  buttonText: '聊一聊',
  disabled: false
})

const emit = defineEmits<Emits>()

const userStore = useUserStore()
const router = useRouter()
const loading = ref(false)

// 计算属性
const canChat = computed(() => {
  // 检查用户是否登录
  if (!userStore.isLogin) {
    return false
  }
  
  // 检查是否是自己的图书
  if (userStore.userInfo?.id === props.sellerId) {
    return false
  }
  
  return true
})

  // 连接到聊天
  const connectToChat = async (session: any) => {
    try {
      console.log('开始建立WebSocket连接...', session)
      
      // 获取当前用户信息
      const userStore = useUserStore()
      if (!userStore.userInfo) {
        throw new Error('用户信息不存在')
      }

      // 创建IM客户端配置
      const config: IMClientConfig = {
        wsUrl: 'ws://localhost:8080/ws',
        token: userStore.token || '',
        userId: userStore.userInfo.id,
        heartbeat: {
          interval: 30000,
          timeout: 5000
        },
        reconnect: {
          maxRetries: 5,
          initialDelay: 1000,
          maxDelay: 5000
        }
      }

      // 创建IM客户端实例
      const imClient = new IMClient(config)
      
      // 连接WebSocket
      await imClient.connect()
      
      console.log('WebSocket连接成功')
      
      // 跳转到聊天页面，并传递会话信息
      const router = useRouter()
      await router.push({
        name: 'Chat',
        query: {
          sessionId: session.id,
          bookId: props.bookId.toString()
        }
      })
      
    } catch (error) {
      console.error('WebSocket连接失败:', error)
      ElMessage.error('连接聊天服务失败')
      throw error
    }
  }

/**
 * 处理开始聊天
 */
const handleStartChat = async (): Promise<void> => {
  if (!canChat.value) {
    if (!userStore.isLogin) {
      ElMessage.warning('请先登录')
      return
    }
    
    if (userStore.userInfo?.id === props.sellerId) {
      ElMessage.warning('不能与自己聊天')
      return
    }
    
    return
  }

  if (!props.sellerId || !props.bookId) {
    ElMessage.error('参数不完整')
    return
  }

  // 确定买家ID和卖家ID
  const buyerId = props.buyerId || userStore.userInfo?.id
  if (!buyerId) {
    ElMessage.error('无法确定买家信息')
    return
  }

  try {
    loading.value = true
    
    // 使用新的getOrCreateSession方法
    const session = await getOrCreateSession(props.bookId, buyerId, props.sellerId)
    
    // 触发聊天开始事件，传递会话信息
    emit('chat-start', session)
    
    // 建立WebSocket连接并进入单聊界面
    await connectToChat(session)
    
  } catch (error) {
    console.error('创建会话失败:', error)
    ElMessage.error('创建会话失败，请稍后重试')
    emit('error', error as Error)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
/* 这里可以添加自定义样式 */
</style>