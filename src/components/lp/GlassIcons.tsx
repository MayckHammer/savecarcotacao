import type { ReactElement } from "react";
import "./GlassIcons.css";

export type GlassIconsItem = {
  icon: ReactElement;
  color: string;
  label: string;
  onClick?: () => void;
  customClass?: string;
};

const gradientMapping: Record<string, string> = {
  teal: "linear-gradient(oklch(0.42 0.07 190.2), oklch(0.3 0.05 190.2))",
  amber: "linear-gradient(oklch(0.83 0.16 84), oklch(0.72 0.15 72))",
};

export default function GlassIcons({ items, className = "" }: { items: GlassIconsItem[]; className?: string }) {
  const getBackgroundStyle = (color: string) =>
    gradientMapping[color] ? { background: gradientMapping[color] } : { background: color };

  return (
    <div className={`icon-btns ${className}`}>
      {items.map((item) => (
        <button key={item.label} type="button" aria-label={item.label} onClick={item.onClick} className={`icon-btn ${item.customClass ?? ""}`}>
          <span className="icon-btn__back" style={getBackgroundStyle(item.color)} />
          <span className="icon-btn__front">
            <span className="icon-btn__icon" aria-hidden="true">{item.icon}</span>
          </span>
          <span className="icon-btn__label">{item.label}</span>
        </button>
      ))}
    </div>
  );
}
