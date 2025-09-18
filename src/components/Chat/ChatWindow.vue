<template>
  <div class="chat-window">
    <!-- 聊天头部 -->
    <div class="chat-header">
      <div class="chat-title">
        <span>{{ `会话 #${sessionInfo?.id}` || '聊天' }}</span>
        <el-tag v-if="connectionStatus" :type="connectionStatus === 'CONNECTED' ? 'success' : 'warning'" size="small">
          {{ getConnectionStatusText(connectionStatus) }}
        </el-tag>
      </div>
      <el-button @click="$emit('close')" type="text" size="small">
        <el-icon><Close /></el-icon>
      </el-button>
    </div>

    <!-- 消息列表 -->
    <div class="message-list" ref="messageListRef">
      <div
        v-for="(message, index) in messages"
        :key="`${message.timestamp}-${index}`"
        :class="['message-item', { 'own-message': message.fromUserId === currentUserId }]"
      >
        <div class="message-content">
          <div class="message-text">{{ message.content }}</div>
          <div class="message-time">{{ formatTime(message.timestamp) }}</div>
        </div>
      </div>
      
      <!-- 空状态 -->
      <div v-if="messages.length === 0" class="empty-state">
        <el-empty description="暂无消息" />
      </div>
    </div>

    <!-- 消息输入框 -->
    <div class="message-input">
      <el-input
        v-model="inputMessage"
        type="textarea"
        :rows="3"
        placeholder="输入消息..."
        @keydown.enter.prevent="handleSendMessage"
        :disabled="!isConnected"
      />
      <div class="input-actions">
        <el-button 
          type="primary" 
          @click="handleSendMessage"
          :loading="sending"
          :disabled="!inputMessage.trim() || !isConnected"
        >
          发送
        </el-button>
      </div>
    </div>

    <!-- 连接状态提示 -->
    <div v-if="!isConnected" class="connection-warning">
      <el-alert
        title="连接已断开，正在重连..."
        type="warning"
        :closable="false"
        show-icon
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Close } from '@element-plus/icons-vue'
import { IMClient } from '../../im/client/IMClient'
import type { ChatReceivedMessage, SessionVO, ConnectionStatusType } from '../../im/types'

interface Props {
  sessionInfo: SessionVO | null
  currentUserId: number
  imClient: IMClient | null
}

interface Emits {
  (e: 'close'): void
  (e: 'error', error: any): void
}

// 扩展消息类型，添加必要字段
interface DisplayMessage extends ChatReceivedMessage {
  fromUserId: number
  toUserId: number
  messageType: string
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 响应式数据
const messages = ref<DisplayMessage[]>([])
const inputMessage = ref('')
const sending = ref(false)
const messageListRef = ref<HTMLElement>()
const connectionStatus = ref<ConnectionStatusType>()

// 计算属性
const isConnected = computed(() => {
  return connectionStatus.value === 'CONNECTED'
})

// 方法
const handleSendMessage = async () => {
  if (!inputMessage.value.trim() || !props.imClient || !props.sessionInfo) {
    return
  }

  try {
    sending.value = true
    
    await props.imClient.sendMessage({
      toUserId: getTargetUserId(),
      content: inputMessage.value.trim(),
      messageType: 'text'
    })

    // 添加到本地消息列表（发送的消息）
    const sentMessage: DisplayMessage = {
      content: inputMessage.value.trim(),
      fromUser: props.currentUserId,
      fromUserId: props.currentUserId,
      toUserId: getTargetUserId(),
      messageType: 'text',
      timestamp: Date.now()
    }
    
    messages.value.push(sentMessage)
    inputMessage.value = ''
    
    // 滚动到底部
    await nextTick()
    scrollToBottom()
    
  } catch (error) {
    console.error('发送消息失败:', error)
    ElMessage.error('发送消息失败')
    emit('error', error)
  } finally {
    sending.value = false
  }
}

const getTargetUserId = (): number => {
  if (!props.sessionInfo) return 0
  
  // 如果当前用户是买家，目标用户是卖家，反之亦然
  return props.currentUserId === props.sessionInfo.buyerId 
    ? props.sessionInfo.sellerId 
    : props.sessionInfo.buyerId
}

const scrollToBottom = () => {
  if (messageListRef.value) {
    messageListRef.value.scrollTop = messageListRef.value.scrollHeight
  }
}

const formatTime = (timestamp?: number): string => {
  if (!timestamp) return ''
  
  const date = new Date(timestamp)
  const now = new Date()
  
  // 如果是今天，只显示时间
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }
  
  // 否则显示日期和时间
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getConnectionStatusText = (status: ConnectionStatusType): string => {
  const statusMap = {
    'DISCONNECTED': '已断开',
    'CONNECTING': '连接中',
    'CONNECTED': '已连接',
    'AUTHENTICATED': '已认证',
    'RECONNECTING': '重连中'
  }
  return statusMap[status] || '未知'
}

// 生命周期
onMounted(() => {
  if (props.imClient) {
    // 设置事件回调
    props.imClient.setCallbacks({
      messageReceived: (message: ChatReceivedMessage) => {
        // 转换消息格式
        const displayMessage: DisplayMessage = {
          ...message,
          fromUserId: message.fromUser || 0,
          toUserId: props.currentUserId,
          messageType: 'text'
        }
        
        // 只接收当前会话相关的消息
        if (props.sessionInfo) {
          messages.value.push(displayMessage)
          nextTick(() => scrollToBottom())
        }
      },
      connected: () => {
        connectionStatus.value = 'CONNECTED'
      },
      disconnected: () => {
        connectionStatus.value = 'DISCONNECTED'
      },
      error: (error) => {
        console.error('IM连接错误:', error)
        emit('error', error)
      }
    })

    // 获取当前连接状态
    const state = props.imClient.getConnectionState()
    connectionStatus.value = state.status
  }
})

// 监听会话变化，清空消息列表
watch(() => props.sessionInfo, () => {
  messages.value = []
})
</script>

<style scoped>
.chat-window {
  display: flex;
  flex-direction: column;
  height: 600px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  background: #fff;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #e4e7ed;
  background: #f5f7fa;
}

.chat-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}

.message-list {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  background: #fafafa;
}

.message-item {
  margin-bottom: 16px;
  display: flex;
}

.message-item.own-message {
  justify-content: flex-end;
}

.message-content {
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.own-message .message-content {
  background: #409eff;
  color: #fff;
}

.message-text {
  word-break: break-word;
  line-height: 1.5;
}

.message-time {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
  text-align: right;
}

.own-message .message-time {
  color: rgba(255, 255, 255, 0.8);
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
}

.message-input {
  padding: 16px;
  border-top: 1px solid #e4e7ed;
  background: #fff;
}

.input-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}

.connection-warning {
  padding: 8px 16px;
}

/* 滚动条样式 */
.message-list::-webkit-scrollbar {
  width: 6px;
}

.message-list::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.message-list::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.message-list::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>