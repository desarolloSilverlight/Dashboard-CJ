import Link from "next/link";

export function GazuMark() {
  return (
    <Link href="/" className="flex items-center gap-3">
      <img
        src="/logo.png"
        alt="gazuBox"
        className="h-12 w-auto rounded-lg bg-white px-2 py-1"
      />
      <span className="leading-tight">
        <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-[#F7F7F2]/75">
          Panel operativo
        </span>
        <span className="mt-1 block h-[3px] w-14 rounded-full bg-[var(--color-cj-lime)]" />
      </span>
    </Link>
  );
}
