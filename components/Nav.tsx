"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { usePathname } from "next/navigation";
import { createClient } from "../lib/supabase/client";
import { NavUser, toNavUser } from "../lib/user";

/**
 * Floating, centred-logo nav — the layout of the reference site:
 * links on the left, mark in the middle, actions on the right.
 */
export function Nav({ initialUser }: { initialUser: NavUser | null }) {
  const [user, setUser] = useState<NavUser | null>(initialUser);
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const isHome = pathname === "/";

  const links = [
    { label: "Story", href: isHome ? "#story" : "/#story" },
    { label: "Process", href: isHome ? "#process" : "/#process" },
    { label: "FAQ", href: isHome ? "#faq" : "/#faq" },
  ];

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(toNavUser(session?.user ?? null));
    });
    return () => subscription.unsubscribe();
  }, []);

  // plain text links, as in the reference — the art carries the chrome
  const link =
    "text-[13px] font-normal text-white/90 no-underline drop-shadow-[0_1px_8px_rgba(20,10,50,0.35)] transition-opacity hover:opacity-70";

  return (
    <motion.header
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-x-0 top-0 z-50"
    >
      <div className="relative mx-auto flex max-w-[1500px] items-center justify-between px-5 py-4 md:px-[5vw] md:py-6">
        {/* left links */}
        <nav className="hidden items-center gap-[clamp(40px,8vw,120px)] md:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className={link}>
              {l.label}
            </a>
          ))}
        </nav>

        {/* centre mark */}
        <a
          href="/"
          aria-label="Heritage home"
          className="text-[26px] text-white no-underline md:absolute md:left-1/2 md:-translate-x-1/2"
        >
          <Logo withWord={false} className="!text-white" />
        </a>

        {/* right actions */}
        <div className="flex items-center gap-3 md:gap-[clamp(20px,4vw,64px)]">
          {user ? (
            <a
              href="/account"
              title={`Signed in as ${user.email}`}
              className={`${link} hidden items-center gap-2 sm:inline-flex`}
            >
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatarUrl}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="h-5 w-5 rounded-full object-cover"
                />
              ) : (
                <span
                  className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-[#150c34]"
                  style={{ background: "var(--accent)" }}
                >
                  {user.initial}
                </span>
              )}
              <span className="max-w-[80px] truncate">{user.name}</span>
            </a>
          ) : (
            <a href="/login" className={`${link} hidden sm:inline-block`}>
              Sign in
            </a>
          )}
          <ThemeToggle className="!h-8 !w-8 !border-transparent !text-white/85 hover:!border-white/30" />
          <a
            href="/studio"
            className="hidden rounded-[3px] border border-white/75 px-5 py-2.5 text-[13px] font-semibold text-white no-underline transition-colors hover:bg-white hover:text-[#150c34] sm:inline-block"
          >
            Studio
          </a>
          <button
            onClick={() => setIsOpen((o) => !o)}
            aria-label="Toggle menu"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-white/20 bg-black/20 text-white backdrop-blur-md md:hidden"
          >
            <div className="relative flex h-[12px] w-3.5 flex-col justify-between">
              <span className={`h-[1.5px] w-full origin-center rounded-full bg-current transition-transform ${isOpen ? "translate-y-[5px] rotate-45" : ""}`} />
              <span className={`h-[1.5px] w-full rounded-full bg-current transition-opacity ${isOpen ? "opacity-0" : ""}`} />
              <span className={`h-[1.5px] w-full origin-center rounded-full bg-current transition-transform ${isOpen ? "-translate-y-[5.25px] -rotate-45" : ""}`} />
            </div>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden border-b border-white/10 bg-[#0d0a22]/95 backdrop-blur-2xl md:hidden"
          >
            <div className="flex flex-col gap-1 px-6 py-5 text-white">
              {links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setIsOpen(false)}
                  className="py-3 text-[16px] font-medium text-white/90 no-underline"
                >
                  {l.label}
                </a>
              ))}
              {!user && (
                <a href="/login" className="py-3 text-[16px] font-medium text-white/90 no-underline">
                  Sign in
                </a>
              )}
              <a
                href="/studio"
                className="mt-3 rounded-lg bg-white py-3 text-center text-[15px] font-bold text-[#150c34] no-underline"
              >
                Open the Studio
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
