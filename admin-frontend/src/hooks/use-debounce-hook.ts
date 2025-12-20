/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useRef } from "react"

/**
 * @description debounce hooks
 * */
const useDebounce = () => {
  return {
    debounce: function useDebounce<T extends (...args: any[]) => void>(
      fn: T,
      delay: number = 2000,
      dep: any[] = []
    ): (...args: any[]) => void {
      const current = useRef<{
        fn: T
        timer: NodeJS.Timeout | null | undefined
      }>({
        fn,
        timer: null,
      })
      useEffect(() => {
        current.current.fn = fn
      }, [fn])

      return useCallback(
        (...args: any[]) => {
          if (current.current.timer) {
            clearTimeout(current.current.timer)
          }
          current.current.timer = setTimeout(() => {
            current.current.fn.call(this, ...args)
          }, delay)
        },
        [delay, ...dep]
      ) as (...args: any[]) => void
    },
  }
}

export default useDebounce
