"use client";

import { cn } from "@/lib/utils";

interface AnimatedLogoProps {
  size?: "xs" | "sm" | "lg";
  showText?: boolean;
  className?: string;
}

/**
 * #AS KHUSHBOO Official Animated Logo Component
 * - Uses the OFFICIAL brand PNG logo from /public/as-khushboo-logo.png
 * - Has animated perfume mist particles rising from the logo
 * - Uses CSS animations defined in globals.css
 * - The "#" is always included in the brand name (it's part of the logo)
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
      <div className={cn("as-logo-container as-logo-container--img", sizeClass)}>
        {/* Mist particles (rising from the logo) */}
        <div className="as-logo-mist" aria-hidden="true">
          <div className="as-mist-particle" />
          <div className="as-mist-particle" />
          <div className="as-mist-particle" />
          <div className="as-mist-particle" />
          <div className="as-mist-particle" />
          <div className="as-mist-particle as-mist-particle--alt" />
          <div className="as-mist-particle as-mist-particle--alt2" />
        </div>

        {/* Official brand PNG logo */}
        <img
          src="/as-khushboo-logo.png"
          alt="#AS KHUSHBOO Official Logo"
          className="as-logo-img"
          draggable={false}
        />

        {/* Soft gold glow behind logo */}
        <div className="as-logo-glow" aria-hidden="true" />
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
