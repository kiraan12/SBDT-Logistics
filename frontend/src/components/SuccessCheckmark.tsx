import { cn } from "@/lib/utils";

/**
 * Animated success checkmark (CSS stroke animation).
 */
export function SuccessCheckmark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-8 w-8 text-green-600", className)}
      aria-hidden
    >
      <path
        d="M5 13l4 4L19 7"
        strokeDasharray="24"
        strokeDashoffset="24"
        className="animate-checkmark-draw"
      />
    </svg>
  );
}
