<template>
  <div class="api-test">
    <h2>API测试页面</h2>
    
    <div class="test-section">
      <h3>用户管理API测试</h3>
      <el-button @click="testUserListApi" type="primary">测试用户列表API</el-button>
      <div v-if="userResult" class="result">
        <h4>用户API结果:</h4>
        <pre>{{ userResult }}</pre>
      </div>
    </div>
    
    <div class="test-section">
      <h3>图书管理API测试</h3>
      <el-button @click="testBookListApi" type="primary">测试图书列表API</el-button>
      <div v-if="bookResult" class="result">
        <h4>图书API结果:</h4>
        <pre>{{ bookResult }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { request } from '@/utils/request'
import { ElButton, ElMessage } from 'element-plus'

const userResult = ref('')
const bookResult = ref('')

const testUserListApi = async () => {
  try {
    console.log('开始测试用户列表API...')
    const params = {
      current: 1,
      pageSize: 10
    }
    console.log('请求参数:', params)
    
    const response = await request.get('/admin/user/list/page', params)
    console.log('API响应:', response)
    
    userResult.value = JSON.stringify(response, null, 2)
    ElMessage.success('用户API测试成功')
  } catch (error: any) {
    console.error('用户API测试失败:', error)
    console.error('错误详情:', error.response?.data)
    console.error('请求配置:', error.config)
    
    userResult.value = JSON.stringify({
      error: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      config: {
        method: error.config?.method,
        url: error.config?.url,
        params: error.config?.params
      }
    }, null, 2)
    
    ElMessage.error(`用户API测试失败: ${error.response?.data?.message || error.message}`)
  }
}

const testBookListApi = async () => {
  try {
    console.log('开始测试图书列表API...')
    const requestData = {
      current: 1,
      pageSize: 10
    }
    console.log('请求参数:', requestData)
    
    const response = await request.post('/admin/book/list/page', requestData)
    console.log('API响应:', response)
    
    bookResult.value = JSON.stringify(response, null, 2)
    ElMessage.success('图书API测试成功')
  } catch (error: any) {
    console.error('图书API测试失败:', error)
    console.error('错误详情:', error.response?.data)
    console.error('请求配置:', error.config)
    
    bookResult.value = JSON.stringify({
      error: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      config: {
        method: error.config?.method,
        url: error.config?.url,
        params: error.config?.params
      }
    }, null, 2)
    
    ElMessage.error(`图书API测试失败: ${error.response?.data?.message || error.message}`)
  }
}
</script>

<style scoped>
.api-test {
  padding: 20px;
}

.test-section {
  margin-bottom: 30px;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.result {
  margin-top: 15px;
  padding: 10px;
  background-color: #f5f5f5;
  border-radius: 4px;
}

pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  max-height: 400px;
  overflow-y: auto;
}
</style>