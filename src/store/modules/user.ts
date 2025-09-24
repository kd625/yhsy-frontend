import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { UserVO, UserLoginRequest, UserRegisterRequest, CaptchaVO } from '@/types/user'
import { request } from '@/utils/request'
import service from '@/utils/request'
import { ElMessage } from 'element-plus'
import { getSaToken, setSaToken, removeSaToken, clearAuth, getUserInfo, setUserInfo as setUserInfoToStorage } from '@/utils/auth'
import router from '@/router'
import { initIMConnection, disconnectIM } from '@/utils/im'

export const useUserStore = defineStore('user', () => {
  // 状态
  const userInfo = ref<UserVO | null>(null)
  const token = ref<string | null>(getSaToken())
  const isInitialized = ref<boolean>(false) // 添加初始化状态标记
  
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
  
  const logout = async (redirectToLogin: boolean = true) => {
    try {
      // 调用退出登录API，确保服务器端会话终止
      await logoutApi()
    } catch (error) {
      console.error('退出登录API调用失败:', error)
      // 即使API调用失败，也要清除本地状态
    } finally {
      // 断开IM连接
      disconnectIM()
      
      // 清除本地状态
      setUserInfo(null)
      setToken(null)
      
      // 重置初始化状态
      isInitialized.value = false
      
      // 完全清除客户端存储的所有认证信息
      clearAuth()
      
      // 清除sessionStorage中可能存在的认证信息
      sessionStorage.clear()
      
      // 如果需要重定向到登录页面
      if (redirectToLogin) {
        // 使用replace而不是push，防止用户通过后退按钮返回
        await router.replace('/login')
        
        // 强制刷新页面，确保所有状态完全重置
        window.location.reload()
      }
    }
  }
  
  // API调用方法
  const getCaptcha = async () => {
    try {
      const response = await request.get('/user/captcha')
      if (response.code === 0 && response.data) {
        return { success: true, data: response.data as CaptchaVO }
      }
      return { success: false, message: response.message }
    } catch (error: any) {
      console.error('获取验证码失败:', error)
      return { success: false, message: error.message || '获取验证码失败' }
    }
  }

  const login = async (loginData: UserLoginRequest) => {
    try {
      // 直接使用axios来获取完整的响应，包括响应头
      const axiosResponse = await service.post('/user/login', loginData)
      const response = axiosResponse.data
      
      if (response.code === 0 && response.data) {
        // 登录成功后，从响应头中获取satoken
        const tokenFromHeader = axiosResponse.headers['satoken']
        
        // 设置用户信息
         setUserInfo(response.data)
         setUserInfoToStorage(response.data)
        
        // 设置token（从响应头获取）
        if (tokenFromHeader) {
          setToken(tokenFromHeader)
          console.log('从响应头获取到satoken')
          
          // 登录成功后立即初始化IM连接
          await initIMConnection(tokenFromHeader)
        } else {
          console.warn('响应头中未找到satoken')
        }
        
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

  // 检查是否为管理员
  const checkIsAdmin = async () => {
    try {
      const response = await request.get<boolean>('/user/isAdmin')
      if (response.code === 0) {
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message, data: false }
    } catch (error: any) {
      console.error('检查管理员权限失败:', error)
      return { success: false, message: error.message || '检查管理员权限失败', data: false }
    }
  }
  
  // 初始化时从localStorage恢复token和用户信息
  const initializeAuth = async () => {
    // 如果已经初始化过，直接返回
    if (isInitialized.value) {
      return
    }
    
    const savedToken = getSaToken()
    const savedUserInfo = getUserInfo()
    
    if (savedToken) {
      token.value = savedToken
      
      if (savedUserInfo) {
        userInfo.value = savedUserInfo
      }
      
      // 验证token有效性并获取最新用户信息
      const result = await getCurrentUser()
      if (!result.success) {
        logout()
      }
    }
    
    // 标记为已初始化
    isInitialized.value = true
  }
  
  return {
    // 状态
    userInfo,
    token,
    isInitialized,
    // 计算属性
    isLogin,
    isAdmin,
    // 操作
    setUserInfo,
    setToken,
    setLogin,
    logout,
    // API方法
    getCaptcha,
    login,
    register,
    getCurrentUser,
    logoutApi,
    checkIsAdmin,
    initializeAuth
  }
})