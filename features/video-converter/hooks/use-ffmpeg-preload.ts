'use client'

import { useEffect, useState } from 'react'
import { preloadFFmpeg } from '../utils/ffmpeg-encoder'

export type FfmpegPreloadStatus = 'idle' | 'loading' | 'ready' | 'error'

export function useFfmpegPreload(videoReady: boolean): FfmpegPreloadStatus {
  const [status, setStatus] = useState<FfmpegPreloadStatus>('idle')

  useEffect(() => {
    if (!videoReady) {
      setStatus('idle')
      return
    }

    let cancelled = false
    setStatus('loading')

    preloadFFmpeg()
      .then(() => {
        if (!cancelled) setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [videoReady])

  return status
}
