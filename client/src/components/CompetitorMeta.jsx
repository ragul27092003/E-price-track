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
  ({ rating, reviewCount, showReviewCount = true, loading = false, className = "" }) => {
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

    // Always fallback to N/A for rating and 0 for review count if data is missing or invalid
    const displayRating = formattedRating ?? "N/A";
    const displayReview = formattedReview ?? "0";

    return (
      <div
        className={`inline-flex items-center gap-0.5 text-xs text-slate-600 dark:text-slate-300 shrink-0 ${className}`}
      >
        <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400 shrink-0" />
        <span className="font-semibold text-slate-700 dark:text-slate-200">
          {displayRating}
        </span>
        {showReviewCount && (
          <span className="text-slate-400 dark:text-slate-500">
            ({displayReview})
          </span>
        )}
      </div>
    );
  },
);

CompetitorMeta.displayName = "CompetitorMeta";

export const RatingReview = CompetitorMeta;
export default CompetitorMeta;
