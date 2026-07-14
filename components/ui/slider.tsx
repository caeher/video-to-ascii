'use client'

import * as SliderPrimitive from '@radix-ui/react-slider'
import * as React from 'react'

import { cn } from '@/lib/utils'

function Slider({
  className,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root>) {
  return (
    <SliderPrimitive.Root
      className={cn(
        'relative flex w-full touch-none select-none items-center',
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-px w-full grow overflow-hidden bg-terminal-border">
        <SliderPrimitive.Range className="absolute h-full bg-phosphor" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block h-3 w-3 rounded-none border border-phosphor bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-phosphor cursor-pointer" />
    </SliderPrimitive.Root>
  )
}

export { Slider }
