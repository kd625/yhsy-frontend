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
    <div class="message-list" ref="messageListRef" @scroll="handleScroll">
      <div v-if="loading" class="loading-container">
        <el-loading-spinner />
        <span>加载消息中...</span>
      </div>
      
      <!-- 加载更多历史消息提示 -->
      <div v-if="isLoadingMore" class="loading-more">
        <el-loading-spinner size="small" />
        <span>加载更多消息...</span>
      </div>
      
      <!-- 历史消息加载错误 -->
      <div v-if="historyError" class="history-error">
        <el-icon color="#f56c6c">
          <Warning />
        </el-icon>
        <span>{{ historyError }}</span>
        <el-button size="small" type="text" @click="retryLoadHistory">重试</el-button>
      </div>
      
      <!-- 没有更多历史消息提示 -->
      <div v-else-if="!hasMoreHistory && messages.length > 0" class="no-more-history">
        <span>没有更多历史消息了</span>
      </div>
      
      <div v-else-if="messages.length === 0 && !loading" class="empty-messages">
        <el-empty description="暂无消息，开始聊天吧！" />
      </div>
      
      <div v-else class="messages-container">
        <div
          v-for="message in messages"
          :key="message.msgId"
          :class="['message-item', (String(message.senderId) === currentUserIdStr) ? 'sent' : 'received']"
        >
          <div class="message-avatar">
            <el-avatar 
              :src="(String(message.senderId) === currentUserIdStr) ? currentUser?.userAvatar : otherUser?.userAvatar"
              :size="36"
            >
              {{ ((String(message.senderId) === currentUserIdStr) ? currentUser?.userName : otherUser?.userName)?.charAt(0) }}
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
const isLoadingMore = ref(false)
const hasMoreHistory = ref(true)
const historyError = ref('')

// 计算属性
const currentUserId = computed(() => userStore.userInfo?.id)
const currentUser = computed(() => userStore.userInfo)
const currentUserIdStr = computed(() => String(userStore.userInfo?.id ?? ''))

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

// 解析消息内容的统一函数
const parseMessageContent = (content: string): string => {
  if (typeof content !== 'string') {
    return String(content || '')
  }
  
  try {
    const contentObj = JSON.parse(content)
    // 检查是否是嵌套的JSON结构
    if (contentObj.content) {
      return String(contentObj.content)
    } else {
      return content
    }
  } catch (e) {
    // 如果解析失败，使用原始内容
    return content
  }
}

// 检查消息是否已存在的函数
const isMessageExists = (msgId: string): boolean => {
  return messages.value.some(msg => msg.msgId === msgId)
}

// 获取消息历史（支持分页）
const fetchMessageHistory = async (startMsgId?: number, isLoadMore = false) => {
  try {
    if (isLoadMore) {
      isLoadingMore.value = true
    } else {
      loading.value = true
    }
    
    const sessionId = route.query.sessionId as string
    if (!sessionId) return

    console.log('开始获取历史消息，sessionId:', sessionId, 'startMsgId:', startMsgId)

    const params: any = { 
      sessionId,
      pageSize: 20
    }
    
    if (startMsgId) {
      params.startMsgId = startMsgId
    }

    const response = await request.post<BaseResponse<any[]>>('/im/message/history', params)

    console.log('历史消息接口响应:', response)

    if (response.data.code === 0 && response.data.data) {
      console.log('历史消息数据:', response.data.data)
      
      const newMessages = response.data.data.map((msg: any) => {
        console.log('处理消息:', msg)
        
        // 直接使用content，不需要JSON解析
        const content = msg.content || ''
        
        // 使用senderId作为发送者ID
        const senderId = msg.senderId ? Number(msg.senderId) : 0
        
        // 使用后端返回的msgId，如果没有则生成一个
        const msgId = msg.msgId ? String(msg.msgId) : `history_${sessionId}_${new Date(msg.sendTime).getTime()}`
        
        // 确定接收者ID（当前用户或对方用户）
        const currentUserIdNum = currentUserId.value || 0
        let receiverId = 0
        
        // 如果发送者是当前用户，接收者就是对方用户
        if (senderId === currentUserIdNum) {
          // 从会话信息中获取对方用户ID
          receiverId = sessionInfo.value?.sellerId === currentUserIdNum 
            ? Number(sessionInfo.value.buyerId || 0)
            : Number(sessionInfo.value?.sellerId || 0)
        } else {
          // 如果发送者不是当前用户，接收者就是当前用户
          receiverId = currentUserIdNum
        }
        
        const chatMessage: ChatMessage = {
          msgId: msgId,
          sessionId: sessionId,
          senderId: senderId,
          receiverId: receiverId,
          content: content,
          createTime: msg.sendTime || new Date().toISOString()
        }
        
        console.log('转换后的消息:', chatMessage)
        return chatMessage
      })
      
      if (isLoadMore) {
        // 加载更多时，将新消息添加到现有消息的前面
        const existingMessages = messages.value
        messages.value = [...newMessages, ...existingMessages]
        console.log('加载更多消息，新增:', newMessages.length, '条，总计:', messages.value.length, '条')
      } else {
        // 首次加载时，直接设置消息列表
        messages.value = newMessages
        console.log('首次加载消息:', messages.value.length, '条')
      }
      
      // 按时间排序（最早的在前面）
      messages.value.sort((a, b) => new Date(a.createTime).getTime() - new Date(b.createTime).getTime())
      
      // 检查是否还有更多历史消息
      hasMoreHistory.value = response.data.data.length === 20
      
      if (!isLoadMore) {
        // 首次加载时滚动到底部
        await nextTick()
        scrollToBottom()
      } else {
        // 加载更多时保持滚动位置
        await nextTick()
        // 可以在这里添加保持滚动位置的逻辑
      }
    } else {
      console.error('获取历史消息失败:', response.data.message)
      throw new Error(response.data.message || '获取消息历史失败')
    }
  } catch (err: any) {
    console.error('获取消息历史失败:', err)
    historyError.value = err.message || '获取消息历史失败'
    ElMessage.error(err.message || '获取消息历史失败')
  } finally {
    if (isLoadMore) {
      isLoadingMore.value = false
    } else {
      loading.value = false
    }
  }
}

// 重试加载历史消息
const retryLoadHistory = async () => {
  historyError.value = ''
  await fetchMessageHistory()
}

// 加载更多历史消息
const loadMoreHistory = async () => {
  if (isLoadingMore.value || !hasMoreHistory.value || messages.value.length === 0) {
    return
  }
  
  // 获取最早的消息ID
  const earliestMessage = messages.value[0]
  const earliestMsgId = earliestMessage.msgId
  
  // 如果msgId是字符串格式（历史生成的），尝试提取数字部分
  let startMsgId: number | undefined
  if (typeof earliestMsgId === 'string' && earliestMsgId.startsWith('history_')) {
    // 对于历史生成的ID，使用时间戳
    const timestamp = new Date(earliestMessage.createTime).getTime()
    startMsgId = timestamp
  } else {
    // 对于数字ID，直接使用
    startMsgId = Number(earliestMsgId)
  }
  
  console.log('加载更多历史消息，startMsgId:', startMsgId)
  await fetchMessageHistory(startMsgId, true)
}

// 监听消息列表滚动事件
const handleScroll = () => {
  if (!messageListRef.value) return
  
  const { scrollTop } = messageListRef.value
  
  // 当滚动到顶部附近时，加载更多历史消息
  if (scrollTop <= 100 && hasMoreHistory.value && !isLoadingMore.value) {
    loadMoreHistory()
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
      const receiverId: number = String(sessionInfo.value.sellerId) === currentUserIdStr.value 
        ? Number(sessionInfo.value.buyerId)
        : Number(sessionInfo.value.sellerId)
      
      await imStore.sendMessage(
        receiverId.toString(),
        sessionInfo.value.id.toString(),
        JSON.stringify(messageContent)
      )
      
      // 添加到本地消息列表
      messages.value.push({
        msgId: messageContent.msgId,
        sessionId: sessionInfo.value.id,
        senderId: currentUserId.value!,
        receiverId: receiverId,
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
  const currentSessionId = String(sessionInfo.value?.id ?? '')
  const incomingSessionId = String(message.sessionId ?? message.sessionID ?? message.session_id ?? '')
  
  if (incomingSessionId === currentSessionId) {
    const normalizedMsgId = String(message.msgId ?? message.id ?? Date.now())
    
    // 检查消息是否已存在，避免重复显示
    if (isMessageExists(normalizedMsgId)) {
      console.log('消息已存在，跳过添加:', normalizedMsgId)
      return
    }
    
    const parsedContent = parseMessageContent(message.content)
    const normalizedSenderId = Number(message.senderId ?? message.fromUserId ?? message.fromId)
    const normalizedReceiverId = Number(message.receiverId ?? message.toUserId ?? message.toId)
    
    const newMessage: ChatMessage = {
      msgId: normalizedMsgId,
      sessionId: incomingSessionId,
      senderId: normalizedSenderId,
      receiverId: normalizedReceiverId,
      content: parsedContent,
      createTime: new Date().toISOString()
    }
    
    messages.value.push(newMessage)
    
    // 滚动到底部
    nextTick(() => {
      scrollToBottom()
    })
  }
}

// 组件挂载
onMounted(async () => {
  try {
    console.log('ChatRoom 组件开始初始化')
    
    // 首先获取会话信息
    await fetchSessionInfo()
    console.log('会话信息获取完成:', sessionInfo.value)
    
    // 确保IM客户端已初始化并连接
    const userStore = useUserStore()
    if (userStore.token) {
      await initIMConnection(userStore.token)
      console.log('IM连接初始化完成')
    }
    
    // 获取消息历史（首次加载）
    await fetchMessageHistory()
    console.log('历史消息加载完成，消息数量:', messages.value.length)
    
    // 监听IM消息
    if (imStore.client) {
      imStore.client.on('messageReceived', handleReceivedMessage)
      console.log('IM消息监听器已注册')
    }
    
    console.log('ChatRoom 组件初始化完成')
  } catch (error) {
    console.error('聊天室初始化失败:', error)
    ElMessage.error('聊天室初始化失败，请刷新页面重试')
  }
})

// 组件卸载
onUnmounted(() => {
  console.log('ChatRoom 组件开始卸载')
  if (imStore.client) {
    imStore.client.off('messageReceived', handleReceivedMessage)
    console.log('IM消息监听器已移除')
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

.history-error {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  color: #f56c6c;
  font-size: 14px;
  background-color: #fef0f0;
  border: 1px solid #fbc4c4;
  border-radius: 4px;
  margin-bottom: 16px;
}

.no-more-history {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  color: #c0c4cc;
  font-size: 12px;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 16px;
}

.loading-more {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  color: #909399;
  font-size: 14px;
  gap: 8px;
}

.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background-color: #f8f9fa;
  scroll-behavior: smooth;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
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
  align-items: flex-start;
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

.message-content {
  display: flex;
  flex-direction: column;
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
  color: #909399;
  margin-top: 4px;
  padding: 0 4px;
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