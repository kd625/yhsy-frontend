<template>
  <div class="im-chat-container">
    <!-- 连接状态 -->
    <div class="connection-status" :class="connectionStatusClass">
      <el-icon><Connection /></el-icon>
      <span>{{ connectionStatusText }}</span>
      <el-button 
        v-if="connectionState.status === 'DISCONNECTED'" 
        @click="connect" 
        size="small" 
        type="primary"
      >
        连接
      </el-button>
      <el-button 
        v-else-if="connectionState.status === 'CONNECTED'" 
        @click="disconnect" 
        size="small" 
        type="danger"
      >
        断开
      </el-button>
    </div>

    <!-- 会话列表 -->
    <div class="session-list">
      <h3>会话列表</h3>
      <el-empty v-if="sessions.length === 0" description="暂无会话" />
      <div v-else>
        <div 
          v-for="session in sessions" 
          :key="session.id"
          class="session-item"
          :class="{ active: currentSessionId === session.id }"
          @click="selectSession(session.id)"
        >
          <div class="session-info">
            <span class="session-name">会话 {{ session.id }}</span>
            <span class="session-time">{{ formatTime(session.createTime) }}</span>
          </div>
          <div class="session-meta">
            <span class="book-info">图书ID: {{ session.bookId }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 聊天区域 -->
    <div class="chat-area" v-if="currentSessionId">
      <!-- 消息列表 -->
      <div class="message-list" ref="messageListRef">
        <div 
          v-for="message in currentMessages" 
          :key="message.id"
          class="message-item"
          :class="{ 'own-message': message.fromUserId === currentUserId }"
        >
          <div class="message-avatar">
            <el-avatar :size="32">{{ message.fromUserId }}</el-avatar>
          </div>
          <div class="message-content">
            <div class="message-header">
              <span class="sender-name">用户 {{ message.fromUserId }}</span>
              <span class="message-time">{{ formatTime(message.createTime) }}</span>
            </div>
            <div class="message-body">
              <div v-if="message.messageType === 'text'" class="text-message">
                {{ message.content }}
              </div>
              <div v-else-if="message.messageType === 'image'" class="image-message">
                <el-image :src="message.content" fit="cover" />
              </div>
              <div v-else class="other-message">
                <el-tag>{{ message.messageType }}</el-tag>
                {{ message.content }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 消息输入 -->
      <div class="message-input">
        <el-input
          v-model="newMessage"
          type="textarea"
          :rows="3"
          placeholder="输入消息..."
          @keydown.ctrl.enter="sendMessage"
        />
        <div class="input-actions">
          <el-button @click="sendMessage" type="primary" :disabled="!newMessage.trim()">
            发送 (Ctrl+Enter)
          </el-button>
        </div>
      </div>
    </div>

    <!-- 创建会话对话框 -->
    <el-dialog v-model="showCreateSession" title="创建新会话" width="400px">
      <el-form :model="newSessionForm" label-width="80px">
        <el-form-item label="图书ID">
          <el-input-number v-model="newSessionForm.bookId" :min="1" />
        </el-form-item>
        <el-form-item label="买家ID">
          <el-input-number v-model="newSessionForm.buyerId" :min="1" />
        </el-form-item>
        <el-form-item label="卖家ID">
          <el-input-number v-model="newSessionForm.sellerId" :min="1" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateSession = false">取消</el-button>
        <el-button type="primary" @click="createSession">创建</el-button>
      </template>
    </el-dialog>

    <!-- 浮动操作按钮 -->
    <el-button 
      class="fab" 
      type="primary" 
      circle 
      @click="showCreateSession = true"
      :icon="Plus"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Connection, Plus } from '@element-plus/icons-vue'
import { IMClient } from '../client/IMClient'
import type { 
  IMClientConfig, 
  ChatSendToOneRequest, 
  ChatReceivedMessage,
  SessionVO,
  ConnectionState
} from '../types'

// Props
interface Props {
  config: IMClientConfig
}

const props = defineProps<Props>()

// 响应式数据
const imClient = ref<IMClient | null>(null)
const connectionState = ref<ConnectionState>({
  status: 'DISCONNECTED',
  reconnectAttempts: 0
})
const sessions = ref<SessionVO[]>([])
const currentSessionId = ref<number | null>(null)
const messages = ref<Map<number, ChatReceivedMessage[]>>(new Map())
const newMessage = ref('')
const showCreateSession = ref(false)
const messageListRef = ref<HTMLElement>()

// 表单数据
const newSessionForm = reactive({
  bookId: 1,
  buyerId: props.config.userId,
  sellerId: 1
})

// 计算属性
const currentUserId = computed(() => props.config.userId)

const connectionStatusClass = computed(() => {
  switch (connectionState.value.status) {
    case 'CONNECTED':
      return 'status-connected'
    case 'CONNECTING':
      return 'status-connecting'
    case 'DISCONNECTED':
      return 'status-disconnected'
    default:
      return 'status-error'
  }
})

const connectionStatusText = computed(() => {
  switch (connectionState.value.status) {
    case 'CONNECTED':
      return '已连接'
    case 'CONNECTING':
      return '连接中...'
    case 'DISCONNECTED':
      return '未连接'
    default:
      return '连接错误'
  }
})

const currentMessages = computed(() => {
  if (!currentSessionId.value) return []
  return messages.value.get(currentSessionId.value) || []
})

// 方法
const initIMClient = () => {
  imClient.value = new IMClient(props.config)
  
  // 设置事件回调
  imClient.value.setCallbacks({
    connected: () => {
      connectionState.value = imClient.value!.getConnectionState()
      ElMessage.success('IM连接成功')
    },
    
    disconnected: () => {
      connectionState.value = imClient.value!.getConnectionState()
      ElMessage.warning('IM连接已断开')
    },
    
    authenticated: () => {
      ElMessage.success('IM认证成功')
      loadSessions()
    },
    
    messageReceived: (message: ChatReceivedMessage) => {
      // 添加消息到对应会话
      const sessionMessages = messages.value.get(message.sessionId) || []
      sessionMessages.push(message)
      messages.value.set(message.sessionId, sessionMessages)
      
      // 滚动到底部
      nextTick(() => {
        scrollToBottom()
      })
      
      // 显示通知
      if (message.fromUserId !== currentUserId.value) {
        ElMessage.info(`收到来自用户${message.fromUserId}的消息`)
      }
    },
    
    messageSent: () => {
      ElMessage.success('消息发送成功')
      newMessage.value = ''
    },
    
    messageFailed: (error: any) => {
      ElMessage.error(`消息发送失败: ${error.message}`)
    },
    
    error: (error: any) => {
      ElMessage.error(`IM错误: ${error.message}`)
      connectionState.value = imClient.value!.getConnectionState()
    }
  })
}

const connect = async () => {
  if (!imClient.value) return
  
  try {
    connectionState.value.status = 'CONNECTING'
    await imClient.value.connect()
  } catch (error: any) {
    ElMessage.error(`连接失败: ${error.message}`)
    connectionState.value = imClient.value.getConnectionState()
  }
}

const disconnect = async () => {
  if (!imClient.value) return
  
  try {
    await imClient.value.disconnect()
  } catch (error: any) {
    ElMessage.error(`断开连接失败: ${error.message}`)
  }
}

const loadSessions = () => {
  // 获取所有缓存的会话
  if (imClient.value) {
    sessions.value = imClient.value.getAllCachedSessions()
  }
}

const selectSession = (sessionId: number) => {
  currentSessionId.value = sessionId
  
  // 如果没有该会话的消息，初始化空数组
  if (!messages.value.has(sessionId)) {
    messages.value.set(sessionId, [])
  }
  
  nextTick(() => {
    scrollToBottom()
  })
}

const createSession = async () => {
  if (!imClient.value) return
  
  try {
    const session = await imClient.value.getOrCreateSession(
      newSessionForm.bookId,
      newSessionForm.buyerId,
      newSessionForm.sellerId
    )
    
    sessions.value.push(session)
    showCreateSession.value = false
    selectSession(session.id)
    
    ElMessage.success('会话创建成功')
  } catch (error: any) {
    ElMessage.error(`创建会话失败: ${error.message}`)
  }
}

const sendMessage = async () => {
  if (!imClient.value || !currentSessionId.value || !newMessage.value.trim()) {
    return
  }
  
  // 找到当前会话的对方用户ID
  const currentSession = sessions.value.find(s => s.id === currentSessionId.value)
  if (!currentSession) {
    ElMessage.error('找不到当前会话信息')
    return
  }
  
  const toUserId = currentSession.buyerId === currentUserId.value 
    ? currentSession.sellerId 
    : currentSession.buyerId
  
  const messageRequest: ChatSendToOneRequest = {
    toUserId,
    content: newMessage.value.trim(),
    messageType: 'text'
  }
  
  try {
    await imClient.value.sendMessage(messageRequest)
  } catch (error: any) {
    ElMessage.error(`发送消息失败: ${error.message}`)
  }
}

const scrollToBottom = () => {
  if (messageListRef.value) {
    messageListRef.value.scrollTop = messageListRef.value.scrollHeight
  }
}

const formatTime = (timestamp: string) => {
  return new Date(timestamp).toLocaleString()
}

// 监听连接状态变化
watch(() => connectionState.value.status, (newStatus) => {
  if (newStatus === 'CONNECTED') {
    loadSessions()
  }
})

// 生命周期
onMounted(() => {
  initIMClient()
})

onUnmounted(() => {
  if (imClient.value) {
    imClient.value.destroy()
  }
})

// 暴露方法给父组件
defineExpose({
  connect,
  disconnect,
  sendMessage: (content: string, toUserId: number) => {
    if (imClient.value) {
      return imClient.value.sendMessage({
        toUserId,
        content,
        messageType: 'text'
      })
    }
  },
  getConnectionState: () => connectionState.value,
  getSessions: () => sessions.value
})
</script>

<style scoped>
.im-chat-container {
  display: flex;
  flex-direction: column;
  height: 600px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
}

.status-connected {
  color: #67c23a;
}

.status-connecting {
  color: #e6a23c;
}

.status-disconnected {
  color: #f56c6c;
}

.status-error {
  color: #f56c6c;
}

.session-list {
  flex: 0 0 200px;
  border-bottom: 1px solid #e4e7ed;
  overflow-y: auto;
}

.session-list h3 {
  margin: 0;
  padding: 12px 16px;
  font-size: 14px;
  color: #606266;
  background: #fafafa;
  border-bottom: 1px solid #e4e7ed;
}

.session-item {
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background-color 0.2s;
}

.session-item:hover {
  background: #f5f7fa;
}

.session-item.active {
  background: #ecf5ff;
  border-left: 3px solid #409eff;
}

.session-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.session-name {
  font-weight: 500;
  color: #303133;
}

.session-time {
  font-size: 12px;
  color: #909399;
}

.session-meta {
  font-size: 12px;
  color: #909399;
}

.chat-area {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.message-list {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  background: #fafafa;
}

.message-item {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.message-item.own-message {
  flex-direction: row-reverse;
}

.message-item.own-message .message-content {
  text-align: right;
}

.message-item.own-message .message-body {
  background: #409eff;
  color: white;
}

.message-content {
  flex: 1;
  max-width: 70%;
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.sender-name {
  font-size: 12px;
  color: #909399;
  font-weight: 500;
}

.message-time {
  font-size: 12px;
  color: #c0c4cc;
}

.message-body {
  background: white;
  padding: 8px 12px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.text-message {
  word-break: break-word;
  line-height: 1.4;
}

.image-message {
  max-width: 200px;
}

.other-message {
  display: flex;
  align-items: center;
  gap: 8px;
}

.message-input {
  padding: 16px;
  border-top: 1px solid #e4e7ed;
  background: white;
}

.input-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}

.fab {
  position: absolute;
  bottom: 20px;
  right: 20px;
  z-index: 10;
}

@media (max-width: 768px) {
  .im-chat-container {
    height: 100vh;
  }
  
  .session-list {
    flex: 0 0 150px;
  }
  
  .message-content {
    max-width: 85%;
  }
}
</style>