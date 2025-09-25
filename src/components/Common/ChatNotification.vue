<template>
  <div class="chat-notification-container">
    <!-- 通知弹窗 -->
    <el-dialog
      v-model="showNotification"
      title="新消息通知"
      width="400px"
      :before-close="handleClose"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      class="chat-notification-dialog"
    >
      <div class="notification-content">
        <div class="message-info">
          <el-avatar 
            :src="senderInfo?.userAvatar" 
            :size="50"
            class="sender-avatar"
          >
            {{ senderInfo?.userName?.charAt(0) }}
          </el-avatar>
          <div class="message-details">
            <div class="sender-name">{{ senderInfo?.userName }}</div>
            <div class="message-preview">{{ messageContent }}</div>
            <div class="message-time">{{ formatTime(messageTime) }}</div>
          </div>
        </div>
        
        <div class="book-info" v-if="bookInfo">
          <div class="book-title">关于图书：《{{ bookInfo.bookName }}》</div>
          <div class="book-details">
            <span>作者：{{ bookInfo.bookAuthor }}</span>
            <span>价格：¥{{ (bookInfo.bookPrice / 100).toFixed(2) }}</span>
          </div>
        </div>
      </div>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="handleIgnore">忽略</el-button>
          <el-button type="primary" @click="handleGoToChat">
            <el-icon><ChatDotRound /></el-icon>
            立即回复
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ChatDotRound } from '@element-plus/icons-vue'
import { useIMStore } from '@/store/im'
import { useUserStore } from '@/store/modules/user'
import type { Book } from '@/types/book'
import type { UserVO } from '@/types/user'
import request from '@/utils/request'
import type { BaseResponse } from '@/types/common'

interface ChatRedirectMessage {
  msgId: number
  sessionId: number
  content: string
  senderId?: number
  bookId?: number
}

const router = useRouter()
const imStore = useIMStore()
const userStore = useUserStore()

// 响应式数据
const showNotification = ref(false)
const currentMessage = ref<ChatRedirectMessage | null>(null)
const senderInfo = ref<UserVO | null>(null)
const bookInfo = ref<Book | null>(null)
const messageTime = ref<string>('')

// 计算属性
const messageContent = computed(() => {
  if (!currentMessage.value) return ''
  
  try {
    // 尝试解析消息内容
    const parsed = JSON.parse(currentMessage.value.content)
    return parsed.content || currentMessage.value.content
  } catch {
    return currentMessage.value.content
  }
})

// 处理接收到的聊天重定向消息
const handleChatRedirectMessage = async (incomingMessage: any) => {
  try {
    console.log('收到消息:', incomingMessage)
    
    // 这里的incomingMessage是IncomingChatMessage格式，包含msgId, sessionId, content
    if (incomingMessage && incomingMessage.sessionId) {
      // 从sessionId或其他方式获取发送者信息
      // 这里需要根据实际的会话信息来判断发送者
      currentMessage.value = {
        msgId: incomingMessage.msgId,
        sessionId: incomingMessage.sessionId,
        content: incomingMessage.content
      }
      messageTime.value = new Date().toISOString()
      
      // 获取会话信息来确定发送者
      await fetchSessionInfo(incomingMessage.sessionId)
      
      // 显示通知弹窗
      showNotification.value = true
    }
  } catch (error) {
    console.error('处理聊天消息失败:', error)
  }
}

// 获取会话信息
const fetchSessionInfo = async (sessionId: string) => {
  try {
    const response = await request.get<BaseResponse<any>>('/im/session/get', {
      params: { sessionId }
    })
    
    if (response.data.code === 0) {
      const sessionInfo = response.data.data
      // 根据会话信息确定发送者
      const currentUserId = userStore.userInfo?.id
      const senderId = sessionInfo.buyerId.toString() === currentUserId ? sessionInfo.sellerId : sessionInfo.buyerId
      
      // 获取发送者信息
      if (senderId) {
        await fetchSenderInfo(senderId)
      }
      
      // 获取图书信息
      if (sessionInfo.bookId) {
        await fetchBookInfo(sessionInfo.bookId)
      }
    }
  } catch (error) {
    console.error('获取会话信息失败:', error)
  }
}
const fetchSenderInfo = async (senderId: number) => {
  try {
    const response = await request.get<BaseResponse<UserVO>>('/user/get', {
      params: { id: senderId }
    })
    
    if (response.data.code === 0) {
      senderInfo.value = response.data.data
    }
  } catch (error) {
    console.error('获取发送者信息失败:', error)
  }
}

// 获取图书信息
const fetchBookInfo = async (bookId: number) => {
  try {
    const response = await request.get<BaseResponse<Book>>('/book/get', {
      params: { id: bookId }
    })
    
    if (response.data.code === 0) {
      bookInfo.value = response.data.data
    }
  } catch (error) {
    console.error('获取图书信息失败:', error)
  }
}

// 格式化时间
const formatTime = (timeStr: string) => {
  const time = new Date(timeStr)
  const now = new Date()
  const diff = now.getTime() - time.getTime()
  
  if (diff < 60000) { // 1分钟内
    return '刚刚'
  } else if (diff < 3600000) { // 1小时内
    return `${Math.floor(diff / 60000)}分钟前`
  } else if (diff < 86400000) { // 1天内
    return `${Math.floor(diff / 3600000)}小时前`
  } else {
    return time.toLocaleDateString() + ' ' + time.toLocaleTimeString()
  }
}

// 处理关闭弹窗
const handleClose = () => {
  showNotification.value = false
  currentMessage.value = null
  senderInfo.value = null
  bookInfo.value = null
}

// 处理忽略消息
const handleIgnore = () => {
  handleClose()
}

// 处理跳转到聊天界面
const handleGoToChat = () => {
  if (currentMessage.value) {
    router.push({
      path: '/chat',
      query: {
        sessionId: currentMessage.value.sessionId.toString(),
        bookId: currentMessage.value.bookId?.toString()
      }
    })
  }
  handleClose()
}

// 组件挂载时监听IM消息
onMounted(() => {
  if (imStore.client) {
    // 监听消息接收事件
    imStore.client.on('messageReceived', handleChatRedirectMessage)
  }
})

// 组件卸载时移除监听
onUnmounted(() => {
  if (imStore.client) {
    imStore.client.off('messageReceived', handleChatRedirectMessage)
  }
})
</script>

<style scoped>
.chat-notification-container {
  position: relative;
}

.chat-notification-dialog {
  --el-dialog-border-radius: 12px;
}

.notification-content {
  padding: 8px 0;
}

.message-info {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.sender-avatar {
  flex-shrink: 0;
}

.message-details {
  flex: 1;
  min-width: 0;
}

.sender-name {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 4px;
}

.message-preview {
  font-size: 14px;
  color: #606266;
  line-height: 1.4;
  margin-bottom: 4px;
  word-wrap: break-word;
  max-height: 60px;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}

.message-time {
  font-size: 12px;
  color: #c0c4cc;
}

.book-info {
  background-color: #f5f7fa;
  border-radius: 8px;
  padding: 12px;
  border-left: 4px solid #409eff;
}

.book-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 6px;
}

.book-details {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #909399;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.dialog-footer .el-button {
  min-width: 80px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .chat-notification-dialog {
    width: 90% !important;
    margin: 0 auto;
  }
  
  .message-info {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  
  .book-details {
    flex-direction: column;
    gap: 4px;
  }
}

/* 动画效果 */
.chat-notification-dialog .el-dialog {
  animation: slideInDown 0.3s ease-out;
}

@keyframes slideInDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>