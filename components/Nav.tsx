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

  const pill =
    "rounded-md border border-white/20 bg-black/20 px-3.5 py-1.5 text-[12px] font-medium text-white/90 no-underline backdrop-blur-md transition-colors hover:bg-white/15";

  return (
    <motion.header
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-x-0 top-0 z-50"
    >
      <div className="relative mx-auto flex max-w-[1500px] items-center justify-between px-5 py-4 md:px-10 md:py-5">
        {/* left links */}
        <nav className="hidden items-center gap-2 md:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className={pill}>
              {l.label}
            </a>
          ))}
        </nav>

        {/* centre mark */}
        <a
          href="/"
          aria-label="Heritage home"
          className="text-[22px] text-white no-underline md:absolute md:left-1/2 md:-translate-x-1/2"
        >
          <Logo withWord={false} className="!text-white" />
        </a>

        {/* right actions */}
        <div className="flex items-center gap-2">
          {user ? (
            <a
              href="/account"
              title={`Signed in as ${user.email}`}
              className={`${pill} hidden items-center gap-2 sm:inline-flex`}
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
            <a href="/login" className={`${pill} hidden sm:inline-block`}>
              Sign in
            </a>
          )}
          <ThemeToggle className="!border-white/20 !bg-black/20 !text-white/85 backdrop-blur-md" />
          <a
            href="/studio"
            className="hidden rounded-md bg-white px-4 py-1.5 text-[12px] font-bold text-[#150c34] no-underline transition-transform hover:scale-[1.04] sm:inline-block"
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
