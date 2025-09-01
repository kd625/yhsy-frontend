/**
 * Cookie 工具函数
 */

/**
 * 设置 Cookie
 * @param name Cookie 名称
 * @param value Cookie 值
 * @param days 过期天数，默认7天
 */
export function setCookie(name: string, value: string, days: number = 7): void {
  const expires = new Date()
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000)
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`
}

/**
 * 获取 Cookie
 * @param name Cookie 名称
 * @returns Cookie 值，如果不存在返回 null
 */
export function getCookie(name: string): string | null {
  const nameEQ = name + '='
  const ca = document.cookie.split(';')
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i]
    while (c.charAt(0) === ' ') {
      c = c.substring(1, c.length)
    }
    if (c.indexOf(nameEQ) === 0) {
      return c.substring(nameEQ.length, c.length)
    }
  }
  return null
}

/**
 * 删除 Cookie
 * @param name Cookie 名称
 */
export function removeCookie(name: string): void {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/`
}

/**
 * 获取 Sa-Token
 * @returns Sa-Token 值
 */
export function getSaToken(): string | null {
  return getCookie('satoken')
}

/**
 * 设置 Sa-Token
 * @param token Sa-Token 值
 * @param days 过期天数，默认7天
 */
export function setSaToken(token: string, days: number = 7): void {
  setCookie('satoken', token, days)
}

/**
 * 删除 Sa-Token
 */
export function removeSaToken(): void {
  removeCookie('satoken')
}