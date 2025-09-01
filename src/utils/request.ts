import axios, { type AxiosInstance, type AxiosResponse } from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'
import { ElMessage } from 'element-plus'
import { getSaToken, removeSaToken } from '@/utils/cookie'
import router from '@/router'

// 基础响应接口
export interface BaseResponse<T = any> {
  code: number
  data: T
  message: string
}

// 创建axios实例
const service: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
  timeout: 10000,
  withCredentials: true, // 允许跨域请求携带cookie
  headers: {
    'Content-Type': 'application/json;charset=UTF-8'
  }
})

// 请求拦截器
service.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 不需要token验证的接口列表
    const noAuthUrls = ['/user/login', '/user/register']
    const needsAuth = !noAuthUrls.some(url => config.url?.includes(url))
    
    // 只有需要认证的接口才添加token
    if (needsAuth) {
      const token = getSaToken()
      if (token && config.headers) {
        config.headers['satoken'] = token
      }
    }
    
    return config
  },
  (error) => {
    console.error('请求错误:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
service.interceptors.response.use(
  (response: AxiosResponse<BaseResponse>) => {
    const { code, data, message } = response.data
    
    // 请求成功
    if (code === 0) {
      return response
    }
    
    // 业务错误
    ElMessage.error(message || '请求失败')
    return Promise.reject(new Error(message || '请求失败'))
  },
  (error) => {
    console.error('响应错误:', error)
    
    // 处理HTTP状态码错误
    if (error.response) {
      const { status } = error.response
      
      switch (status) {
        case 401:
          ElMessage.error('登录已过期，请重新登录')
          // 清除token并跳转到登录页
          removeSaToken()
          localStorage.removeItem('userInfo')
          router.push('/login')
          break
        case 403:
          ElMessage.error('权限不足')
          break
        case 404:
          ElMessage.error('请求的资源不存在')
          break
        case 500:
          ElMessage.error('服务器内部错误')
          break
        default:
          ElMessage.error('网络错误')
      }
    } else if (error.code === 'ECONNABORTED') {
      ElMessage.error('请求超时')
    } else {
      ElMessage.error('网络连接失败')
    }
    
    return Promise.reject(error)
  }
)

// 封装请求方法
export const request = {
  get<T = any>(url: string, params?: any): Promise<BaseResponse<T>> {
    return service.get(url, { params }).then(res => res.data)
  },
  
  post<T = any>(url: string, data?: any): Promise<BaseResponse<T>> {
    return service.post(url, data).then(res => res.data)
  },
  
  put<T = any>(url: string, data?: any): Promise<BaseResponse<T>> {
    return service.put(url, data).then(res => res.data)
  },
  
  delete<T = any>(url: string, params?: any): Promise<BaseResponse<T>> {
    return service.delete(url, { params }).then(res => res.data)
  }
}

export default service