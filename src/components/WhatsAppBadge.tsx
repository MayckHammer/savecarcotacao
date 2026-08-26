import { cn } from "@/lib/utils";

type WhatsAppBadgeProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
  position?: "top-center" | "top-right" | "bottom-right";
  label?: string;
};

const sizeClasses = {
  sm: "text-[9px] px-1.5 py-0.5",
  md: "text-[10px] px-2 py-0.5",
  lg: "text-[11px] px-2.5 py-1",
};

const positionClasses = {
  "top-center": "left-1/2 -translate-x-1/2 -top-2.5 after:absolute after:-bottom-1 after:left-1/2 after:h-2 after:w-2 after:-translate-x-1/2 after:rotate-45 after:bg-red-600",
  "top-right": "-top-2 right-2 after:absolute after:-bottom-1 after:right-3 after:h-2 after:w-2 after:rotate-45 after:bg-red-600",
  "bottom-right": "right-2 bottom-0 translate-y-1/2 after:absolute after:-top-1 after:right-3 after:h-2 after:w-2 after:rotate-45 after:bg-red-600",
};

export const WhatsAppBadge = ({ className, size = "md", position = "top-center", label = "Descontos Especial!" }: WhatsAppBadgeProps) => {
  return (
    <span
      className={cn(
        "absolute z-10 whitespace-nowrap rounded-md bg-red-600 font-extrabold uppercase tracking-wide text-black shadow-lg pointer-events-none animate-pulse",
        sizeClasses[size],
        positionClasses[position],
        className
      )}
      aria-hidden="true"
    >
      {label}
    </span>
  );
};

export default WhatsAppBadge;
