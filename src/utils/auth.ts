/**
 * 认证工具函数
 * 基于localStorage的token管理
 */

/**
 * 获取 Sa-Token
 * @returns Sa-Token 值
 */
export function getSaToken(): string | null {
  return localStorage.getItem('satoken')
}

/**
 * 设置 Sa-Token
 * @param token Sa-Token 值
 */
export function setSaToken(token: string): void {
  localStorage.setItem('satoken', token)
}

/**
 * 删除 Sa-Token
 */
export function removeSaToken(): void {
  localStorage.removeItem('satoken')
}

/**
 * 检查用户是否已登录
 * @returns 是否已登录
 */
export function isLoggedIn(): boolean {
  const token = getSaToken()
  const userInfo = localStorage.getItem('userInfo')
  return !!(token && userInfo)
}

/**
 * 清除所有认证信息
 * 确保完全清除客户端存储的所有认证相关数据
 */
export function clearAuth(): void {
  // 清除localStorage中的认证信息
  localStorage.removeItem('satoken')
  localStorage.removeItem('userInfo')
  
  // 清除可能存在的其他认证相关数据
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  localStorage.removeItem('loginTime')
  
  // 清除sessionStorage中的认证信息
  sessionStorage.removeItem('satoken')
  sessionStorage.removeItem('userInfo')
  sessionStorage.removeItem('token')
  sessionStorage.removeItem('user')
  
  // 清除可能的cookie（如果有的话）
  document.cookie.split(";").forEach(function(c) { 
    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
  });
}

/**
 * 获取用户信息
 * @returns 用户信息对象或null
 */
export function getUserInfo(): any | null {
  const userInfoStr = localStorage.getItem('userInfo')
  if (userInfoStr) {
    try {
      return JSON.parse(userInfoStr)
    } catch (error) {
      console.error('解析用户信息失败:', error)
      return null
    }
  }
  return null
}

/**
 * 设置用户信息
 * @param userInfo 用户信息对象
 */
export function setUserInfo(userInfo: any): void {
  localStorage.setItem('userInfo', JSON.stringify(userInfo))
}