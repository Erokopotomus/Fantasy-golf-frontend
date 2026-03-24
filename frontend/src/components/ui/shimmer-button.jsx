import React from "react";

import { cn } from "@/lib/utils"

export const ShimmerButton = React.forwardRef((
  {
    shimmerColor = "#ffffff",
    shimmerSize = "0.05em",
    shimmerDuration = "3s",
    borderRadius = "100px",
    background = "rgba(0, 0, 0, 1)",
    className,
    children,
    ...props
  },
  ref
) => {
  return (
    <button
      style={{
        "--spread": "90deg",
        "--shimmer-color": shimmerColor,
        "--radius": borderRadius,
        "--speed": shimmerDuration,
        "--cut": shimmerSize,
        "--bg": background,
        borderRadius,
        background,
      }}
      className={cn(
        "group relative z-0 flex cursor-pointer items-center justify-center overflow-hidden border border-white/10 px-6 py-3 whitespace-nowrap text-white",
        "transform-gpu transition-transform duration-300 ease-in-out active:translate-y-px",
        className
      )}
      ref={ref}
      {...props}>
      {/* spark container */}
      <div
        className={cn("-z-30 blur-[2px]", "absolute inset-0 overflow-visible")}
        style={{ containerType: "size" }}>
        {/* spark */}
        <div
          className="absolute inset-0 aspect-square h-full rounded-none"
          style={{
            animation: `shimmer-slide var(--speed) ease-in-out infinite`,
          }}>
          {/* spark before */}
          <div
            className="absolute -inset-full w-auto rotate-0"
            style={{
              animation: `spin-around calc(var(--speed) * 2) infinite linear`,
              background: `conic-gradient(from calc(270deg - (var(--spread) * 0.5)), transparent 0, var(--shimmer-color) var(--spread), transparent var(--spread))`,
            }} />
        </div>
      </div>
      {children}
      {/* Highlight */}
      <div
        className={cn(
          "absolute inset-0 w-full h-full",
          "rounded-2xl px-4 py-1.5 text-sm font-medium shadow-[inset_0_-8px_10px_#ffffff1f]",
          "transform-gpu transition-all duration-300 ease-in-out",
          "group-hover:shadow-[inset_0_-6px_10px_#ffffff3f]",
          "group-active:shadow-[inset_0_-10px_10px_#ffffff3f]"
        )} />
      {/* backdrop */}
      <div
        className="absolute -z-20"
        style={{
          inset: `var(--cut)`,
          borderRadius: `var(--radius)`,
          background: `var(--bg)`,
        }} />
    </button>
  );
})

ShimmerButton.displayName = "ShimmerButton"
