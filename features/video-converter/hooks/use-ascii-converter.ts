'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { AsciiConverterConfig, ConverterState } from '../types'
import { pixelsToAscii } from '../utils/ascii-mapper'

const DEFAULT_CONFIG: AsciiConverterConfig = {
  cols: 120,
  contrast: 1.2,
  brightness: 0,
  colorMode: 'phosphor',
  invert: false,
}

interface UseAsciiConverterReturn {
  state: ConverterState
  asciiLines: string[]
  videoRef: React.RefObject<HTMLVideoElement>
  config: AsciiConverterConfig
  setConfig: React.Dispatch<React.SetStateAction<AsciiConverterConfig>>
  loadFile: (file: File) => void
  play: () => void
  pause: () => void
  reset: () => void
}

export function useAsciiConverter(): UseAsciiConverterReturn {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const fpsTimestampRef = useRef<number>(0)
  const frameCountRef = useRef<number>(0)
  const fpsCounterRef = useRef<number>(0)

  const [config, setConfig] = useState<AsciiConverterConfig>(DEFAULT_CONFIG)
  const [asciiLines, setAsciiLines] = useState<string[]>([])
  const [state, setState] = useState<ConverterState>({
    status: 'idle',
    fps: 0,
    frameCount: 0,
  })

  // Create an offscreen canvas once
  useEffect(() => {
    canvasRef.current = document.createElement('canvas')
  }, [])

  const processFrame = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.paused || video.ended) return

    const aspect = video.videoHeight / video.videoWidth
    const cols = config.cols
    // Compensate for character aspect ratio (chars are ~2x taller than wide)
    const rows = Math.floor(cols * aspect * 0.45)

    canvas.width = cols
    canvas.height = rows

    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    ctx.drawImage(video, 0, 0, cols, rows)
    const imageData = ctx.getImageData(0, 0, cols, rows)

    const lines = pixelsToAscii(
      imageData.data,
      cols,
      rows,
      config.contrast,
      config.brightness,
      config.invert,
    )
    setAsciiLines(lines)

    // FPS tracking
    frameCountRef.current += 1
    fpsCounterRef.current += 1
    const now = performance.now()
    if (now - fpsTimestampRef.current >= 1000) {
      setState(prev => ({
        ...prev,
        fps: fpsCounterRef.current,
        frameCount: frameCountRef.current,
      }))
      fpsCounterRef.current = 0
      fpsTimestampRef.current = now
    }

    rafRef.current = requestAnimationFrame(processFrame)
  }, [config])

  const startLoop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    fpsTimestampRef.current = performance.now()
    rafRef.current = requestAnimationFrame(processFrame)
  }, [processFrame])

  const stopLoop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  const loadFile = useCallback((file: File) => {
    const video = videoRef.current
    if (!video) return

    stopLoop()
    setState({ status: 'loading', fps: 0, frameCount: 0 })
    frameCountRef.current = 0
    fpsCounterRef.current = 0

    const url = URL.createObjectURL(file)
    video.src = url

    video.onloadedmetadata = () => {
      setState(prev => ({ ...prev, status: 'playing' }))
      video.play().catch(() => {
        setState(prev => ({ ...prev, status: 'error', errorMessage: 'Playback blocked by browser.' }))
      })
    }

    video.onerror = () => {
      setState(prev => ({ ...prev, status: 'error', errorMessage: 'Failed to load video.' }))
    }

    return () => URL.revokeObjectURL(url)
  }, [stopLoop])

  const play = useCallback(() => {
    videoRef.current?.play()
    setState(prev => ({ ...prev, status: 'playing' }))
  }, [])

  const pause = useCallback(() => {
    videoRef.current?.pause()
    setState(prev => ({ ...prev, status: 'paused' }))
    stopLoop()
  }, [stopLoop])

  const reset = useCallback(() => {
    stopLoop()
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.src = ''
    }
    setAsciiLines([])
    frameCountRef.current = 0
    fpsCounterRef.current = 0
    setState({ status: 'idle', fps: 0, frameCount: 0 })
  }, [stopLoop])

  // Wire up video events to start/stop RAF loop
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const onPlay = () => startLoop()
    const onPause = () => stopLoop()
    const onEnded = () => {
      stopLoop()
      setState(prev => ({ ...prev, status: 'paused' }))
    }

    video.addEventListener('play', onPlay)
    video.addEventListener('pause', onPause)
    video.addEventListener('ended', onEnded)

    return () => {
      video.removeEventListener('play', onPlay)
      video.removeEventListener('pause', onPause)
      video.removeEventListener('ended', onEnded)
    }
  }, [startLoop, stopLoop])

  // Restart loop when config changes while playing
  useEffect(() => {
    const video = videoRef.current
    if (video && !video.paused && state.status === 'playing') {
      startLoop()
    }
  }, [config, startLoop, state.status])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopLoop()
      if (videoRef.current?.src) URL.revokeObjectURL(videoRef.current.src)
    }
  }, [stopLoop])

  return { state, asciiLines, videoRef, config, setConfig, loadFile, play, pause, reset }
}
