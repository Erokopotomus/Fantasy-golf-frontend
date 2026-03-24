import { cn } from "@/lib/utils"

export function AnimatedGradientText({
  children,
  className,
  speed = 1,
  colorFrom = "#ffaa40",
  colorTo = "#9c40ff",
  ...props
}) {
  return (
    <span
      style={{
        backgroundSize: `${speed * 300}% 100%`,
        backgroundImage: `linear-gradient(to right, ${colorFrom}, ${colorTo}, ${colorFrom})`,
      }}
      className={cn(
        "animate-gradient inline bg-clip-text text-transparent",
        className
      )}
      {...props}>
      {children}
    </span>
  );
}
