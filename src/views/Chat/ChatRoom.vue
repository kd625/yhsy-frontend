<template>
  <div class="chat-room">
    <!-- 聊天头部 -->
    <div class="chat-header">
      <el-button 
        type="text" 
        @click="goBack"
        class="back-button"
      >
        <el-icon><ArrowLeft /></el-icon>
        返回
      </el-button>
      <div class="chat-title">
        <div class="book-info" v-if="bookInfo">
          <span class="book-name">《{{ bookInfo.bookName }}》</span>
          <span class="chat-with">与 {{ otherUser?.userName }} 的对话</span>
        </div>
      </div>
    </div>

    <!-- 消息列表 -->
    <div class="message-list" ref="messageListRef">
      <div v-if="loading" class="loading-container">
        <el-loading-spinner />
        <span>加载消息中...</span>
      </div>
      
      <div v-else-if="messages.length === 0" class="empty-messages">
        <el-empty description="暂无消息，开始聊天吧！" />
      </div>
      
      <div v-else class="messages-container">
        <div
          v-for="message in messages"
          :key="message.msgId"
          :class="['message-item', message.senderId === Number(currentUserId) ? 'sent' : 'received']"
        >
          <div class="message-avatar">
            <el-avatar 
              :src="message.senderId === Number(currentUserId) ? currentUser?.userAvatar : otherUser?.userAvatar"
              :size="36"
            >
              {{ (message.senderId === Number(currentUserId) ? currentUser?.userName : otherUser?.userName)?.charAt(0) }}
            </el-avatar>
          </div>
          <div class="message-content">
            <div class="message-bubble">
              {{ message.content }}
            </div>
            <div class="message-time">
              {{ formatTime(message.createTime) }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 消息输入框 -->
    <div class="message-input">
      <div class="input-container">
        <el-input
          v-model="newMessage"
          type="textarea"
          :rows="3"
          placeholder="输入消息..."
          @keydown.enter.prevent="handleSendMessage"
          :disabled="!isSessionValid"
        />
        <div class="input-actions">
          <el-button 
            type="primary" 
            @click="handleSendMessage"
            :loading="sending"
            :disabled="!newMessage.trim() || !isSessionValid"
          >
            发送
          </el-button>
        </div>
      </div>
      <div v-if="!isSessionValid" class="session-expired-tip">
        <el-alert
          title="会话已过期，无法发送消息"
          type="warning"
          :closable="false"
          show-icon
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import { useUserStore } from '@/store/modules/user'
import { useIMStore } from '@/store/im'
import { initIMConnection } from '@/utils/im'
import type { Book } from '@/types/book'
import type { UserVO } from '@/types/user'
import request from '@/utils/request'
import type { BaseResponse } from '@/types/common'

interface ChatMessage {
  msgId: string
  sessionId: string
  senderId: number
  receiverId: number
  content: string
  createTime: string
}

interface SessionVO {
  id: string
  bookId: number
  sellerId: number
  buyerId: number
  expireTime: string
}

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const imStore = useIMStore()

// 响应式数据
const loading = ref(true)
const sending = ref(false)
const messages = ref<ChatMessage[]>([])
const newMessage = ref('')
const sessionInfo = ref<SessionVO | null>(null)
const bookInfo = ref<Book | null>(null)
const otherUser = ref<UserVO | null>(null)
const messageListRef = ref<HTMLElement>()

// 计算属性
const currentUserId = computed(() => userStore.userInfo?.id)
const currentUser = computed(() => userStore.userInfo)

const isSessionValid = computed(() => {
  if (!sessionInfo.value) return false
  const currentTime = new Date().getTime()
  const expireTime = new Date(sessionInfo.value.expireTime).getTime()
  return currentTime <= expireTime
})

// 获取会话信息
const fetchSessionInfo = async () => {
  try {
    const sessionId = route.query.sessionId as string
    if (!sessionId) {
      throw new Error('会话ID不能为空')
    }

    const response = await request.get<BaseResponse<SessionVO>>('/im/session/get', {
      params: { sessionId }
    })

    if (response.data.code === 0) {
      sessionInfo.value = response.data.data
      
      // 获取图书信息
      if (sessionInfo.value.bookId) {
        await fetchBookInfo(sessionInfo.value.bookId)
      }
      
      // 获取对方用户信息
      const otherUserId = sessionInfo.value.sellerId.toString() === currentUserId.value 
        ? sessionInfo.value.buyerId 
        : sessionInfo.value.sellerId
      
      if (otherUserId) {
        await fetchUserInfo(otherUserId)
      }
    } else {
      throw new Error(response.data.message || '获取会话信息失败')
    }
  } catch (err: any) {
    console.error('获取会话信息失败:', err)
    ElMessage.error(err.message || '获取会话信息失败')
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
  } catch (err) {
    console.error('获取图书信息失败:', err)
  }
}

// 获取用户信息
const fetchUserInfo = async (userId: number) => {
  try {
    const response = await request.get<BaseResponse<UserVO>>('/user/get', {
      params: { id: userId }
    })

    if (response.data.code === 0) {
      otherUser.value = response.data.data
    }
  } catch (err) {
    console.error('获取用户信息失败:', err)
  }
}

// 获取消息历史
const fetchMessageHistory = async () => {
  try {
    loading.value = true
    const sessionId = route.query.sessionId as string
    if (!sessionId) return

    const response = await request.get<BaseResponse<ChatMessage[]>>('/im/message/history', {
      params: { 
        sessionId,
        pageSize: 20
      }
    })

    if (response.data.code === 0) {
      messages.value = response.data.data.map(msg => {
        let parsedContent = msg.content
        
        // 如果content是JSON字符串，解析它
        if (typeof msg.content === 'string') {
          try {
            const contentObj = JSON.parse(msg.content)
            // 检查是否是嵌套的JSON结构
            if (contentObj.content) {
              parsedContent = contentObj.content
            } else {
              parsedContent = msg.content
            }
          } catch (e) {
            // 如果解析失败，使用原始内容
            parsedContent = msg.content
          }
        }
        
        return {
          ...msg,
          content: parsedContent
        }
      })
      
      // 滚动到底部
      await nextTick()
      scrollToBottom()
    } else {
      throw new Error(response.data.message || '获取消息历史失败')
    }
  } catch (err: any) {
    console.error('获取消息历史失败:', err)
    ElMessage.error(err.message || '获取消息历史失败')
  } finally {
    loading.value = false
  }
}

// 发送消息
const handleSendMessage = async () => {
  if (!newMessage.value.trim() || !sessionInfo.value || !isSessionValid.value) return

  try {
    sending.value = true
    
    const messageContent = {
      content: newMessage.value.trim(),
      msgId: Date.now().toString(),
      sessionId: sessionInfo.value.id
    }

    // 通过WebSocket发送消息
    if (imStore.isReady) {
      const receiverId = sessionInfo.value.sellerId.toString() === currentUserId.value 
        ? sessionInfo.value.buyerId 
        : sessionInfo.value.sellerId
      
      await imStore.sendMessage(
        receiverId.toString(),
        sessionInfo.value.id.toString(),
        JSON.stringify(messageContent)
      )
      
      // 添加到本地消息列表
      messages.value.push({
        msgId: messageContent.msgId,
        sessionId: sessionInfo.value.id,
        senderId: parseInt(currentUserId.value!),
        receiverId: sessionInfo.value.sellerId.toString() === currentUserId.value 
          ? sessionInfo.value.buyerId 
          : sessionInfo.value.sellerId,
        content: messageContent.content,
        createTime: new Date().toISOString()
      })
      
      newMessage.value = ''
      
      // 滚动到底部
      await nextTick()
      scrollToBottom()
    } else {
      throw new Error('WebSocket连接未就绪')
    }
  } catch (err: any) {
    console.error('发送消息失败:', err)
    ElMessage.error(err.message || '发送消息失败')
  } finally {
    sending.value = false
  }
}

// 滚动到底部
const scrollToBottom = () => {
  if (messageListRef.value) {
    messageListRef.value.scrollTop = messageListRef.value.scrollHeight
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

// 返回上一页
const goBack = () => {
  router.back()
}

// 处理接收到的消息
const handleReceivedMessage = (message: any) => {
  if (message.sessionId === sessionInfo.value?.id) {
    let parsedContent = message.content
    
    // 如果content是JSON字符串，解析它
    if (typeof message.content === 'string') {
      try {
        const contentObj = JSON.parse(message.content)
        // 检查是否是嵌套的JSON结构
        if (contentObj.content) {
          parsedContent = contentObj.content
        } else {
          parsedContent = message.content
        }
      } catch (e) {
        // 如果解析失败，使用原始内容
        parsedContent = message.content
      }
    }
    
    messages.value.push({
      msgId: message.msgId || Date.now().toString(),
      sessionId: message.sessionId,
      senderId: message.senderId,
      receiverId: message.receiverId,
      content: parsedContent,
      createTime: new Date().toISOString()
    })
    
    // 滚动到底部
    nextTick(() => {
      scrollToBottom()
    })
  }
}

// 组件挂载
onMounted(async () => {
  try {
    // 首先获取会话信息
    await fetchSessionInfo()
    
    // 确保IM客户端已初始化并连接
    const userStore = useUserStore()
    if (userStore.token) {
      await initIMConnection(userStore.token)
    }
    
    // 获取消息历史
    await fetchMessageHistory()
    
    // 监听IM消息
    if (imStore.client) {
      imStore.client.on('messageReceived', handleReceivedMessage)
    }
  } catch (error) {
    console.error('聊天室初始化失败:', error)
    ElMessage.error('聊天室初始化失败，请刷新页面重试')
  }
})

// 组件卸载
onUnmounted(() => {
  if (imStore.client) {
    imStore.client.off('messageReceived', handleReceivedMessage)
  }
})
</script>

<style scoped>
.chat-room {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f5f5;
}

.chat-header {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  background: white;
  border-bottom: 1px solid #e4e7ed;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.back-button {
  margin-right: 16px;
  font-size: 16px;
}

.chat-title {
  flex: 1;
}

.book-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.book-name {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.chat-with {
  font-size: 14px;
  color: #909399;
}

.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  gap: 12px;
  color: #909399;
}

.empty-messages {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
}

.messages-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.message-item {
  display: flex;
  gap: 12px;
}

.message-item.sent {
  flex-direction: row-reverse;
}

.message-item.sent .message-content {
  align-items: flex-end;
}

.message-item.received .message-content {
  align-items: flex-start;
}

.message-avatar {
  flex-shrink: 0;
}

.message-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 70%;
}

.message-bubble {
  padding: 12px 16px;
  border-radius: 18px;
  word-wrap: break-word;
  line-height: 1.4;
}

.message-item.sent .message-bubble {
  background-color: #409eff;
  color: white;
}

.message-item.received .message-bubble {
  background-color: white;
  color: #303133;
  border: 1px solid #e4e7ed;
}

.message-time {
  font-size: 12px;
  color: #c0c4cc;
  padding: 0 8px;
}

.message-input {
  background: white;
  border-top: 1px solid #e4e7ed;
  padding: 16px 20px;
}

.input-container {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.input-container .el-textarea {
  flex: 1;
}

.input-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.session-expired-tip {
  margin-top: 12px;
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