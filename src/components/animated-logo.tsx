"use client";

import { cn } from "@/lib/utils";

interface AnimatedLogoProps {
  size?: "xs" | "sm" | "lg";
  showText?: boolean;
  className?: string;
}

/**
 * #AS KHUSHBOO Animated Logo Component
 * - Shows an SVG perfume bottle in gold gradient
 * - Has animated perfume mist particles rising from the bottle
 * - Uses CSS animations defined in globals.css
 * - The "#" is always included in the brand name
 */
export default function AnimatedLogo({
  size = "sm",
  showText = false,
  className,
}: AnimatedLogoProps) {
  const sizeClass = `as-logo-${size}`;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* Logo with mist */}
      <div className={cn("as-logo-container", sizeClass)}>
        {/* Mist particles (behind the bottle) */}
        <div className="as-logo-mist" aria-hidden="true">
          <div className="as-mist-particle" />
          <div className="as-mist-particle" />
          <div className="as-mist-particle" />
          <div className="as-mist-particle" />
          <div className="as-mist-particle" />
        </div>

        {/* Perfume bottle SVG */}
        <svg
          className="as-logo-bottle"
          viewBox="0 0 64 64"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
        >
          <defs>
            <linearGradient id="as-bottle-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFD700" />
              <stop offset="50%" stopColor="#DFAD18" />
              <stop offset="100%" stopColor="#B8860B" />
            </linearGradient>
            <linearGradient id="as-bottle-shine" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(255, 255, 255, 0.6)" />
              <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
            </linearGradient>
          </defs>

          {/* Cap / Top */}
          <rect x="26" y="6" width="12" height="6" rx="1" fill="url(#as-bottle-gradient)" />

          {/* Neck */}
          <rect x="28" y="12" width="8" height="4" fill="url(#as-bottle-gradient)" />

          {/* Bottle body (rounded) */}
          <path
            d="M20 18
               Q20 16 22 16
               L42 16
               Q44 16 44 18
               L44 50
               Q44 56 38 58
               L26 58
               Q20 56 20 50
               Z"
            fill="url(#as-bottle-gradient)"
            stroke="rgba(184, 134, 11, 0.5)"
            strokeWidth="0.5"
          />

          {/* Shine highlight on the bottle */}
          <path
            d="M24 20
               Q24 18 26 18
               L30 18
               L30 50
               Q30 52 28 52
               L24 52
               Z"
            fill="url(#as-bottle-shine)"
            opacity="0.5"
          />

          {/* Label area (darker rectangle) */}
          <rect
            x="26"
            y="28"
            width="12"
            height="14"
            rx="1"
            fill="rgba(0, 0, 0, 0.3)"
            stroke="rgba(0, 0, 0, 0.5)"
            strokeWidth="0.3"
          />

          {/* "#AS" text on the label */}
          <text
            x="32"
            y="36"
            textAnchor="middle"
            fontSize="4.5"
            fontWeight="bold"
            fill="#FFD700"
            fontFamily="sans-serif"
          >
            #AS
          </text>
          <text
            x="32"
            y="40"
            textAnchor="middle"
            fontSize="2.5"
            fill="#FFD700"
            opacity="0.8"
            fontFamily="sans-serif"
          >
            KHB
          </text>
        </svg>
      </div>

      {/* Brand text (optional) */}
      {showText && (
        <div className="flex flex-col leading-tight">
          <span className="as-logo-text font-bold text-xl tracking-wide">
            #AS KHUSHBOO
          </span>
          <span className="text-[10px] text-muted-foreground italic">
            Khushboo That Speaks for YOU 💛
          </span>
        </div>
      )}
    </div>
  );
}
