import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { UserVO } from '@/types/user'

export const useUserStore = defineStore('user', () => {
  // 状态
  const userInfo = ref<UserVO | null>(null)
  const token = ref<string | null>(localStorage.getItem('token'))
  
  // 计算属性
  const isLogin = computed(() => !!token.value && !!userInfo.value)
  const isAdmin = computed(() => userInfo.value?.userRole === 'admin')
  
  // 操作
  const setUserInfo = (info: UserVO | null) => {
    userInfo.value = info
  }
  
  const setToken = (newToken: string | null) => {
    token.value = newToken
    if (newToken) {
      localStorage.setItem('token', newToken)
    } else {
      localStorage.removeItem('token')
    }
  }
  
  const login = (userInfo: UserVO, token: string) => {
    setUserInfo(userInfo)
    setToken(token)
  }
  
  const logout = () => {
    setUserInfo(null)
    setToken(null)
    localStorage.removeItem('userInfo')
  }
  
  // 初始化时从localStorage恢复token和用户信息
  const initializeAuth = () => {
    const savedToken = localStorage.getItem('token')
    const savedUserInfo = localStorage.getItem('userInfo')
    
    if (savedToken && savedUserInfo) {
      token.value = savedToken
      try {
        userInfo.value = JSON.parse(savedUserInfo)
      } catch (error) {
        console.error('Failed to parse saved user info:', error)
        logout()
      }
    }
  }
  
  return {
    // 状态
    userInfo,
    token,
    // 计算属性
    isLogin,
    isAdmin,
    // 操作
    setUserInfo,
    setToken,
    login,
    logout,
    initializeAuth
  }
})