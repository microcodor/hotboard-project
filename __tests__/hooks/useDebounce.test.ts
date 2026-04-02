/**
 * 防抖 Hook 测试
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { useDebounce, useDebouncedValue } from '../hooks/useDebounce'

// 模拟 jest 计时器
jest.useFakeTimers()

describe('useDebounce', () => {
  it('应该延迟执行回调', async () => {
    const callback = jest.fn()
    const { result } = renderHook(() => useDebounce(callback, 500))

    // 立即调用
    act(() => {
      result.current('test')
    })

    // 回调不应立即执行
    expect(callback).not.toHaveBeenCalled()

    // 等待延迟时间
    act(() => {
      jest.advanceTimersByTime(500)
    })

    // 回调应该被执行
    expect(callback).toHaveBeenCalledWith('test')
  })

  it('应该在延迟期间清除之前的定时器', () => {
    const callback = jest.fn()
    const { result } = renderHook(() => useDebounce(callback, 500))

    // 连续调用多次
    act(() => {
      result.current('test1')
      result.current('test2')
      result.current('test3')
    })

    // 只推进时间到第一次调用后
    act(() => {
      jest.advanceTimersByTime(500)
    })

    // 回调应该只执行一次，参数为最后一次调用
    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith('test3')
  })

  it('组件卸载时应该清除定时器', () => {
    const callback = jest.fn()
    const { unmount } = renderHook(() => useDebounce(callback, 500))

    act(() => {
      result.current('test')
    })

    unmount()

    act(() => {
      jest.advanceTimersByTime(500)
    })

    expect(callback).not.toHaveBeenCalled()
  })
})

describe('useDebouncedValue', () => {
  it('应该延迟更新值', async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebouncedValue(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    )

    // 初始值
    expect(result.current).toBe('initial')

    // 更新值
    rerender({ value: 'updated', delay: 500 })

    // 值不应立即更新
    expect(result.current).toBe('initial')

    // 等待延迟时间
    await waitFor(() => {
      jest.advanceTimersByTime(500)
    })

    // 值应该更新
    expect(result.current).toBe('updated')
  })
})
