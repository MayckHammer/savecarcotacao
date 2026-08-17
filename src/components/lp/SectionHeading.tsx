import { cn } from "@/lib/utils";

type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  tone?: "light" | "dark";
  className?: string;
};

const SectionHeading = ({ eyebrow, title, description, align = "center", tone = "light", className }: Props) => (
  <div className={cn("max-w-2xl space-y-3", align === "center" && "mx-auto text-center", className)}>
    {eyebrow && (
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-600">{eyebrow}</p>
    )}
    <h2
      className={cn(
        "font-display text-3xl font-extrabold tracking-tight sm:text-4xl",
        tone === "dark" ? "text-white" : "text-teal-900",
      )}
    >
      {title}
    </h2>
    {description && (
      <p className={cn("text-base", tone === "dark" ? "text-white/70" : "text-muted-foreground")}>{description}</p>
    )}
  </div>
);

export default SectionHeading;
