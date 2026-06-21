import { useState, useRef, useCallback, useEffect } from 'react'

export function useClock() {
  const [playing, setPlaying] = useState(false)
  const [positionSec, setPositionSec] = useState(0)

  const rafRef = useRef<number | null>(null)
  const startWallRef = useRef<number>(0)
  const posAtPlayRef = useRef<number>(0)

  const stopRaf = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  const play = useCallback(() => {
    setPlaying(true)
    startWallRef.current = performance.now()
    posAtPlayRef.current = positionSec

    const tick = () => {
      const elapsed = (performance.now() - startWallRef.current) / 1000
      setPositionSec(posAtPlayRef.current + elapsed)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [positionSec])

  const pause = useCallback(() => {
    stopRaf()
    setPlaying(false)
    // Capture current position from the running animation
    const elapsed = (performance.now() - startWallRef.current) / 1000
    const frozen = posAtPlayRef.current + elapsed
    setPositionSec(frozen)
    posAtPlayRef.current = frozen
  }, [stopRaf])

  const reset = useCallback(() => {
    stopRaf()
    setPlaying(false)
    setPositionSec(0)
    posAtPlayRef.current = 0
  }, [stopRaf])

  const seek = useCallback(
    (sec: number) => {
      posAtPlayRef.current = sec
      setPositionSec(sec)
      if (playing) {
        startWallRef.current = performance.now()
      }
    },
    [playing]
  )

  // Sync external state (from Realtime broadcast in camera view)
  const syncExternal = useCallback(
    (extPlaying: boolean, extPositionSec: number) => {
      stopRaf()
      posAtPlayRef.current = extPositionSec
      setPositionSec(extPositionSec)

      if (extPlaying) {
        setPlaying(true)
        startWallRef.current = performance.now()
        const tick = () => {
          const elapsed = (performance.now() - startWallRef.current) / 1000
          setPositionSec(extPositionSec + elapsed)
          rafRef.current = requestAnimationFrame(tick)
        }
        rafRef.current = requestAnimationFrame(tick)
      } else {
        setPlaying(false)
      }
    },
    [stopRaf]
  )

  useEffect(() => () => stopRaf(), [stopRaf])

  return { playing, positionSec, play, pause, reset, seek, syncExternal }
}
