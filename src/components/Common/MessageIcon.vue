<template>
  <div class="message-icon-container">
    <!-- 消息图标 -->
    <el-dropdown
      @visible-change="handleDropdownVisibleChange"
      placement="bottom-end"
      trigger="click"
      :hide-on-click="false"
    >
      <div class="message-icon" @click="handleIconClick">
        <el-icon :size="20">
          <ChatDotRound />
        </el-icon>
        <!-- 未读消息红点 -->
        <el-badge
          v-if="hasUnreadMessages"
          :value="unreadCount > 99 ? '99+' : unreadCount"
          :max="99"
          class="message-badge"
        />
      </div>
      
      <template #dropdown>
        <div class="message-dropdown">
          <!-- 会话列表头部 -->
          <div class="dropdown-header">
            <span class="header-title">消息</span>
            <el-button
              v-if="hasUnreadMessages"
              type="text"
              size="small"
              @click="markAllAsRead"
            >
              全部已读
            </el-button>
          </div>
          
          <!-- 会话列表 -->
          <div class="conversation-list">
            <div v-if="loading" class="loading-container">
              <el-icon class="is-loading"><Loading /></el-icon>
              <span>加载中...</span>
            </div>
            
            <div v-else-if="conversations.length === 0" class="empty-container">
              <el-icon><ChatDotRound /></el-icon>
              <span>暂无消息</span>
            </div>
            
            <div
              v-else
              v-for="conversation in conversations"
              :key="conversation.sessionId"
              class="conversation-item"
              @click="handleConversationClick(conversation)"
            >
              <!-- 用户头像 -->
              <el-avatar :size="40" :src="conversation.userAvatar" class="conversation-avatar">
                <el-icon><User /></el-icon>
              </el-avatar>
              
              <!-- 会话信息 -->
              <div class="conversation-info">
                <div class="conversation-header">
                  <span class="user-name">{{ conversation.userName }}</span>
                  <span class="last-time">{{ formatTime(conversation.lastMsgTime) }}</span>
                </div>
                <div class="conversation-content">
                  <span class="last-message">{{ conversation.lastMsg || '暂无消息' }}</span>
                  <el-badge
                    v-if="conversation.unReadMsgCount > 0"
                    :value="conversation.unReadMsgCount > 99 ? '99+' : conversation.unReadMsgCount"
                    :max="99"
                    class="unread-badge"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </el-dropdown>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ChatDotRound, User, Loading } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useIMStore } from '@/store/im'
import { useUserStore } from '@/store/modules/user'
import { request } from '@/utils/request'

// 接口类型定义
interface SessionVO {
  sessionId: string
  userId: string
  userName: string
  userAvatar: string
  lastMsg: string
  lastMsgTime: string
  unReadMsgCount: number
}

interface SessionCurrentResponse {
  hasUnReadMsg: boolean
  sessionVOList: SessionVO[]
}

const router = useRouter()
const imStore = useIMStore()
const userStore = useUserStore()

// 响应式数据
const loading = ref(false)
const conversations = ref<SessionVO[]>([])
const hasUnreadMessages = ref(false)

// 计算属性
const unreadCount = computed(() => {
  return conversations.value.reduce((total, conv) => total + conv.unReadMsgCount, 0)
})

// 获取当前会话状态
const getCurrentSessions = async () => {
  if (!userStore.isLogin) return
  
  try {
    loading.value = true
    const response = await request.post<SessionCurrentResponse>('/im/session/getCurrent', {
      userId: userStore.userInfo?.id
    })
    
    if (response.data) {
      hasUnreadMessages.value = response.data.hasUnReadMsg
      conversations.value = response.data.sessionVOList || []
    }
  } catch (error) {
    console.error('获取会话列表失败:', error)
    ElMessage.error('获取消息列表失败')
  } finally {
    loading.value = false
  }
}

// 处理图标点击
const handleIconClick = () => {
  if (!userStore.isLogin) {
    ElMessage.warning('请先登录')
    router.push('/login')
    return
  }
  
  // 获取最新的会话列表
  getCurrentSessions()
}

// 处理下拉框显示状态变化
const handleDropdownVisibleChange = (visible: boolean) => {
  if (visible && userStore.isLogin) {
    getCurrentSessions()
  }
}

// 处理会话点击
const handleConversationClick = (conversation: SessionVO) => {
  // 跳转到单聊界面
  router.push(`/chat/${conversation.sessionId}`)
}

// 标记所有消息为已读
const markAllAsRead = async () => {
  try {
    // 这里可以调用标记已读的API
    // await request.post('/im/session/markAllRead')
    
    // 临时处理：清除本地未读状态
    conversations.value.forEach(conv => {
      conv.unReadMsgCount = 0
    })
    hasUnreadMessages.value = false
    
    ElMessage.success('已标记全部消息为已读')
  } catch (error) {
    console.error('标记已读失败:', error)
    ElMessage.error('操作失败')
  }
}

// 格式化时间
const formatTime = (timeStr: string) => {
  if (!timeStr) return ''
  
  const time = new Date(timeStr)
  const now = new Date()
  const diff = now.getTime() - time.getTime()
  
  // 小于1分钟
  if (diff < 60 * 1000) {
    return '刚刚'
  }
  
  // 小于1小时
  if (diff < 60 * 60 * 1000) {
    return `${Math.floor(diff / (60 * 1000))}分钟前`
  }
  
  // 小于1天
  if (diff < 24 * 60 * 60 * 1000) {
    return `${Math.floor(diff / (60 * 60 * 1000))}小时前`
  }
  
  // 大于1天，显示具体日期
  const month = time.getMonth() + 1
  const day = time.getDate()
  return `${month}月${day}日`
}

// 监听IM消息，实时更新未读状态
const handleNewMessage = () => {
  // 当收到新消息时，刷新会话列表
  if (userStore.isLogin) {
    getCurrentSessions()
  }
}

// 组件挂载时初始化
onMounted(() => {
  if (userStore.isLogin) {
    getCurrentSessions()
  }
  
  // 监听IM消息事件
  if (imStore.client) {
    // 这里可以监听IM消息事件来实时更新
    // imStore.client.on('messageReceived', handleNewMessage)
  }
})

// 组件卸载时清理
onUnmounted(() => {
  // 清理事件监听
  if (imStore.client) {
    // imStore.client.off('messageReceived', handleNewMessage)
  }
})
</script>

<style scoped>
.message-icon-container {
  position: relative;
  display: inline-block;
}

.message-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  cursor: pointer;
  transition: background-color 0.3s;
  position: relative;
}

.message-icon:hover {
  background-color: #f5f7fa;
}

.message-badge {
  position: absolute;
  top: -2px;
  right: -2px;
}

.message-dropdown {
  width: 320px;
  max-height: 400px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.dropdown-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
}

.header-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.conversation-list {
  max-height: 300px;
  overflow-y: auto;
}

.loading-container,
.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: #909399;
}

.loading-container .el-icon {
  font-size: 24px;
  margin-bottom: 8px;
}

.empty-container .el-icon {
  font-size: 48px;
  margin-bottom: 12px;
  color: #c0c4cc;
}

.conversation-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.conversation-item:hover {
  background-color: #f5f7fa;
}

.conversation-avatar {
  margin-right: 12px;
  flex-shrink: 0;
}

.conversation-info {
  flex: 1;
  min-width: 0;
}

.conversation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.user-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.last-time {
  font-size: 12px;
  color: #909399;
  flex-shrink: 0;
  margin-left: 8px;
}

.conversation-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.last-message {
  font-size: 13px;
  color: #606266;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.unread-badge {
  flex-shrink: 0;
  margin-left: 8px;
}

/* 滚动条样式 */
.conversation-list::-webkit-scrollbar {
  width: 4px;
}

.conversation-list::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 2px;
}

.conversation-list::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 2px;
}

.conversation-list::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>