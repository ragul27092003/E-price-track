import React from "react";
import { Star } from "lucide-react";

/**
 * CompetitorMeta Component
 * Reusable component to render competitor rating and review count.
 * Always renders rating (defaults to 0.0) and review count (defaults to 0) if missing.
 *
 * Props:
 * @param {number|string|null} rating - The product rating value
 * @param {number|string|null} reviewCount - The product review count value
 * @param {boolean} loading - Optional loading state (renders skeleton loader)
 * @param {string} className - Optional container CSS class overrides
 */
const CompetitorMeta = React.memo(
  ({ rating, reviewCount, loading = false, className = "" }) => {
    if (rating === undefined || reviewCount === undefined) {
      return null;
    }

    if (loading) {
      return (
        <div
          className={`inline-flex items-center gap-1.5 animate-pulse ${className}`}
        >
          <div className="h-3.5 w-3.5 rounded-full bg-slate-200 dark:bg-slate-700" />
          <div className="h-3 w-10 rounded bg-slate-200 dark:bg-slate-700" />
        </div>
      );
    }

    // ── Parse Rating ──
    let formattedRating = null;
    if (
      rating !== null &&
      rating !== undefined &&
      rating !== "" &&
      rating !== "No Result" &&
      rating !== "no result"
    ) {
      const rawStr = String(rating).trim();
      const match = rawStr.match(/([0-9]+(?:\.[0-9]+)?)/);
      if (match) {
        const num = parseFloat(match[1]);
        if (!isNaN(num) && num > 0 && num <= 5) {
          formattedRating = num % 1 === 0 ? `${num}.0` : String(num);
        } else if (!isNaN(num) && num > 5 && num <= 10) {
          // Handle 10-point scale ratings by converting to 5-point scale safely if applicable
          const scaled = (num / 2).toFixed(1);
          formattedRating = scaled;
        }
      }
    }

    // ── Parse Review Count ──
    let formattedReview = null;
    if (
      reviewCount !== null &&
      reviewCount !== undefined &&
      reviewCount !== "" &&
      reviewCount !== "No Result" &&
      reviewCount !== "no result"
    ) {
      if (typeof reviewCount === "number") {
        if (reviewCount > 0) {
          formattedReview = reviewCount.toLocaleString("en-IN");
        }
      } else {
        const rawStr = String(reviewCount).trim();
        if (rawStr.length > 0) {
          // Strip duplicate trailing words if present and format numbers nicely if possible
          const cleanedStr = rawStr.replace(/reviews?/i, "").trim();
          const numOnly = parseFloat(cleanedStr.replace(/,/g, ""));
          if (!isNaN(numOnly) && numOnly > 0) {
            formattedReview = numOnly.toLocaleString("en-IN");
          } else if (cleanedStr.length > 0 && cleanedStr !== "0") {
            formattedReview = cleanedStr;
          }
        }
      }
    }

    // Always fallback to 0.0 for rating and 0 for review count if data is missing or invalid
    const displayRating = formattedRating ?? "0.0";
    const displayReview = formattedReview ?? "0";

    return (
      <div
        className={`inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 shrink-0 ${className}`}
      >
        <span
          className="
      inline-flex items-center gap-0.5
      leading-none
      font-semibold text-[11px]
      text-amber-600 dark:text-amber-400
      bg-amber-50 dark:bg-amber-950/40
      px-1.5 py-0.5
      rounded
      border border-amber-200/60 dark:border-amber-800/50
    "
        >
          <Star className="h-3 w-3 fill-amber-400 text-amber-400 shrink-0 relative -top-[0.5px]" />

          <span className="leading-none">{displayRating}</span>
        </span>

        <span className="text-[10px] leading-none text-slate-500 dark:text-slate-400">
          ({displayReview})
        </span>
      </div>
    );
  },
);

CompetitorMeta.displayName = "CompetitorMeta";

export const RatingReview = CompetitorMeta;
export default CompetitorMeta;
