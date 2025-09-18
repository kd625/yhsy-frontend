<template>
  <div class="chat-window" v-if="visible">
    <div class="chat-header">
      <div class="chat-title">
        <span>与用户聊天</span>
        <span class="book-info" v-if="bookInfo">关于《{{ bookInfo.bookName }}》</span>
      </div>
      <div class="chat-actions">
        <el-button 
          type="text" 
          @click="minimizeChat"
          :icon="Minus"
          size="small"
        />
        <el-button 
          type="text" 
          @click="closeChat"
          :icon="Close"
          size="small"
        />
      </div>
    </div>

    <div class="chat-body">
      <div class="message-list" ref="messageListRef">
        <div 
          v-for="message in messages" 
          :key="message.id"
          :class="['message-item', { 'self': message.isSelf }]"
        >
          <div class="message-content">
            <div class="message-text">{{ message.content }}</div>
            <div class="message-time">
              {{ formatTime(message.timestamp) }}
              <span 
                v-if="message.isSelf" 
                :class="['message-status', message.status]"
              >
                <el-icon v-if="message.status === 'sending'"><Loading /></el-icon>
                <el-icon v-else-if="message.status === 'sent'"><Check /></el-icon>
                <el-icon v-else-if="message.status === 'failed'"><Close /></el-icon>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="message-input">
        <el-input
          v-model="inputMessage"
          type="textarea"
          :rows="3"
          placeholder="输入消息..."
          @keydown.enter.prevent="handleSendMessage"
          :disabled="!canSendMessage"
        />
        <div class="input-actions">
          <el-button 
            type="primary" 
            @click="handleSendMessage"
            :disabled="!canSendMessage || !inputMessage.trim()"
            :loading="sending"
          >
            发送
          </el-button>
        </div>
      </div>
    </div>

    <div class="connection-status" v-if="!isConnected">
      <el-alert
        title="连接已断开"
        type="warning"
        :closable="false"
        show-icon
      >
        <template #default>
          正在尝试重新连接... 
          <el-button type="text" @click="handleReconnect">手动重连</el-button>
        </template>
      </el-alert>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Close, Minus, Loading, Check } from '@element-plus/icons-vue'
import { useIMStore } from '../store/imStore'
import type { ChatMessage } from '../store/imStore'

interface Props {
  visible: boolean
  userId: number
  bookId: number
  bookInfo?: {
    bookName: string
    bookAuthor?: string
  }
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'minimize'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const imStore = useIMStore()
const messageListRef = ref<HTMLElement>()
const inputMessage = ref('')
const sending = ref(false)

// 计算属性
const isConnected = computed(() => imStore.isConnected)
const isAuthenticated = computed(() => imStore.isAuthenticated)
const canSendMessage = computed(() => isConnected.value && isAuthenticated.value)
const currentSession = computed(() => {
  if (props.userId && props.bookId) {
    return imStore.createOrGetSession(props.userId, props.bookId)
  }
  return null
})
const messages = computed(() => currentSession.value?.messages || [])

// 监听消息变化，自动滚动到底部
watch(messages, () => {
  nextTick(() => {
    scrollToBottom()
  })
}, { deep: true })

// 监听窗口显示状态
watch(() => props.visible, (visible) => {
  if (visible && props.userId && props.bookId) {
    // 设置当前会话
    imStore.setCurrentSession(props.userId, props.bookId)
    nextTick(() => {
      scrollToBottom()
    })
  }
})

// 组件挂载时初始化
onMounted(async () => {
  try {
    if (!imStore.isInitialized) {
      await imStore.initClient()
    }
  } catch (error) {
    console.error('初始化IM客户端失败:', error)
    ElMessage.error('聊天功能初始化失败')
  }
})

// 组件卸载时清理
onUnmounted(() => {
  // 这里可以添加清理逻辑
})

/**
 * 发送消息
 */
const handleSendMessage = async (): Promise<void> => {
  const message = inputMessage.value.trim()
  if (!message || !canSendMessage.value) {
    return
  }

  if (!props.userId || !props.bookId) {
    ElMessage.error('会话信息不完整')
    return
  }

  try {
    sending.value = true
    await imStore.sendMessage(props.userId, message, props.bookId)
    inputMessage.value = ''
  } catch (error) {
    console.error('发送消息失败:', error)
    ElMessage.error('发送消息失败')
  } finally {
    sending.value = false
  }
}

/**
 * 关闭聊天窗口
 */
const closeChat = (): void => {
  emit('update:visible', false)
}

/**
 * 最小化聊天窗口
 */
const minimizeChat = (): void => {
  emit('minimize')
}

/**
 * 手动重连
 */
const handleReconnect = async (): Promise<void> => {
  try {
    await imStore.initClient()
    ElMessage.success('重连成功')
  } catch (error) {
    console.error('重连失败:', error)
    ElMessage.error('重连失败')
  }
}

/**
 * 滚动到底部
 */
const scrollToBottom = (): void => {
  if (messageListRef.value) {
    messageListRef.value.scrollTop = messageListRef.value.scrollHeight
  }
}

/**
 * 格式化时间
 */
const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  if (diff < 60000) { // 1分钟内
    return '刚刚'
  } else if (diff < 3600000) { // 1小时内
    return `${Math.floor(diff / 60000)}分钟前`
  } else if (date.toDateString() === now.toDateString()) { // 今天
    return date.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  } else {
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
}
</script>

<style scoped>
.chat-window {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 400px;
  height: 500px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  z-index: 1000;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #e4e7ed;
  background: #f5f7fa;
  border-radius: 8px 8px 0 0;
}

.chat-title {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.chat-title span:first-child {
  font-weight: 500;
  color: #303133;
}

.book-info {
  font-size: 12px;
  color: #909399;
}

.chat-actions {
  display: flex;
  gap: 4px;
}

.chat-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.message-list {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message-item {
  display: flex;
  justify-content: flex-start;
}

.message-item.self {
  justify-content: flex-end;
}

.message-content {
  max-width: 70%;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.message-text {
  padding: 8px 12px;
  border-radius: 12px;
  background: #f0f0f0;
  color: #303133;
  word-wrap: break-word;
}

.message-item.self .message-text {
  background: #409eff;
  color: white;
}

.message-time {
  font-size: 11px;
  color: #c0c4cc;
  display: flex;
  align-items: center;
  gap: 4px;
}

.message-item.self .message-time {
  justify-content: flex-end;
}

.message-status {
  display: inline-flex;
  align-items: center;
}

.message-status.sending {
  color: #909399;
}

.message-status.sent {
  color: #67c23a;
}

.message-status.failed {
  color: #f56c6c;
}

.message-input {
  padding: 16px;
  border-top: 1px solid #e4e7ed;
}

.input-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}

.connection-status {
  padding: 8px 16px;
  border-top: 1px solid #e4e7ed;
}

/* 滚动条样式 */
.message-list::-webkit-scrollbar {
  width: 4px;
}

.message-list::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.message-list::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 2px;
}

.message-list::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>