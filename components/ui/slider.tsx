"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"
import { cn } from "@/lib/utils"

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, value, defaultValue, min = 0, max = 100, step = 1, ...props }, ref) => {
  // Ensure we always work with an array for Radix Slider
  const values = React.useMemo(() => {
    const v = value || defaultValue || [min]
    return Array.isArray(v) ? v : [Number(v)]
  }, [value, defaultValue, min])

  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn(
        "relative flex w-full touch-none select-none items-center",
        className
      )}
      value={values}
      min={min}
      max={max}
      step={step}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-blue-100">
        <SliderPrimitive.Range className="absolute h-full bg-brand-dark" />
      </SliderPrimitive.Track>
      {values.map((_, index) => (
        <SliderPrimitive.Thumb
          key={index}
          className="block h-5 w-5 rounded-full border-2 border-brand-dark bg-white ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 shadow-md hover:scale-110 active:scale-95"
        />
      ))}
    </SliderPrimitive.Root>
  )
})
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
