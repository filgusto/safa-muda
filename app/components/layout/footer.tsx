import Link from "next/link";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="border-t border-border/30 mt-16">
      <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground/60">
        <Link
          href="/"
          className="flex items-center gap-1.5 hover:text-muted-foreground transition-colors"
        >
          <Image
            src="/icon.svg"
            alt="Logo"
            width={14}
            height={14}
            className="opacity-70"
          />
          <span className="font-serif font-semibold">App</span>
          <span className="ml-1">· © {new Date().getFullYear()}</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/admin"
            className="hover:text-muted-foreground transition-colors"
          >
            Admin
          </Link>
        </div>
      </div>
    </footer>
  );
}
