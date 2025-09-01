import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { UserVO, UserLoginRequest, UserRegisterRequest } from '@/types/user'
import { request } from '@/utils/request'
import { ElMessage } from 'element-plus'
import { getSaToken, setSaToken, removeSaToken } from '@/utils/cookie'

export const useUserStore = defineStore('user', () => {
  // 状态
  const userInfo = ref<UserVO | null>(null)
  const token = ref<string | null>(getSaToken())
  
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
      setSaToken(newToken)
    } else {
      removeSaToken()
    }
  }
  
  const setLogin = (userInfo: UserVO, token: string) => {
    setUserInfo(userInfo)
    setToken(token)
    // 同时保存用户信息到localStorage
    localStorage.setItem('userInfo', JSON.stringify(userInfo))
  }
  
  const logout = async () => {
    try {
      // 调用退出登录API
      await logoutApi()
    } catch (error) {
      console.error('退出登录API调用失败:', error)
    } finally {
      // 无论API调用是否成功，都清除本地状态
      setUserInfo(null)
      setToken(null)
      removeSaToken()
      localStorage.removeItem('userInfo')
    }
  }
  
  // API调用方法
  const login = async (loginData: UserLoginRequest) => {
    try {
      const response = await request.post<UserVO>('/user/login', loginData)
      if (response.code === 0 && response.data) {
        // 登录成功后，后端会自动设置satoken到cookie中
        // 先设置用户信息，不设置token
        setUserInfo(response.data)
        localStorage.setItem('userInfo', JSON.stringify(response.data))
        
        // 延迟一下再尝试获取真实token，确保cookie已设置
        setTimeout(() => {
          const realToken = getSaToken()
          if (realToken) {
            setToken(realToken)
          } else {
            console.warn('未能从cookie中获取到satoken')
          }
        }, 100)
        
        ElMessage.success('登录成功')
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error: any) {
      console.error('登录失败:', error)
      return { success: false, message: error.message || '登录失败' }
    }
  }
  
  const register = async (registerData: UserRegisterRequest) => {
    try {
      const response = await request.post<number>('/user/register', registerData)
      if (response.code === 0) {
        ElMessage.success('注册成功，请登录')
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error: any) {
      console.error('注册失败:', error)
      return { success: false, message: error.message || '注册失败' }
    }
  }
  
  const getCurrentUser = async () => {
    try {
      const response = await request.get<UserVO>('/user/get/login')
      if (response.code === 0 && response.data) {
        setUserInfo(response.data)
        localStorage.setItem('userInfo', JSON.stringify(response.data))
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error: any) {
      console.error('获取用户信息失败:', error)
      logout()
      return { success: false, message: error.message || '获取用户信息失败' }
    }
  }
  
  const logoutApi = async () => {
    try {
      const response = await request.post('/user/logout')
      return {
        success: true,
        message: '注销成功',
        data: response
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message || '注销失败'
      }
    }
  }
  
  // 初始化时从cookie恢复token和localStorage恢复用户信息
  const initializeAuth = async () => {
    const savedToken = getSaToken()
    const savedUserInfo = localStorage.getItem('userInfo')
    
    if (savedToken) {
      token.value = savedToken
      
      if (savedUserInfo) {
        try {
          userInfo.value = JSON.parse(savedUserInfo)
        } catch (error) {
          console.error('Failed to parse saved user info:', error)
          localStorage.removeItem('userInfo')
        }
      }
      
      // 验证token有效性并获取最新用户信息
      const result = await getCurrentUser()
      if (!result.success) {
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
    setLogin,
    logout,
    // API方法
    login,
    register,
    getCurrentUser,
    logoutApi,
    initializeAuth
  }
})