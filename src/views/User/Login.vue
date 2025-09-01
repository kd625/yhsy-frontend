<template>
  <div class="login-container">
    <el-card class="login-card">
      <template #header>
        <div class="card-header">
          <h2>登录砚湖书影</h2>
        </div>
      </template>
      
      <el-form
        ref="loginFormRef"
        :model="loginForm"
        :rules="rules"
        label-width="0"
        size="large"
      >
        <el-form-item prop="userAccount">
          <el-input
            v-model="loginForm.userAccount"
            placeholder="请输入账号"
            prefix-icon="User"
          />
        </el-form-item>
        
        <el-form-item prop="userPassword">
          <el-input
            v-model="loginForm.userPassword"
            type="password"
            placeholder="请输入密码"
            prefix-icon="Lock"
            show-password
            @keyup.enter="handleLogin"
          />
        </el-form-item>
        
        <el-form-item>
          <el-button
            type="primary"
            class="login-button"
            :loading="loading"
            @click="handleLogin"
          >
            登录
          </el-button>
        </el-form-item>
      </el-form>
      
      <div class="login-footer">
        <span>还没有账号？</span>
        <el-link type="primary" @click="$router.push('/register')">
          立即注册
        </el-link>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { useUserStore } from '@/store/modules/user'
import type { UserLoginRequest } from '@/types/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const loginFormRef = ref<FormInstance>()
const loading = ref(false)

// 登录表单数据
const loginForm = reactive<UserLoginRequest>({
  userAccount: '',
  userPassword: ''
})

// 表单验证规则
const rules: FormRules<UserLoginRequest> = {
  userAccount: [
    { required: true, message: '请输入账号', trigger: 'blur' },
    { min: 4, max: 16, message: '账号长度为4-16位', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9_]+$/, message: '账号只能包含字母、数字和下划线', trigger: 'blur' }
  ],
  userPassword: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 8, max: 20, message: '密码长度为8-20位', trigger: 'blur' }
  ]
}

// 处理登录
const handleLogin = async () => {
  if (!loginFormRef.value) return
  
  try {
    const valid = await loginFormRef.value.validate()
    if (!valid) return
    
    loading.value = true
    
    // 调用API登录
    const result = await userStore.login(loginForm)
    
    if (result.success) {
      ElMessage.success('登录成功')
      // 跳转到原来要访问的页面或首页
      const redirect = route.query.redirect as string
      router.push(redirect || '/')
    } else {
      ElMessage.error(result.message || '登录失败')
    }
    
  } catch (error) {
    console.error('登录失败:', error)
    ElMessage.error('登录失败，请重试')
  } finally {
    loading.value = false
  }
}

// 重置表单
const resetForm = () => {
  if (loginFormRef.value) {
    loginFormRef.value.resetFields()
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
  padding: 20px;
}

.login-card {
  width: 100%;
  max-width: 400px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card-header {
  text-align: center;
}

.card-header h2 {
  color: #303133;
  margin: 0;
}

.login-button {
  width: 100%;
}

.login-footer {
  text-align: center;
  margin-top: 20px;
  color: #606266;
}

.login-footer span {
  margin-right: 8px;
}
</style>