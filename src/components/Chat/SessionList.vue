<template>
  <div class="session-list">
    <!-- 头部 -->
    <div class="session-header">
      <h3>聊天会话</h3>
      <el-button @click="refreshSessions" type="text" size="small" :loading="loading">
        <el-icon><Refresh /></el-icon>
      </el-button>
    </div>

    <!-- 会话列表 -->
    <div class="session-items">
      <div
        v-for="session in sessions"
        :key="session.id"
        :class="['session-item', { active: activeSessionId === session.id }]"
        @click="$emit('selectSession', session)"
      >
        <div class="session-info">
          <div class="session-title">
            <span class="book-name">图书 #{{ session.bookId }}</span>
            <span class="session-id">#{{ session.id }}</span>
          </div>
          <div class="session-users">
            <span class="user-role">
              {{ currentUserId === session.buyerId ? '买家' : '卖家' }}
            </span>
            <span class="separator">·</span>
            <span class="other-user">
              {{ getOtherUserName(session) }}
            </span>
          </div>
          <div class="session-meta">
            <span class="session-status" :class="getStatusClass(session.sessionStatus)">
              {{ getStatusText(session.sessionStatus) }}
            </span>
            <span class="session-time">{{ formatTime(session.expireTime) }}</span>
          </div>
        </div>
        
        <!-- 未读消息数 -->
        <div v-if="getUnreadCount(session.id) > 0" class="unread-badge">
          {{ getUnreadCount(session.id) }}
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="sessions.length === 0 && !loading" class="empty-state">
        <el-empty description="暂无聊天会话" />
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="loading-state">
        <el-skeleton :rows="3" animated />
      </div>
    </div>

    <!-- 创建新会话按钮 -->
    <div class="session-actions">
      <el-button type="primary" @click="$emit('createSession')" :disabled="loading">
        <el-icon><Plus /></el-icon>
        新建会话
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Refresh, Plus } from '@element-plus/icons-vue'
import type { SessionVO } from '../../im/types'

interface Props {
  sessions: SessionVO[]
  activeSessionId?: string  // 修改为string类型
  currentUserId: number
  loading?: boolean
  unreadCounts?: Record<string, number>  // 修改key为string类型
}

interface Emits {
  (e: 'selectSession', session: SessionVO): void
  (e: 'createSession'): void
  (e: 'refresh'): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  unreadCounts: () => ({})
})

const emit = defineEmits<Emits>()

// 方法
const refreshSessions = () => {
  emit('refresh')
}

const getOtherUserName = (session: SessionVO): string => {
  // 这里应该根据实际的用户信息来显示对方的用户名
  // 暂时使用用户ID作为显示
  const otherUserId = props.currentUserId === session.buyerId 
    ? session.sellerId 
    : session.buyerId
  return `用户${otherUserId}`
}

const getStatusText = (status: number): string => {
  const statusMap: Record<number, string> = {
    1: '活跃',
    2: '已过期',
    3: '已关闭'
  }
  return statusMap[status] || '未知'
}

const getStatusClass = (status: number): string => {
  const classMap: Record<number, string> = {
    1: 'status-active',
    2: 'status-expired',
    3: 'status-closed'
  }
  return classMap[status] || ''
}

const getUnreadCount = (sessionId: string): number => {
  return props.unreadCounts[sessionId] || 0
}

const formatTime = (timeStr: string): string => {
  const date = new Date(timeStr)
  const now = new Date()
  
  // 如果是今天，只显示时间
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }
  
  // 如果是昨天
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) {
    return '昨天'
  }
  
  // 如果是本年，显示月日
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit'
    })
  }
  
  // 否则显示年月日
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}
</script>

<style scoped>
.session-list {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-right: 1px solid #e4e7ed;
}

.session-header {
  padding: 16px;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.session-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  color: #303133;
}

.session-items {
  flex: 1;
  overflow-y: auto;
}

.session-item {
  padding: 12px 16px;
  border-bottom: 1px solid #f5f7fa;
  cursor: pointer;
  transition: background-color 0.2s;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.session-item:hover {
  background-color: #f5f7fa;
}

.session-item.active {
  background-color: #ecf5ff;
  border-right: 3px solid #409eff;
}

.session-info {
  flex: 1;
  min-width: 0;
}

.session-title {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
}

.book-name {
  font-weight: 500;
  color: #303133;
  margin-right: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session-id {
  font-size: 12px;
  color: #909399;
}

.session-users {
  font-size: 12px;
  color: #606266;
  margin-bottom: 4px;
}

.user-role {
  font-weight: 500;
}

.separator {
  margin: 0 4px;
}

.session-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
}

.session-status {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
}

.status-active {
  background-color: #e1f3d8;
  color: #67c23a;
}

.status-expired {
  background-color: #fdf6ec;
  color: #e6a23c;
}

.status-closed {
  background-color: #fde2e2;
  color: #f56c6c;
}

.session-time {
  color: #c0c4cc;
}

.unread-badge {
  background-color: #f56c6c;
  color: white;
  border-radius: 10px;
  padding: 2px 6px;
  font-size: 11px;
  min-width: 16px;
  text-align: center;
  margin-left: 8px;
}

.empty-state,
.loading-state {
  padding: 40px 16px;
  text-align: center;
}

.session-actions {
  padding: 16px;
  border-top: 1px solid #e4e7ed;
}

.session-actions .el-button {
  width: 100%;
}

/* 滚动条样式 */
.session-items::-webkit-scrollbar {
  width: 6px;
}

.session-items::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.session-items::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.session-items::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>