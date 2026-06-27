"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, Search } from "lucide-react";

export type HomeStore = {
  name: string;
  slug: string;
  logoUrl: string | null;
  href: string;
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function StoreDirectory({ stores }: { stores: HomeStore[] }) {
  const [query, setQuery] = useState("");
  const filteredStores = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return stores;
    return stores.filter((store) => store.name.toLowerCase().includes(q) || store.slug.includes(q));
  }, [query, stores]);

  const firstMatch = filteredStores[0] ?? stores[0];

  return (
    <div className="w-full space-y-8">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 rounded-[28px] border border-[#dfe7f2] bg-white p-3 shadow-[0_18px_45px_rgba(12,2,60,0.08)] sm:flex-row sm:items-center">
        <label className="flex min-h-14 flex-1 items-center gap-3 rounded-2xl bg-[#f1fbff] px-4 text-right sm:bg-white">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#eaf8ff] text-[#41a2d5]">
            <Search className="h-6 w-6" aria-hidden="true" />
          </span>
          <input
            dir="rtl"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ابحث في متاجرنا"
            className="h-12 w-full bg-transparent text-lg font-bold text-[#0c023c] outline-none placeholder:text-[#a4a0bb]"
          />
        </label>
        <a
          href={firstMatch?.href ?? "#stores"}
          className="inline-flex h-14 items-center justify-center gap-3 rounded-2xl bg-[#41a2d5] px-8 text-lg font-bold text-white shadow-[0_14px_24px_rgba(65,162,213,0.22)] transition hover:-translate-y-0.5 hover:bg-[#3196ca]"
        >
          بحث
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </a>
      </div>

      <div id="stores" className="mx-auto flex w-full max-w-4xl flex-wrap justify-center gap-4">
        {filteredStores.map((store) => (
          <a
            key={store.slug}
            href={store.href}
            className="group flex min-h-40 w-[calc(50%-0.5rem)] max-w-[210px] flex-col items-center justify-center gap-3 rounded-[24px] border border-[#dcecf7] bg-white px-4 py-5 text-center shadow-[0_12px_30px_rgba(12,2,60,0.06)] transition hover:-translate-y-1 hover:border-[#bce7ff] hover:shadow-[0_18px_38px_rgba(65,162,213,0.16)] sm:w-[210px]"
          >
            {store.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={store.logoUrl}
                alt={store.name}
                className="h-20 w-20 rounded-full border border-[#dcecf7] bg-white object-cover p-1"
              />
            ) : (
              <span className="flex h-20 w-20 items-center justify-center rounded-full border border-[#dcecf7] bg-[#f1fbff] text-xl font-black text-[#41a2d5]">
                {initials(store.name)}
              </span>
            )}
            <span className="line-clamp-2 text-base font-black text-[#0c023c] group-hover:text-[#41a2d5]">
              {store.name}
            </span>
          </a>
        ))}
      </div>

      {filteredStores.length === 0 ? (
        <p className="text-center text-sm font-semibold text-[#77738e]">ما لقينا متجر بهذا الاسم.</p>
      ) : null}
    </div>
  );
}
