/**
 * 简单的事件发射器实现
 */
export class EventEmitter {
  private events: Map<string, Function[]> = new Map()

  /**
   * 监听事件
   */
  on(event: string, callback: Function): void {
    if (!this.events.has(event)) {
      this.events.set(event, [])
    }
    this.events.get(event)!.push(callback)
  }

  /**
   * 监听事件（只触发一次）
   */
  once(event: string, callback: Function): void {
    const onceCallback = (...args: any[]) => {
      callback(...args)
      this.off(event, onceCallback)
    }
    this.on(event, onceCallback)
  }

  /**
   * 移除事件监听
   */
  off(event: string, callback?: Function): void {
    if (!this.events.has(event)) {
      return
    }

    if (!callback) {
      // 移除所有监听器
      this.events.delete(event)
      return
    }

    const callbacks = this.events.get(event)!
    const index = callbacks.indexOf(callback)
    if (index > -1) {
      callbacks.splice(index, 1)
    }

    if (callbacks.length === 0) {
      this.events.delete(event)
    }
  }

  /**
   * 触发事件
   */
  emit(event: string, ...args: any[]): void {
    if (!this.events.has(event)) {
      return
    }

    const callbacks = this.events.get(event)!
    callbacks.forEach(callback => {
      try {
        callback(...args)
      } catch (error) {
        console.error(`Error in event callback for "${event}":`, error)
      }
    })
  }

  /**
   * 获取事件监听器数量
   */
  listenerCount(event: string): number {
    return this.events.get(event)?.length || 0
  }

  /**
   * 获取所有事件名称
   */
  eventNames(): string[] {
    return Array.from(this.events.keys())
  }

  /**
   * 清除所有事件监听器
   */
  removeAllListeners(): void {
    this.events.clear()
  }
}