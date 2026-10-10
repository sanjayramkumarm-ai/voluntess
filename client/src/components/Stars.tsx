"use client";

import { useState } from "react";

function StarIcon({ filled, className = "h-5 w-5" }: { filled: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={className}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.2"
      aria-hidden="true"
    >
      <path
        strokeLinejoin="round"
        d="M10 1.5l2.5 5.3 5.8.8-4.2 4.1 1 5.8L10 14.7 4.9 17.5l1-5.8L1.7 7.6l5.8-.8L10 1.5z"
      />
    </svg>
  );
}

export function StarDisplay({ value, size = "h-4 w-4" }: { value: number; size?: string }) {
  return (
    <span className="inline-flex text-amber-500" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon key={n} filled={n <= Math.round(value)} className={size} />
      ))}
    </span>
  );
}

export function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;

  return (
    <div className="inline-flex gap-1 text-amber-500" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
          className="rounded p-0.5"
        >
          <StarIcon filled={n <= shown} className="h-8 w-8" />
        </button>
      ))}
    </div>
  );
}