<template>
  <div class="chat-container">
    <!-- 左侧会话列表 -->
    <div class="session-list">
      <div class="session-header">
        <h3>聊天列表</h3>
      </div>
      <div class="session-items">
        <div 
          v-for="session in conversationList" 
          :key="session.userId"
          class="session-item"
          :class="{ active: currentSessionId === session.userId }"
          @click="selectSession(session.userId)"
        >
          <div class="session-avatar">
            <el-avatar :src="session.userAvatar" :size="40">
              {{ session.userName?.charAt(0) || '用' }}
            </el-avatar>
          </div>
          <div class="session-info">
            <div class="session-name">{{ session.userName || `用户${session.userId}` }}</div>
            <div class="session-last-message">
              {{ session.lastMessage?.content || '暂无消息' }}
            </div>
            <div class="session-time">
              {{ formatTime(session.lastActiveTime) }}
            </div>
          </div>
          <div class="session-badge" v-if="session.unreadCount > 0">
            {{ session.unreadCount }}
          </div>
        </div>
      </div>
    </div>

    <!-- 右侧聊天窗口 -->
    <div class="chat-window">
      <div v-if="!currentSessionId" class="empty-chat">
        <div class="empty-content">
          <el-icon size="64" color="#c0c4cc">
            <ChatDotRound />
          </el-icon>
          <p>请选择一个会话开始聊天</p>
        </div>
      </div>

      <div v-else class="chat-content">
        <!-- 聊天头部 -->
        <div class="chat-header">
          <div class="chat-user-info">
            <el-avatar :src="currentConversation?.userAvatar" :size="32">
              {{ currentConversation?.userName?.charAt(0) || '用' }}
            </el-avatar>
            <span class="chat-user-name">
              {{ currentConversation?.userName || `用户${currentSessionId}` }}
            </span>
          </div>
        </div>

        <!-- 消息列表 -->
        <div class="messages-container" ref="messagesContainer">
          <div v-if="messagesLoading" class="loading-container">
            <el-loading />
          </div>
          <div v-else class="messages-list">
            <div 
              v-for="message in messages" 
              :key="message.id"
              class="message-item"
              :class="{ 'message-sent': message.type === 'sent', 'message-received': message.type === 'received' }"
            >
              <div class="message-content">
                <div class="message-text">{{ message.content }}</div>
                <div class="message-time">{{ formatTime(message.timestamp) }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 消息输入框 -->
        <div class="message-input-container">
          <div class="message-input">
            <el-input
              v-model="messageText"
              type="textarea"
              :rows="3"
              placeholder="输入消息..."
              @keydown.enter.prevent="handleSendMessage"
              :disabled="sendingMessage"
            />
            <div class="input-actions">
              <el-button 
                type="primary" 
                @click="handleSendMessage"
                :loading="sendingMessage"
                :disabled="!messageText.trim()"
              >
                发送
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/store/modules/user'
import { useIMStore } from '@/store/im'
import { ElMessage } from 'element-plus'
import { ChatDotRound } from '@element-plus/icons-vue'

// 路由和状态管理
const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const imStore = useIMStore()

// 响应式数据
const currentSessionId = ref<string | null>(null)
const messagesLoading = ref(false)
const sendingMessage = ref(false)
const messageText = ref('')
const messagesContainer = ref<HTMLElement>()

// 计算属性
const conversationList = computed(() => imStore.getConversationList)
const messages = computed(() => imStore.currentConversation?.messages || [])
const currentConversation = computed(() => imStore.currentConversation)

// 方法定义
const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  if (diff < 60000) { // 1分钟内
    return '刚刚'
  } else if (diff < 3600000) { // 1小时内
    return `${Math.floor(diff / 60000)}分钟前`
  } else if (diff < 86400000) { // 24小时内
    return `${Math.floor(diff / 3600000)}小时前`
  } else {
    return date.toLocaleDateString()
  }
}

const selectSession = (userId: string): void => {
  currentSessionId.value = userId
  imStore.setCurrentConversation(userId)
  
  // 滚动到底部
  nextTick(() => {
    scrollToBottom()
  })
}

const scrollToBottom = (): void => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

const handleSendMessage = async (): Promise<void> => {
  if (!messageText.value.trim() || !currentSessionId.value) {
    return
  }

  try {
    sendingMessage.value = true
    await imStore.sendMessage(currentSessionId.value, messageText.value.trim())
    messageText.value = ''
    
    // 滚动到底部
    nextTick(() => {
      scrollToBottom()
    })
  } catch (error) {
    console.error('发送消息失败:', error)
    ElMessage.error('发送消息失败，请重试')
  } finally {
    sendingMessage.value = false
  }
}

const handleNewMessage = (data: any): void => {
  // 新消息处理逻辑已在IM Store中实现
  nextTick(() => {
    scrollToBottom()
  })
}

// 监听路由参数变化
watch(() => route.params.sessionId, (newSessionId) => {
  if (newSessionId && typeof newSessionId === 'string') {
    selectSession(newSessionId)
  }
}, { immediate: true })

// 页面初始化
onMounted(async () => {
  try {
    // 确保用户已登录
    if (!userStore.isLogin) {
      ElMessage.error('请先登录')
      router.push('/login')
      return
    }

    // 初始化IM连接
    if (!imStore.client) {
      imStore.initialize(userStore.token || '')
    }

    // 连接IM服务器
    if (!imStore.isReady) {
      await imStore.connectIM()
    }

    // 监听新消息
    if (imStore.client) {
      imStore.client.on('messageReceived', handleNewMessage)
    }

    // 如果有路由参数，选择对应会话
    const sessionId = route.params.sessionId
    if (sessionId && typeof sessionId === 'string') {
      selectSession(sessionId)
    }
  } catch (error) {
    console.error('初始化聊天失败:', error)
    ElMessage.error('连接聊天服务失败，请刷新页面重试')
  }
})

// 页面销毁
onUnmounted(() => {
  if (imStore.client) {
    imStore.client.off('messageReceived', handleNewMessage)
  }
})
</script>

<style scoped>
.chat-container {
  display: flex;
  height: 100vh;
  background-color: #f5f5f5;
}

.session-list {
  width: 300px;
  background-color: #fff;
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
}

.session-header {
  padding: 16px;
  border-bottom: 1px solid #e4e7ed;
  background-color: #fafafa;
}

.session-header h3 {
  margin: 0;
  font-size: 16px;
  color: #303133;
}

.session-items {
  flex: 1;
  overflow-y: auto;
}

.session-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  border-bottom: 1px solid #f0f0f0;
  transition: background-color 0.2s;
}

.session-item:hover {
  background-color: #f5f7fa;
}

.session-item.active {
  background-color: #ecf5ff;
}

.session-avatar {
  margin-right: 12px;
}

.session-info {
  flex: 1;
  min-width: 0;
}

.session-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 4px;
}

.session-last-message {
  font-size: 12px;
  color: #909399;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 2px;
}

.session-time {
  font-size: 11px;
  color: #c0c4cc;
}

.session-badge {
  background-color: #f56c6c;
  color: white;
  border-radius: 10px;
  padding: 2px 6px;
  font-size: 11px;
  min-width: 16px;
  text-align: center;
}

.chat-window {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: #fff;
}

.empty-chat {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-content {
  text-align: center;
  color: #909399;
}

.empty-content p {
  margin-top: 16px;
  font-size: 14px;
}

.chat-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.chat-header {
  padding: 16px 20px;
  border-bottom: 1px solid #e4e7ed;
  background-color: #fafafa;
}

.chat-user-info {
  display: flex;
  align-items: center;
}

.chat-user-name {
  margin-left: 12px;
  font-size: 16px;
  font-weight: 500;
  color: #303133;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message-item {
  display: flex;
}

.message-item.message-sent {
  justify-content: flex-end;
}

.message-item.message-received {
  justify-content: flex-start;
}

.message-content {
  max-width: 70%;
  display: flex;
  flex-direction: column;
}

.message-sent .message-content {
  align-items: flex-end;
}

.message-received .message-content {
  align-items: flex-start;
}

.message-text {
  background-color: #409eff;
  color: white;
  padding: 8px 12px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.4;
  word-wrap: break-word;
}

.message-received .message-text {
  background-color: #f0f0f0;
  color: #303133;
}

.message-time {
  font-size: 11px;
  color: #c0c4cc;
  margin-top: 4px;
}

.message-input-container {
  border-top: 1px solid #e4e7ed;
  padding: 16px 20px;
  background-color: #fafafa;
}

.message-input {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.input-actions {
  display: flex;
  justify-content: flex-end;
}
</style>