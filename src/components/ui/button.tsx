import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "btn-gradient",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-white/30 bg-white/20 backdrop-blur-md hover:bg-white/30 hover:text-foreground rounded-2xl",
        secondary:
          "bg-white/80 backdrop-blur-sm text-primary hover:bg-white/90 rounded-2xl shadow-[var(--shadow-soft)]",
        ghost: "hover:bg-white/20 hover:text-foreground rounded-2xl",
        link: "text-primary underline-offset-4 hover:underline",
        modern: "bg-white/95 backdrop-blur-sm text-primary border border-white/50 hover:bg-white hover:shadow-[var(--shadow-medium)] rounded-2xl",
        warm: "bg-orange-400 text-white hover:bg-orange-500 rounded-2xl shadow-[var(--shadow-soft)]",
        fresh: "bg-green-400 text-white hover:bg-green-500 rounded-2xl shadow-[var(--shadow-soft)]",
      },
      size: {
        default: "h-11 px-6 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-12 rounded-lg px-8 text-base",
        xl: "h-14 rounded-lg px-10 text-lg",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
