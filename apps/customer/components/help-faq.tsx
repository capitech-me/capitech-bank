"use client";

import { useState } from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";
import { cn } from "@capitech/ui";

export interface FaqItem {
  q: string;
  a: string;
}

export interface FaqCategory {
  category: string;
  icon: LucideIcon;
  items: FaqItem[];
}

export function HelpFaq({ categories }: { categories: FaqCategory[] }) {
  // Track one open item per category (indexed by category name).
  const [openByCategory, setOpenByCategory] = useState<Record<string, number>>({});

  return (
    <div className="space-y-8">
      {categories.map((cat) => {
        const openIndex = openByCategory[cat.category] ?? 0;
        return (
          <section key={cat.category} id={cat.category.toLowerCase().replace(/\s+/g, "-")} className="scroll-mt-20">
            <h2 className="flex items-center gap-2 text-base font-semibold text-white">
              <span className="flex size-7 items-center justify-center rounded-lg bg-brand-600/20 text-brand-300">
                <cat.icon className="size-4" />
              </span>
              {cat.category}
            </h2>
            <div className="mt-3 space-y-2">
              {cat.items.map((item, i) => {
                const isOpen = openIndex === i;
                return (
                  <div
                    key={item.q}
                    className={cn(
                      "rounded-xl border transition-colors",
                      isOpen ? "border-brand-500/30 bg-brand-600/10" : "border-border bg-card"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenByCategory((prev) => ({ ...prev, [cat.category]: isOpen ? -1 : i }))}
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                      aria-expanded={isOpen}
                    >
                      <span className="font-medium text-navy-100">{item.q}</span>
                      <ChevronDown
                        className={cn(
                          "size-5 shrink-0 text-muted-foreground transition-transform",
                          isOpen && "rotate-180"
                        )}
                      />
                    </button>
                    {isOpen && (
                      <p className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
