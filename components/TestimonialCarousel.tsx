"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

interface Review {
  id: string;
  rating: number;
  text: string;
  display_name: string;
  business_type: string;
}

function Stars({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          viewBox="0 0 20 20"
          fill={i <= count ? "currentColor" : "none"}
          stroke={i <= count ? "none" : "currentColor"}
          strokeWidth={1.2}
          className={`h-4 w-4 ${i <= count ? "text-yellow-400" : "text-zinc-300 dark:text-zinc-600"}`}
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.176 0l-3.37 2.448c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.063 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" />
        </svg>
      ))}
    </div>
  );
}

function ArrowButton({ direction, onClick }: { direction: "left" | "right"; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 shadow-sm transition-colors hover:bg-zinc-50 hover:text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
      aria-label={`Scroll ${direction}`}
    >
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
        {direction === "left" ? (
          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
        ) : (
          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
        )}
      </svg>
    </button>
  );
}

export default function TestimonialCarousel() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const t = useTranslations("landing");

  useEffect(() => {
    fetch("/api/reviews")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Review[]) => setReviews(data.slice(0, 10)))
      .catch(() => setReviews([]))
      .finally(() => setLoading(false));
  }, []);

  function scroll(direction: "left" | "right") {
    if (!scrollRef.current) return;
    const amount = 300;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  }

  if (loading) return null;

  return (
    <section className="border-y border-zinc-100 bg-zinc-50 px-4 py-16 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
              Testimonials
            </h2>
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {t("testimonialTitle")}
            </p>
          </div>
          {reviews.length > 0 && (
            <div className="hidden gap-2 sm:flex">
              <ArrowButton direction="left" onClick={() => scroll("left")} />
              <ArrowButton direction="right" onClick={() => scroll("right")} />
            </div>
          )}
        </div>

        {reviews.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-400 dark:text-zinc-500">
            {t("testimonialEmpty")}
          </p>
        ) : (
          <div className="relative">
            <div
              ref={scrollRef}
              className="scrollbar-hide flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="w-72 shrink-0 snap-start rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
                >
                  <Stars count={review.rating} />
                  {review.text && (
                    <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                      &ldquo;{review.text.length > 150 ? review.text.slice(0, 150) + "..." : review.text}&rdquo;
                    </p>
                  )}
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                      {review.display_name || "Anonymous"}
                    </span>
                    {review.business_type && (
                      <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                        {review.business_type}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {/* Mobile arrows */}
            <div className="mt-4 flex justify-center gap-2 sm:hidden">
              <ArrowButton direction="left" onClick={() => scroll("left")} />
              <ArrowButton direction="right" onClick={() => scroll("right")} />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
