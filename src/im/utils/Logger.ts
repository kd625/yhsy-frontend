/**
 * IM模块日志工具
 */

export const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
} as const

export type LogLevelType = typeof LogLevel[keyof typeof LogLevel]

export interface LogEntry {
  level: LogLevelType
  message: string
  data?: any
  timestamp: number
  module?: string
}

export class IMLogger {
  private static instance: IMLogger
  private logLevel: LogLevelType = LogLevel.INFO
  private logs: LogEntry[] = []
  private maxLogs = 1000

  private constructor() {}

  static getInstance(): IMLogger {
    if (!IMLogger.instance) {
      IMLogger.instance = new IMLogger()
    }
    return IMLogger.instance
  }

  /**
   * 设置日志级别
   */
  setLogLevel(level: LogLevelType): void {
    this.logLevel = level
  }

  /**
   * 记录调试日志
   */
  debug(message: string, data?: any, module?: string): void {
    this.log(LogLevel.DEBUG, message, data, module)
  }

  /**
   * 记录信息日志
   */
  info(message: string, data?: any, module?: string): void {
    this.log(LogLevel.INFO, message, data, module)
  }

  /**
   * 记录警告日志
   */
  warn(message: string, data?: any, module?: string): void {
    this.log(LogLevel.WARN, message, data, module)
  }

  /**
   * 记录错误日志
   */
  error(message: string, data?: any, module?: string): void {
    this.log(LogLevel.ERROR, message, data, module)
  }

  /**
   * 记录日志
   */
  private log(level: LogLevelType, message: string, data?: any, module?: string): void {
    if (level < this.logLevel) {
      return
    }

    const entry: LogEntry = {
      level,
      message,
      data,
      timestamp: Date.now(),
      module
    }

    // 添加到日志列表
    this.logs.push(entry)
    
    // 限制日志数量
    if (this.logs.length > this.maxLogs) {
      this.logs.shift()
    }

    // 输出到控制台
    this.outputToConsole(entry)
  }

  /**
   * 输出到控制台
   */
  private outputToConsole(entry: LogEntry): void {
    const timestamp = new Date(entry.timestamp).toISOString()
    const modulePrefix = entry.module ? `[${entry.module}]` : '[IM]'
    const logMessage = `${timestamp} ${modulePrefix} ${entry.message}`

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(logMessage, entry.data)
        break
      case LogLevel.INFO:
        console.info(logMessage, entry.data)
        break
      case LogLevel.WARN:
        console.warn(logMessage, entry.data)
        break
      case LogLevel.ERROR:
        console.error(logMessage, entry.data)
        break
    }
  }

  /**
   * 获取所有日志
   */
  getLogs(): LogEntry[] {
    return [...this.logs]
  }

  /**
   * 获取指定级别的日志
   */
  getLogsByLevel(level: LogLevelType): LogEntry[] {
    return this.logs.filter(log => log.level === level)
  }

  /**
   * 获取指定模块的日志
   */
  getLogsByModule(module: string): LogEntry[] {
    return this.logs.filter(log => log.module === module)
  }

  /**
   * 清空日志
   */
  clearLogs(): void {
    this.logs = []
  }

  /**
   * 导出日志为JSON字符串
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2)
  }
}

// 创建全局实例
export const logger = IMLogger.getInstance()

// 便捷方法
export const logDebug = (message: string, data?: any, module?: string) => 
  logger.debug(message, data, module)

export const logInfo = (message: string, data?: any, module?: string) => 
  logger.info(message, data, module)

export const logWarn = (message: string, data?: any, module?: string) => 
  logger.warn(message, data, module)

export const logError = (message: string, data?: any, module?: string) => 
  logger.error(message, data, module)