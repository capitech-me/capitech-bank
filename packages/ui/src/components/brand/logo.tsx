import { cn } from "../../lib/cn";

interface LogoProps {
  className?: string;
  /** "full" shows icon + wordmark, "icon" shows only the mark */
  variant?: "full" | "icon";
  dark?: boolean;
}

export function Logo({ className, variant = "full", dark = false }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="relative inline-flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-600 to-brand-800 shadow-sm">
        {/* stylized C monogram */}
        <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden="true">
          <path
            d="M15.5 8.5a5 5 0 1 0 0 7"
            stroke="white"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <circle cx="19.4" cy="12" r="1.4" fill="#2dd4bf" />
        </svg>
      </span>
      {variant === "full" && (
        <span className={cn("text-lg font-bold tracking-tight", dark ? "text-white" : "text-navy-950")}>
          Capitech
          <span className="text-brand-600"> Bank</span>
        </span>
      )}
    </span>
  );
}
