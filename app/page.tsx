'use client'

import dynamic from 'next/dynamic'

const VideoConverterApp = dynamic(
  () => import('@/features/video-converter/components/video-converter-app').then(mod => mod.VideoConverterApp),
  { ssr: false }
)

export default function Page() {
  return <VideoConverterApp />
}
