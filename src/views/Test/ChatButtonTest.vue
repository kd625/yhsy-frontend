<template>
  <div class="chat-button-test">
    <h2>ChatButton组件测试页面</h2>
    
    <div class="test-section">
      <h3>测试场景1：正常聊天按钮</h3>
      <div class="test-item">
        <p>卖家ID: 1952889067838066689, 买家ID: 1968230719136280578, 图书ID: 1962479829517881345</p>
        <ChatButton
          :seller-id="1952889067838066689"
          :buyer-id="1968230719136280578"
          :book-id="1962479829517881345"
          button-text="测试聊天"
          @chat-start="handleChatStart"
          @error="handleChatError"
        />
      </div>
    </div>

    <div class="test-section">
      <h3>测试场景2：不同参数的聊天按钮</h3>
      <div class="test-item">
        <p>卖家ID: 123, 买家ID: 456, 图书ID: 789</p>
        <ChatButton
          :seller-id="123"
          :buyer-id="456"
          :book-id="789"
          button-text="测试聊天2"
          @chat-start="handleChatStart"
          @error="handleChatError"
        />
      </div>
    </div>

    <div class="test-section">
      <h3>调试信息</h3>
      <div class="debug-info">
        <h4>最后一次响应:</h4>
        <pre v-if="lastResponse">{{ JSON.stringify(lastResponse, null, 2) }}</pre>
        <p v-else>暂无响应数据</p>
        
        <h4>最后一次错误:</h4>
        <pre v-if="lastError">{{ lastError }}</pre>
        <p v-else>暂无错误</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import ChatButton from '@/im/components/ChatButton.vue'
import type { SessionVO } from '@/im/api/session'

const lastResponse = ref<any>(null)
const lastError = ref<string>('')

const handleChatStart = (session: SessionVO) => {
  console.log('聊天会话已创建:', session)
  lastResponse.value = session
  lastError.value = ''
  ElMessage.success('聊天会话创建成功！')
}

const handleChatError = (error: Error) => {
  console.error('聊天启动失败:', error)
  lastError.value = error.message || error.toString()
  lastResponse.value = null
  ElMessage.error(`聊天启动失败: ${error.message}`)
}
</script>

<style scoped>
.chat-button-test {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.test-section {
  margin-bottom: 30px;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #fff;
}

.test-section h3 {
  margin-top: 0;
  color: #303133;
}

.test-item {
  margin-bottom: 15px;
}

.test-item p {
  margin-bottom: 10px;
  color: #606266;
  font-size: 14px;
}

.debug-info {
  background: #f5f7fa;
  padding: 15px;
  border-radius: 4px;
}

.debug-info h4 {
  margin: 0 0 10px 0;
  color: #303133;
}

.debug-info pre {
  background: #fff;
  padding: 10px;
  border-radius: 4px;
  border: 1px solid #e4e7ed;
  font-size: 12px;
  max-height: 300px;
  overflow-y: auto;
}

.debug-info p {
  color: #909399;
  font-style: italic;
}
</style>