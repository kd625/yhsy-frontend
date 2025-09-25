<template>
  <div class="chat-container">
    <!-- 聊天窗口占满整个区域 -->
    <div class="chat-window">
      <div v-if="!currentSessionId" class="empty-chat">
        <div class="empty-content">
          <el-icon size="64" color="#c0c4cc">
            <ChatDotRound />
          </el-icon>
          <p>正在加载聊天...</p>
        </div>
      </div>

      <div v-else class="chat-content">
        <!-- 聊天头部 -->
        <div class="chat-header">
          <div class="chat-user-info">
            <el-avatar :src="currentUserInfo?.userAvatar" :size="32">
              {{ currentUserInfo?.userName?.charAt(0) || currentConversation?.userName?.charAt(0) || '用' }}
            </el-avatar>
            <span class="chat-user-name">
              {{ currentUserInfo?.userName || currentConversation?.userName || `用户${currentSessionId}` }}
            </span>
          </div>
        </div>

        <!-- 消息列表 -->
        <div class="messages-container" ref="messagesContainer" @scroll="handleScroll">
          <!-- 历史消息加载状态 -->
          <div v-if="isLoadingHistory" class="history-loading">
            <el-icon class="is-loading">
              <Loading />
            </el-icon>
            <span>加载历史消息中...</span>
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
          <div v-if="!hasMoreHistory && messages.length > 0" class="no-more-history">
            <span>没有更多历史消息了</span>
          </div>
          
          <div v-if="messagesLoading" class="loading-container" v-loading="true" element-loading-text="加载消息中...">
          </div>
          <div v-else class="messages-list">
            <div 
              v-for="message in messages" 
              :key="message.id"
              class="message-item"
              :class="{ 'message-sent': message.type === 'sent', 'message-received': message.type === 'received' }"
            >
              <div class="message-content">
                <div v-if="message.type === 'sent'" class="message-text-wrapper">
                  <div class="message-text">{{ message.content }}</div>
                  <!-- 消息状态指示器 -->
                  <div class="message-status">
                    <el-icon v-if="message.status === 'pending'" class="status-loading" color="#909399" :size="14">
                      <Loading />
                    </el-icon>
                    <el-icon v-else-if="message.status === 'failed'" class="status-error" color="#f56c6c" :size="14">
                      <Warning />
                    </el-icon>
                    <span v-else-if="message.status === 'sent'" class="status-sent">✓</span>
                  </div>
                </div>
                <div v-else class="message-text">{{ message.content }}</div>
                <div class="message-time">{{ formatTime(message.timestamp) }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 消息输入框 -->
        <div class="message-input-container">
          <div class="message-input">
            <el-input
              ref="messageInputRef"
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
import { ChatDotRound, Loading, Warning } from '@element-plus/icons-vue'
import { request } from '@/utils/request'
import type { UserVO } from '@/types/user'

// 会话信息接口
interface SessionVO {
  id: string
  bookId: string
  buyerId: string
  sellerId: string
  sessionStatus: number
  expireTime: string
}

// 路由和状态管理
const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const imStore = useIMStore()

// 响应式数据
const currentSessionId = ref<string | null>(null)
const currentSession = ref<SessionVO | null>(null)
const targetUserId = ref<string | null>(null)
const messagesLoading = ref(false)
const sendingMessage = ref(false)
const messageText = ref('')
const messagesContainer = ref<HTMLElement>()
const messageInputRef = ref<any>(null)
const currentUserInfo = ref<UserVO | null>(null)

// 历史消息相关状态
const isLoadingHistory = ref(false)
const historyError = ref<string | null>(null)
const hasMoreHistory = ref(true)
const isScrollingToBottom = ref(false)

// 计算属性
const messages = computed(() => imStore.currentConversation?.messages || [])
const currentConversation = computed(() => imStore.currentConversation)

// 滚动监听处理
const handleScroll = async (): Promise<void> => {
  if (!messagesContainer.value) {
    console.log('handleScroll: messagesContainer 不存在')
    return
  }

  const container = messagesContainer.value
  const scrollTop = container.scrollTop
  const containerHeight = container.clientHeight
  const scrollHeight = container.scrollHeight
  const threshold = 50 // 距离顶部50px时开始加载

  // 详细的滚动调试日志
  console.log('=== 滚动事件触发 ===')
  console.log('scrollTop:', scrollTop)
  console.log('containerHeight:', containerHeight) 
  console.log('scrollHeight:', scrollHeight)
  console.log('threshold:', threshold)
  console.log('isLoadingHistory:', isLoadingHistory.value)
  console.log('hasMoreHistory:', hasMoreHistory.value)
  console.log('isScrollingToBottom:', isScrollingToBottom.value)
  console.log('距离顶部距离:', scrollTop)
  console.log('是否接近顶部:', scrollTop <= threshold)

  // 检查加载条件
  if (isLoadingHistory.value) {
    console.log('跳过加载：正在加载历史消息')
    return
  }
  
  if (!hasMoreHistory.value) {
    console.log('跳过加载：没有更多历史消息')
    return
  }

  // 当滚动到接近顶部时，加载更多历史消息
  if (scrollTop <= threshold && !isScrollingToBottom.value) {
    console.log('🚀 触发加载更多历史消息！')
    console.log('触发条件 - scrollTop:', scrollTop, '≤ threshold:', threshold)
    await loadMoreHistory()
  } else {
    console.log('未触发加载，原因:')
    if (scrollTop > threshold) {
      console.log('- 距离顶部太远:', scrollTop, '>', threshold)
    }
    if (isScrollingToBottom.value) {
      console.log('- 正在滚动到底部')
    }
  }
  console.log('=== 滚动事件结束 ===\n')
}

// 加载更多历史消息
const loadMoreHistory = async (): Promise<void> => {
  if (!currentSessionId.value || isLoadingHistory.value || !hasMoreHistory.value) {
    console.log('跳过加载更多历史消息:', {
      currentSessionId: currentSessionId.value,
      isLoadingHistory: isLoadingHistory.value,
      hasMoreHistory: hasMoreHistory.value
    })
    return
  }

  try {
    isLoadingHistory.value = true
    historyError.value = null
    
    // 获取当前最早的消息的msgId作为查询参数
    const conversation = imStore.currentConversation
    const earliestMessage = conversation?.messages?.[0]
    let startMsgId: number | undefined = undefined
    
    if (earliestMessage?.msgId) {
      startMsgId = Number(earliestMessage.msgId)
    }
    
    // 调试日志：输出请求参数
    console.log('正在请求历史消息，参数:', {
      sessionId: currentSessionId.value,
      startMsgId: startMsgId,
      limit: 20
    })
    
    // 记录当前滚动位置
    const container = messagesContainer.value
    const scrollHeight = container?.scrollHeight || 0
    
    // 记录更新前的消息数量
    const messagesBefore = messages.value.length
    console.log('更新前消息数量:', messagesBefore)
    
    // 调用store中的加载更多历史消息方法
    const response = await imStore.loadMoreHistory(currentSessionId.value)
    
    // 调试日志：输出响应结果
    console.log('收到历史消息响应:', response)
    
    // 更新状态
    if (conversation) {
      hasMoreHistory.value = conversation.hasMoreHistory
      historyError.value = conversation.historyError
    }
    
    // 记录更新后的消息数量
    const messagesAfter = messages.value.length
    console.log('更新后消息数量:', messagesAfter)
    
    // 如果没有新增消息，输出警告
    if (messagesAfter === messagesBefore) {
      console.warn('未返回历史消息，可能已到达最早记录')
    }
    
    // 保持滚动位置
    nextTick(() => {
      if (container) {
        const newScrollHeight = container.scrollHeight
        const heightDiff = newScrollHeight - scrollHeight
        container.scrollTop = heightDiff
        console.log('调整滚动位置，高度差:', heightDiff, '新滚动位置:', container.scrollTop)
      }
    })
  } catch (error) {
    console.error('加载更多历史消息失败:', error)
    historyError.value = error instanceof Error ? error.message : '加载历史消息失败'
  } finally {
    isLoadingHistory.value = false
  }
}

// 重试加载历史消息
const retryLoadHistory = async (): Promise<void> => {
  historyError.value = null
  await loadMoreHistory()
}

// 初始化历史消息
const initializeHistory = async (): Promise<void> => {
  if (!currentSessionId.value) {
    console.log('initializeHistory: 没有当前会话ID，跳过初始化')
    return
  }
  
  console.log('开始初始化历史消息，sessionId:', currentSessionId.value)
  
  try {
    messagesLoading.value = true
    
    // 调用store中的初始化历史消息方法
    console.log('调用 imStore.initConversationHistory')
    await imStore.initConversationHistory(currentSessionId.value)
    
    // 更新状态
    const conversation = imStore.currentConversation
    if (conversation) {
      hasMoreHistory.value = conversation.hasMoreHistory
      historyError.value = conversation.historyError
      console.log('历史消息初始化完成，消息数量:', conversation.messages.length, '是否有更多:', hasMoreHistory.value)
    } else {
      console.warn('初始化后未找到当前会话')
    }
    
    // 滚动到底部
    nextTick(() => {
      scrollToBottom()
    })
  } catch (error) {
    console.error('初始化历史消息失败:', error)
    ElMessage.error('加载历史消息失败')
  } finally {
    messagesLoading.value = false
  }
}

// 处理会话信息（从startChat接口返回的SessionVO或路由参数获取）
const handleSessionInfo = async (sessionVO: SessionVO): Promise<void> => {
  try {
    currentSession.value = sessionVO
    
    // 使用SessionVO的ID作为当前会话ID，确保与startChat接口返回的ID一致
    currentSessionId.value = sessionVO.id
    console.log('设置会话ID:', sessionVO.id, '类型:', typeof sessionVO.id)
    
    // 确定目标用户ID（如果当前用户是买家，则目标用户是卖家，反之亦然）
    const currentUserId = userStore.userInfo?.id?.toString()
    if (currentUserId === sessionVO.buyerId) {
      targetUserId.value = sessionVO.sellerId
    } else if (currentUserId === sessionVO.sellerId) {
      targetUserId.value = sessionVO.buyerId
    } else {
      console.error('当前用户不属于此会话')
      ElMessage.error('无权访问此会话')
      router.push('/')
      return
    }
    
    // 获取目标用户信息
    if (targetUserId.value) {
      await fetchUserInfo(targetUserId.value)
      // 设置IM store的当前会话，使用sessionId（与IM Store中的会话ID保持一致）
      imStore.setCurrentConversation(currentSessionId.value)
      console.log('已设置当前会话为sessionId:', currentSessionId.value, '对方用户ID:', targetUserId.value)
      
      // 初始化历史消息
      await initializeHistory()
    }
  } catch (error) {
    console.error('处理会话信息失败:', error)
    ElMessage.error('处理会话信息失败')
  }
}

// 获取会话详情（仅在必要时调用，如直接访问聊天页面）
const fetchSessionInfo = async (sessionId: string): Promise<void> => {
  try {
    const response = await request.get<SessionVO>('/im/session/get', { sessionId })
    if (response.code === 0 && response.data) {
      await handleSessionInfo(response.data)
    }
  } catch (error) {
    console.error('获取会话信息失败:', error)
    ElMessage.error('获取会话信息失败')
  }
}

// 获取用户信息
const fetchUserInfo = async (userId: string): Promise<void> => {
  try {
    const response = await request.get<UserVO>('/user/get', { id: userId })
    if (response.code === 0 && response.data) {
      currentUserInfo.value = response.data
    }
  } catch (error) {
    console.error('获取用户信息失败:', error)
    // 不显示错误消息，避免影响用户体验
  }
}

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

const selectSession = async (sessionId: string): Promise<void> => {
  console.log('选择会话:', sessionId, '类型:', typeof sessionId);
  currentSessionId.value = sessionId
  
  // 获取会话详情，从中确定目标用户ID
  await fetchSessionInfo(sessionId)
}

const scrollToBottom = (): void => {
  if (messagesContainer.value) {
    isScrollingToBottom.value = true
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    // 延迟重置标志，避免滚动事件触发加载更多
    setTimeout(() => {
      isScrollingToBottom.value = false
    }, 100)
  }
}

const handleSendMessage = async (): Promise<void> => {
  if (!messageText.value.trim() || !targetUserId.value || !currentSessionId.value) {
    console.warn('发送消息失败 - 缺少必要参数:', {
      messageText: messageText.value.trim(),
      targetUserId: targetUserId.value,
      currentSessionId: currentSessionId.value
    });
    return
  }

  try {
    sendingMessage.value = true
    console.log('准备发送消息:', {
      targetUserId: targetUserId.value,
      currentSessionId: currentSessionId.value,
      content: messageText.value.trim()
    });
    await imStore.sendMessage(targetUserId.value, currentSessionId.value, messageText.value.trim())
    messageText.value = ''
    
    // 重新聚焦到输入框
    nextTick(() => {
      if (messageInputRef.value) {
        messageInputRef.value.focus()
      }
      scrollToBottom()
    })
  } catch (error) {
    console.error('发送消息失败:', error)
    ElMessage.error('发送消息失败，请重试')
  } finally {
    sendingMessage.value = false
  }
}

// 处理新消息（从WebSocket接收）
const handleNewMessage = (message: any): void => {
  console.log('Chat.vue 收到新消息:', message)
  
  // 让IM Store自己处理消息，包括去重逻辑
  // IM Store已经有完整的消息处理和去重机制
  
  // 滚动到底部
  nextTick(() => {
    scrollToBottom()
  })
}

// 监听消息变化，确保新消息时滚动到底部
watch(() => messages.value, () => {
  nextTick(() => {
    scrollToBottom()
  })
}, { deep: true })

// 监听路由参数变化（仅在没有SessionVO信息时调用）
watch(() => route.params.sessionId, (newSessionId) => {
  if (newSessionId && typeof newSessionId === 'string' && !history.state?.sessionVO) {
    selectSession(newSessionId)
  }
}, { immediate: true })

// 页面初始化
onMounted(async () => {
  try {
    // 设置当前页面为聊天页面
    imStore.setCurrentPageChat(true)
    
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
    imStore.initClient()

    // 连接IM服务器
    if (!imStore.isReady) {
      await imStore.connectIM()
    }

    // 监听新消息
    if (imStore.client) {
      imStore.client.on('messageReceived', handleNewMessage)
    }

    // 监听消息发送失败事件
    const handleMessageSendFailed = (event: CustomEvent) => {
      const { msgId, error } = event.detail
      console.error('消息发送失败:', { msgId, error })
      ElMessage.error(`消息发送失败: ${error}`)
    }
    
    window.addEventListener('messageSendFailed', handleMessageSendFailed as EventListener)

    // 检查是否有路由状态传递的SessionVO信息
    const sessionVO = history.state?.sessionVO
    if (sessionVO) {
      // 直接使用传递的SessionVO信息，无需调用getSession接口
      await handleSessionInfo(sessionVO)
      console.log('从路由状态设置sessionId:', sessionVO.id, '类型:', typeof sessionVO.id);
      // handleSessionInfo中已经设置了currentSessionId，这里不需要重复设置
    } else {
      // 如果没有SessionVO信息，通过sessionId获取会话详情（兼容直接访问聊天页面的情况）
      const sessionId = route.params.sessionId
      if (sessionId && typeof sessionId === 'string') {
        console.log('从路由参数设置sessionId:', sessionId, '类型:', typeof sessionId);
        selectSession(sessionId)
      }
    }
  } catch (error) {
    console.error('初始化聊天失败:', error)
    ElMessage.error('连接聊天服务失败，请刷新页面重试')
  }
})

// 页面销毁
onUnmounted(() => {
  // 清除当前页面状态
  imStore.setCurrentPageChat(false)
  
  if (imStore.client) {
    imStore.client.off('messageReceived', handleNewMessage)
  }
  
  // 移除消息发送失败事件监听器
  const handleMessageSendFailed = (event: CustomEvent) => {
    const { msgId, error } = event.detail
    console.error('消息发送失败:', { msgId, error })
    ElMessage.error(`消息发送失败: ${error}`)
  }
  
  window.removeEventListener('messageSendFailed', handleMessageSendFailed as EventListener)
})
</script>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100vh; /* 占满整个视口高度 */
  overflow: hidden; /* 防止整个页面滚动 */
  background-color: #f5f5f5;
}

.chat-window {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden; /* 防止窗口本身滚动 */
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
  height: 100%; /* 确保占满容器高度 */
  min-height: 0; /* 确保flex子元素可以正确收缩 */
  overflow: hidden; /* 防止内容溢出 */
}

.chat-header {
  flex-shrink: 0; /* 防止头部被压缩 */
  padding: 16px 20px;
  border-bottom: 1px solid #e4e7ed;
  background-color: #fafafa;
  z-index: 10; /* 确保头部在上层 */
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
  overflow-y: auto; /* 只允许垂直滚动 */
  overflow-x: hidden; /* 隐藏水平滚动条 */
  padding: 16px 20px;
  min-height: 0; /* 确保flex子元素可以正确收缩 */
  scroll-behavior: smooth; /* 平滑滚动 */
  
  /* 自定义滚动条样式 */
  scrollbar-width: thin;
  scrollbar-color: #c1c1c1 transparent;
}

/* Webkit浏览器滚动条样式 */
.messages-container::-webkit-scrollbar {
  width: 8px; /* 增加滚动条宽度，便于操作 */
}

.messages-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.messages-container::-webkit-scrollbar-thumb {
  background-color: #c1c1c1;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.messages-container::-webkit-scrollbar-thumb:hover {
  background-color: #a8a8a8;
}

.messages-container::-webkit-scrollbar-thumb:active {
  background-color: #909399;
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
  min-height: min-content; /* 确保内容高度自适应 */
}

.message-item {
  display: flex;
  margin-bottom: 16px;
  align-items: flex-start;
  gap: 12px;
  flex-shrink: 0; /* 防止消息项被压缩 */
}

.message-sent {
  flex-direction: row-reverse;
}

.message-received {
  flex-direction: row;
}

.message-content {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
  max-width: 70%;
}

.message-sent .message-content {
  align-items: flex-end;
}

.message-received .message-content {
  align-items: flex-start;
}

.message-text-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 6px;
}

.message-sent .message-text-wrapper {
  flex-direction: row-reverse;
}

.message-status {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-bottom: 2px;
}

.status-loading {
  animation: rotate 1s linear infinite;
}

.status-error {
  cursor: pointer;
}

.status-sent {
  color: #67c23a;
  font-size: 12px;
  font-weight: bold;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.message-text {
  padding: 12px 16px;
  border-radius: 20px;
  word-wrap: break-word;
  word-break: break-word; /* 强制长单词换行 */
  overflow-wrap: break-word; /* 现代浏览器的换行属性 */
  line-height: 1.5;
  font-size: 14px;
  max-width: 100%;
  position: relative;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  white-space: pre-wrap; /* 保留换行符和空格 */
  overflow: hidden; /* 防止内容溢出 */
}

.message-sent .message-text {
  background: linear-gradient(135deg, #409eff 0%, #67c23a 100%);
  color: white;
  border-bottom-right-radius: 8px;
}

.message-received .message-text {
  background-color: #f8f9fa;
  color: #303133;
  border: 1px solid #e4e7ed;
  border-bottom-left-radius: 8px;
}

.message-time {
  font-size: 11px;
  color: #909399;
  margin-top: 6px;
  padding: 0 4px;
  white-space: nowrap;
}

.message-sent .message-time {
  text-align: right;
}

.message-received .message-time {
  text-align: left;
}

.message-input-container {
  flex-shrink: 0; /* 防止输入框被压缩 */
  border-top: 1px solid #e4e7ed;
  padding: 16px 20px;
  background-color: #fff;
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

/* 历史消息相关样式 */
.history-loading,
.history-error,
.no-more-history {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 16px;
  margin-bottom: 16px;
  border-radius: 8px;
  font-size: 14px;
  gap: 8px;
}

.history-loading {
  background-color: #f0f9ff;
  color: #409eff;
  border: 1px solid #b3d8ff;
}

.history-error {
  background-color: #fef0f0;
  color: #f56c6c;
  border: 1px solid #fbc4c4;
}

.no-more-history {
  background-color: #f5f7fa;
  color: #909399;
  border: 1px solid #dcdfe6;
  font-size: 12px;
}

.history-loading .el-icon {
  animation: rotate 1s linear infinite;
}

.history-error .el-button {
  margin-left: 8px;
  padding: 4px 8px;
  font-size: 12px;
}
</style>