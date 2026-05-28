import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { ChevronsDown, ArrowUp } from "lucide-react";

const ScrollHint = () => {
  const { pathname } = useLocation();
  const [scrollable, setScrollable] = useState(false);
  const [atBottom, setAtBottom] = useState(false);

  useEffect(() => {
    const update = () => {
      const doc = document.documentElement;
      const sh = doc.scrollHeight;
      const ih = window.innerHeight;
      const sy = window.scrollY;
      setScrollable(sh > ih + 16);
      setAtBottom(sy + ih >= sh - 8);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    const id = window.setInterval(update, 600);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      window.clearInterval(id);
    };
  }, []);

  if (pathname === "/" || !scrollable) return null;

  const handleClick = () => {
    if (atBottom) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      window.scrollBy({ top: window.innerHeight * 0.8, behavior: "smooth" });
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={atBottom ? "Voltar ao topo" : "Ver mais"}
      className="fixed left-1/2 -translate-x-1/2 bottom-6 z-[1200] transition-all duration-300"
    >
      {atBottom ? (
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:scale-110 transition-transform animate-fade-in">
          <ArrowUp className="h-6 w-6" strokeWidth={2.5} />
        </span>
      ) : (
        <span className="relative flex flex-col items-center justify-center animate-bounce">
          <ChevronsDown className="h-8 w-8 text-secondary -mb-4 drop-shadow" strokeWidth={3} />
          <ChevronsDown className="h-8 w-8 text-primary drop-shadow" strokeWidth={3} />
        </span>
      )}
    </button>
  );
};

export default ScrollHint;
