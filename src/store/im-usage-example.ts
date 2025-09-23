// IM Store 使用示例
// 这个文件展示了如何在Vue组件中使用IM Store

import { useIMStore } from '@/store/im'
import { useUserStore } from '@/store/modules/user'
import { ref } from 'vue'

// 示例1: 在组件中初始化和连接IM
export function useIMConnection() {
  const imStore = useIMStore()
  const userStore = useUserStore()
  
  const isConnecting = ref(false)
  const connectionError = ref<string | null>(null)

  const initializeAndConnect = async () => {
    try {
      isConnecting.value = true
      connectionError.value = null

      // 确保用户已登录
      if (!userStore.isLogin || !userStore.token) {
        throw new Error('用户未登录')
      }

      // 初始化IM客户端
      imStore.initialize(userStore.token)

      // 连接IM服务器
      await imStore.connectIM()
      
      console.log('IM连接成功')
    } catch (error: any) {
      connectionError.value = error.message
      console.error('IM连接失败:', error)
    } finally {
      isConnecting.value = false
    }
  }

  const disconnect = () => {
    imStore.disconnect()
  }

  return {
    isConnecting,
    connectionError,
    initializeAndConnect,
    disconnect,
    isConnected: imStore.isConnected,
    isAuthenticated: imStore.isAuthenticated,
    isReady: imStore.isReady
  }
}

// 示例2: 聊天功能组合式函数
export function useChat() {
  const imStore = useIMStore()
  
  const sendMessage = async (toUserId: string, content: string) => {
    try {
      if (!imStore.isReady) {
        throw new Error('IM客户端未就绪')
      }
      
      // 生成或获取sessionId，这里使用简单的方式生成
      const sessionId = `session_${toUserId}_${Date.now()}`
      await imStore.sendMessage(toUserId, sessionId, content)
      console.log('消息发送成功')
    } catch (error) {
      console.error('发送消息失败:', error)
      throw error
    }
  }

  const setCurrentChat = (userId: string) => {
    imStore.setCurrentConversation(userId)
  }

  const clearChat = (userId: string) => {
    imStore.clearConversation(userId)
  }

  return {
    sendMessage,
    setCurrentChat,
    clearChat,
    conversations: imStore.getConversationList,
    currentConversation: imStore.currentConversation,
    totalUnreadCount: imStore.totalUnreadCount
  }
}

// 示例3: 在Vue组件中的完整使用
/*
<template>
  <div class="chat-container">
    <!-- 连接状态 -->
    <div class="connection-status">
      <span v-if="isConnecting">正在连接...</span>
      <span v-else-if="isReady" class="connected">已连接</span>
      <span v-else class="disconnected">未连接</span>
      <span v-if="connectionError" class="error">{{ connectionError }}</span>
    </div>

    <!-- 会话列表 -->
    <div class="conversation-list">
      <div 
        v-for="conversation in conversations" 
        :key="conversation.userId"
        @click="setCurrentChat(conversation.userId)"
        :class="{ active: currentConversation?.userId === conversation.userId }"
        class="conversation-item"
      >
        <div class="user-info">
          <img :src="conversation.userAvatar" :alt="conversation.userName" />
          <span>{{ conversation.userName || conversation.userId }}</span>
        </div>
        <div class="last-message">{{ conversation.lastMessage?.content }}</div>
        <div v-if="conversation.unreadCount > 0" class="unread-count">
          {{ conversation.unreadCount }}
        </div>
      </div>
    </div>

    <!-- 聊天窗口 -->
    <div v-if="currentConversation" class="chat-window">
      <div class="messages">
        <div 
          v-for="message in currentConversation.messages" 
          :key="message.id"
          :class="['message', message.type]"
        >
          <div class="content">{{ message.content }}</div>
          <div class="timestamp">{{ formatTime(message.timestamp) }}</div>
        </div>
      </div>
      
      <div class="message-input">
        <input 
          v-model="newMessage" 
          @keyup.enter="handleSendMessage"
          placeholder="输入消息..."
        />
        <button @click="handleSendMessage" :disabled="!newMessage.trim()">
          发送
        </button>
      </div>
    </div>

    <!-- 总未读数 -->
    <div v-if="totalUnreadCount > 0" class="total-unread">
      总未读: {{ totalUnreadCount }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useIMConnection, useChat } from '@/store/im-usage-example'

const {
  isConnecting,
  connectionError,
  initializeAndConnect,
  disconnect,
  isConnected,
  isAuthenticated,
  isReady
} = useIMConnection()

const {
  sendMessage,
  setCurrentChat,
  clearChat,
  conversations,
  currentConversation,
  totalUnreadCount
} = useChat()

const newMessage = ref('')

const handleSendMessage = async () => {
  if (!newMessage.value.trim() || !currentConversation.value) return
  
  try {
    await sendMessage(currentConversation.value.userId, newMessage.value)
    newMessage.value = ''
  } catch (error) {
    console.error('发送消息失败:', error)
  }
}

const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString()
}

onMounted(() => {
  // 组件挂载时自动连接
  initializeAndConnect()
})

onUnmounted(() => {
  // 组件卸载时断开连接
  disconnect()
})
</script>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.connection-status {
  padding: 10px;
  background: #f5f5f5;
}

.connected {
  color: green;
}

.disconnected {
  color: red;
}

.error {
  color: red;
  margin-left: 10px;
}

.conversation-list {
  flex: 1;
  overflow-y: auto;
}

.conversation-item {
  display: flex;
  align-items: center;
  padding: 10px;
  border-bottom: 1px solid #eee;
  cursor: pointer;
}

.conversation-item:hover {
  background: #f0f0f0;
}

.conversation-item.active {
  background: #e3f2fd;
}

.user-info {
  display: flex;
  align-items: center;
  flex: 1;
}

.user-info img {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  margin-right: 10px;
}

.last-message {
  color: #666;
  font-size: 12px;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.unread-count {
  background: red;
  color: white;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

.chat-window {
  flex: 2;
  display: flex;
  flex-direction: column;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

.message {
  margin-bottom: 10px;
}

.message.sent {
  text-align: right;
}

.message.received {
  text-align: left;
}

.message .content {
  display: inline-block;
  padding: 8px 12px;
  border-radius: 8px;
  max-width: 70%;
}

.message.sent .content {
  background: #007bff;
  color: white;
}

.message.received .content {
  background: #f1f1f1;
  color: black;
}

.message .timestamp {
  font-size: 10px;
  color: #999;
  margin-top: 2px;
}

.message-input {
  display: flex;
  padding: 10px;
  border-top: 1px solid #eee;
}

.message-input input {
  flex: 1;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-right: 10px;
}

.message-input button {
  padding: 8px 16px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.message-input button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.total-unread {
  position: fixed;
  top: 20px;
  right: 20px;
  background: red;
  color: white;
  padding: 5px 10px;
  border-radius: 15px;
  font-size: 12px;
}
</style>
*/