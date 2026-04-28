import { useEffect, useRef, useState, useCallback } from "react";
import { Gamepad2, RotateCcw, Gift } from "lucide-react";

const PRIZE_GOAL = 2000;

/**
 * Mini-game: carrinho amarelo Loovi desviando de cones na estrada.
 * Controles:
 *  - Mobile: arraste lateralmente (touch)
 *  - Desktop: setas ← →  ou A / D
 */
const ROAD_W = 320;
const ROAD_H = 420;
const CAR_W = 44;
const CAR_H = 70;
const LANES = [ROAD_W * 0.2, ROAD_W * 0.5, ROAD_W * 0.8];

interface Obstacle {
  x: number;
  y: number;
  w: number;
  h: number;
}

const CarMiniGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);

  // mutable refs for game loop (avoid re-renders)
  const carXRef = useRef(LANES[1] - CAR_W / 2);
  const targetXRef = useRef(LANES[1] - CAR_W / 2);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const dashOffsetRef = useRef(0);
  const speedRef = useRef(3);
  const spawnTimerRef = useRef(0);
  const scoreRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const dragRef = useRef<{ active: boolean; startX: number; startCar: number }>({
    active: false,
    startX: 0,
    startCar: 0,
  });

  useEffect(() => {
    const stored = localStorage.getItem("savecar_minigame_best");
    if (stored) setBest(parseInt(stored, 10) || 0);
  }, []);

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const baseSpeed = isMobile ? 4.5 : 3;
  const startSpeed = isMobile ? 5.8 : 4.2;
  const maxSpeed = isMobile ? 15 : 12;
  const speedRamp = isMobile ? 200 : 280;

  const reset = useCallback(() => {
    carXRef.current = LANES[1] - CAR_W / 2;
    targetXRef.current = LANES[1] - CAR_W / 2;
    obstaclesRef.current = [];
    dashOffsetRef.current = 0;
    speedRef.current = baseSpeed;
    spawnTimerRef.current = 0;
    scoreRef.current = 0;
    setScore(0);
    setGameOver(false);
  }, [baseSpeed]);

  const start = useCallback(() => {
    reset();
    setRunning(true);
  }, [reset]);

  const stop = useCallback((finalScore: number) => {
    setRunning(false);
    setGameOver(true);
    setBest((prev) => {
      const next = Math.max(prev, finalScore);
      localStorage.setItem("savecar_minigame_best", String(next));
      return next;
    });
  }, []);

  // Game loop
  useEffect(() => {
    if (!running) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      // smooth car movement
      const dx = targetXRef.current - carXRef.current;
      carXRef.current += dx * 0.25;
      // clamp
      carXRef.current = Math.max(8, Math.min(ROAD_W - CAR_W - 8, carXRef.current));

      // road
      ctx.fillStyle = "#2a2a2a";
      ctx.fillRect(0, 0, ROAD_W, ROAD_H);

      // shoulders
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(0, 0, 6, ROAD_H);
      ctx.fillRect(ROAD_W - 6, 0, 6, ROAD_H);

      // dashed center lines
      dashOffsetRef.current = (dashOffsetRef.current + speedRef.current) % 40;
      ctx.fillStyle = "#fff";
      for (const laneX of [ROAD_W / 3, (2 * ROAD_W) / 3]) {
        for (let y = -40 + dashOffsetRef.current; y < ROAD_H; y += 40) {
          ctx.fillRect(laneX - 2, y, 4, 22);
        }
      }

      // spawn obstacles (sometimes 2 lanes at once for extra challenge)
      spawnTimerRef.current -= 1;
      if (spawnTimerRef.current <= 0) {
        const laneIdxA = Math.floor(Math.random() * LANES.length);
        obstaclesRef.current.push({
          x: LANES[laneIdxA] - 14,
          y: -40,
          w: 28,
          h: 36,
        });
        // After 600 pts, chance to spawn a second cone in a different lane
        if (scoreRef.current > 600 && Math.random() < 0.35) {
          let laneIdxB = Math.floor(Math.random() * LANES.length);
          if (laneIdxB === laneIdxA) laneIdxB = (laneIdxB + 1) % LANES.length;
          obstaclesRef.current.push({
            x: LANES[laneIdxB] - 14,
            y: -40 - 20,
            w: 28,
            h: 36,
          });
        }
        spawnTimerRef.current = Math.max(18, 55 - Math.floor(scoreRef.current / 60));
      }

      // update + draw obstacles (cones)
      const carRect = {
        x: carXRef.current,
        y: ROAD_H - CAR_H - 16,
        w: CAR_W,
        h: CAR_H,
      };

      const next: Obstacle[] = [];
      for (const o of obstaclesRef.current) {
        o.y += speedRef.current;
        if (o.y < ROAD_H + 50) next.push(o);

        // draw cone
        ctx.fillStyle = "#ff7a00";
        ctx.beginPath();
        ctx.moveTo(o.x + o.w / 2, o.y);
        ctx.lineTo(o.x + o.w, o.y + o.h);
        ctx.lineTo(o.x, o.y + o.h);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.fillRect(o.x + 3, o.y + o.h * 0.55, o.w - 6, 4);
        ctx.fillStyle = "#222";
        ctx.fillRect(o.x - 2, o.y + o.h, o.w + 4, 4);

        // collision (AABB)
        if (
          carRect.x < o.x + o.w &&
          carRect.x + carRect.w > o.x &&
          carRect.y < o.y + o.h &&
          carRect.y + carRect.h > o.y
        ) {
          obstaclesRef.current = next;
          stop(scoreRef.current);
          return;
        }
      }
      obstaclesRef.current = next;

      // draw yellow car (Loovi yellow)
      const cx = carRect.x;
      const cy = carRect.y;
      // shadow
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(cx + 3, cy + CAR_H - 4, CAR_W - 6, 6);
      // body
      ctx.fillStyle = "#F2B705";
      ctx.beginPath();
      ctx.roundRect(cx, cy, CAR_W, CAR_H, 8);
      ctx.fill();
      // windshield
      ctx.fillStyle = "#0D5C3E";
      ctx.beginPath();
      ctx.roundRect(cx + 6, cy + 12, CAR_W - 12, 18, 4);
      ctx.fill();
      // rear window
      ctx.beginPath();
      ctx.roundRect(cx + 6, cy + 42, CAR_W - 12, 14, 4);
      ctx.fill();
      // wheels
      ctx.fillStyle = "#111";
      ctx.fillRect(cx - 3, cy + 8, 5, 14);
      ctx.fillRect(cx + CAR_W - 2, cy + 8, 5, 14);
      ctx.fillRect(cx - 3, cy + CAR_H - 22, 5, 14);
      ctx.fillRect(cx + CAR_W - 2, cy + CAR_H - 22, 5, 14);
      // headlights
      ctx.fillStyle = "#fff";
      ctx.fillRect(cx + 4, cy + 2, 8, 4);
      ctx.fillRect(cx + CAR_W - 12, cy + 2, 8, 4);

      // score
      scoreRef.current += 1;
      if (scoreRef.current % 30 === 0) setScore(scoreRef.current);
      // speed up — mais rápido e teto maior para virar desafio real
      speedRef.current = Math.min(maxSpeed, startSpeed + scoreRef.current / speedRamp);

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [running, stop]);

  // Keyboard
  useEffect(() => {
    if (!running) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        targetXRef.current -= 60;
      } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        targetXRef.current += 60;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [running]);

  // Touch / pointer drag
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!running) return;
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startCar: carXRef.current,
    };
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!running || !dragRef.current.active) return;
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const scale = ROAD_W / rect.width;
    const dx = (e.clientX - dragRef.current.startX) * scale;
    targetXRef.current = dragRef.current.startCar + dx;
  };
  const onPointerUp = () => {
    dragRef.current.active = false;
  };

  // Tap-to-switch-lane for simple touch
  const onTap = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!running) return;
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const localX = ((e.clientX - rect.left) / rect.width) * ROAD_W;
    if (localX < carXRef.current + CAR_W / 2) {
      targetXRef.current -= 60;
    } else {
      targetXRef.current += 60;
    }
  };

  const displayScore = score;
  const prizeUnlocked = displayScore >= PRIZE_GOAL;
  const progressPct = Math.min(100, (displayScore / PRIZE_GOAL) * 100);
  const wonPrize = gameOver && score >= PRIZE_GOAL;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Gamepad2 className="h-4 w-4 text-primary" />
          <span className="text-sm font-bold text-foreground">
            Que tal se divertir enquanto isso?
          </span>
        </div>
        <span className="text-xs text-muted-foreground">Recorde: {best}</span>
      </div>

      {/* Prize banner */}
      <div className="rounded-xl p-3 flex items-center gap-3 bg-gradient-to-r from-[#F2B705] to-[#ffd24a] text-[#0D5C3E] shadow-md border border-[#0D5C3E]/10">
        <div className="h-9 w-9 rounded-full bg-[#0D5C3E] flex items-center justify-center shrink-0">
          <Gift className="h-5 w-5 text-[#F2B705] animate-pulse" />
        </div>
        <p className="text-sm font-bold leading-tight">
          Chegue a <span className="underline">2.000 pontos</span> e ganhe um brinde da SAVE CAR! 🎁
        </p>
      </div>

      <div className="relative rounded-2xl overflow-hidden border border-border bg-[#2a2a2a] shadow-md">
        <canvas
          ref={canvasRef}
          width={ROAD_W}
          height={ROAD_H}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onClick={onTap}
          className="block w-full h-auto touch-none select-none"
          style={{ aspectRatio: `${ROAD_W} / ${ROAD_H}` }}
        />

        {/* Score overlay */}
        {running && (
          <div className="absolute top-2 left-2 right-2 space-y-1.5">
            <div className="flex justify-between text-xs font-bold">
              <span className="bg-black/60 text-white px-2 py-1 rounded-md">
                {displayScore} pts
              </span>
              {prizeUnlocked ? (
                <span className="bg-[#0D5C3E] text-[#F2B705] px-2 py-1 rounded-md flex items-center gap-1 animate-pulse">
                  <Gift className="h-3 w-3" /> BRINDE!
                </span>
              ) : (
                <span className="bg-[#F2B705] text-[#0D5C3E] px-2 py-1 rounded-md">
                  Meta 2.000 pts 🎁
                </span>
              )}
            </div>
            {/* Progress bar to prize */}
            <div className="h-1.5 w-full bg-black/50 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  prizeUnlocked ? "bg-[#22c55e]" : "bg-[#F2B705]"
                }`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Start / Game Over overlays */}
        {!running && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm text-center px-6">
            {gameOver ? (
              <>
                <p className="text-white text-lg font-bold mb-1">
                  {wonPrize ? "🎉 Parabéns!" : "Que pena!"}
                </p>
                <p className="text-white/80 text-sm mb-1">
                  Você fez <span className="font-bold text-[#F2B705]">{displayScore}</span> pontos
                </p>
                <p className="text-white/60 text-xs mb-3">Recorde: {best}</p>
                {wonPrize && (
                  <div className="mb-4 mx-2 rounded-xl bg-gradient-to-r from-[#F2B705] to-[#ffd24a] text-[#0D5C3E] p-3 shadow-lg flex flex-col items-start gap-2 text-left">
                    <div className="flex items-start gap-2">
                      <Gift className="h-5 w-5 shrink-0 mt-0.5" />
                      <p className="text-xs font-bold leading-snug">
                        Você ganhou um brinde! Nosso consultor vai combinar a entrega no contato.
                      </p>
                    </div>
                    <p className="text-[11px] font-extrabold uppercase tracking-wide bg-[#0D5C3E] text-[#F2B705] px-2 py-1 rounded-md w-full text-center">
                      📸 Tire print e envie ao consultor!
                    </p>
                  </div>
                )}
                <button
                  onClick={start}
                  className="inline-flex items-center gap-2 bg-[#F2B705] hover:bg-[#dba503] text-[#0D5C3E] font-bold px-5 py-2.5 rounded-xl transition-colors"
                >
                  <RotateCcw className="h-4 w-4" />
                  Jogar de novo
                </button>
              </>
            ) : (
              <>
                <div className="text-4xl mb-2">🚗</div>
                <p className="text-white text-base font-bold mb-1">
                  Desvie dos cones!
                </p>
                <p className="text-white/70 text-xs mb-4">
                  Arraste o carrinho ou toque nos lados da pista
                </p>
                <button
                  onClick={start}
                  className="inline-flex items-center gap-2 bg-[#F2B705] hover:bg-[#dba503] text-[#0D5C3E] font-bold px-6 py-2.5 rounded-xl transition-colors"
                >
                  <Gamepad2 className="h-4 w-4" />
                  Começar
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CarMiniGame;
