import Link from "next/link";

export default function StoreNotFound() {
  return (
    <div className="force-light flex min-h-screen flex-col items-center justify-center bg-[#f8fbff] px-4 text-center text-[#0c023c]">
      <div className="flex max-w-md flex-col items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/mahalatly-icon.svg" alt="Mahalatly" className="h-20 w-20" />
        <div className="space-y-2">
          <h1 className="text-5xl font-extrabold tracking-normal text-[#41a2d5] sm:text-6xl">
            Sorry
          </h1>
          <p className="text-xl font-bold sm:text-2xl">Store not available</p>
          <p className="mx-auto max-w-sm text-sm font-medium leading-6 text-[#697386] sm:text-base">
            This store link is invalid or the store is currently closed.
          </p>
        </div>
        <Link
          href="/"
          className="mt-2 inline-flex h-11 items-center justify-center rounded-full bg-[#0c023c] px-6 text-sm font-bold text-white shadow-[0_14px_28px_rgba(12,2,60,0.14)] transition hover:bg-[#16085d]"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
