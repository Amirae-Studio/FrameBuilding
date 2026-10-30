"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "../../lib/supabase/client";
import { NavUser, toNavUser } from "../../lib/user";
import { LogoMark } from "../Logo";
import { BACK_URL } from "./links";

/**
 * Centred-logo header. Its colour follows the section beneath it: every
 * landing section carries data-tone="light|dark" and the header borrows that
 * section's background as it scrolls past.
 */
export function LandingNav({ initialUser }: { initialUser: NavUser | null }) {
  const [user, setUser] = useState<NavUser | null>(initialUser);
  const [open, setOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(toNavUser(session?.user ?? null));
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const sections = Array.from(document.querySelectorAll<HTMLElement>(".fb [data-tone]"));
    function sync() {
      if (!nav) return;
      const probe = nav.offsetHeight / 2;
      // sections later in the DOM paint above the sticky hero, so test from the end
      let hit: HTMLElement | null = null;
      for (let i = sections.length - 1; i >= 0; i--) {
        const r = sections[i].getBoundingClientRect();
        if (r.top <= probe && r.bottom > probe) {
          hit = sections[i];
          break;
        }
      }
      if (!hit) return;
      nav.style.backgroundColor =
        hit.dataset.bg === "transparent" ? "transparent" : getComputedStyle(hit).backgroundColor;
      nav.classList.toggle("is-light", hit.dataset.tone === "light");
    }
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(sync);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", sync);
    sync();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", sync);
    };
  }, []);

  const close = () => setOpen(false);

  const account = user ? (
    <a
      href="/account"
      className="nav-user"
      title={`${user.name} · ${user.email}`}
      aria-label={`Your account (${user.name})`}
    >
      {user.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" />
      ) : (
        <i>{user.initial}</i>
      )}
    </a>
  ) : (
    <a href="/login">Sign in</a>
  );

  return (
    <header className="nav" id="nav" ref={navRef}>
      <div className="wrap nav-inner">
        <nav className="nav-links">
          <a href="#story">Story</a>
          <a href="#process">Process</a>
          <a href="#library">Library</a>
        </nav>
        <a href="#hero" className="logo" aria-label="FrameBuilding home">
          <LogoMark className="logo-mark" />
          <span>
            Frame<em>Building</em>
          </span>
        </a>
        <nav className="nav-links nav-right">
          <a href="#rewards">Rewards</a>
          <a href="/studio">Studio</a>
          <a href={BACK_URL} className="is-current" target="_blank" rel="noopener">
            Back it
          </a>
          {account}
        </nav>
        <button
          className="nav-toggle"
          aria-label="Menu"
          aria-expanded={open}
          aria-controls="navMenu"
          onClick={() => setOpen((o) => !o)}
        >
          <span />
          <span />
        </button>
      </div>

      <div className="nav-menu" id="navMenu" hidden={!open}>
        <a href="#story" onClick={close}>Story</a>
        <a href="#process" onClick={close}>Process</a>
        <a href="#library" onClick={close}>Library</a>
        <a href="#rewards" onClick={close}>Rewards</a>
        <a href="/studio">Studio</a>
        {user ? <a href="/account">Account &middot; {user.name}</a> : <a href="/login">Sign in</a>}
        <a href={BACK_URL} className="btn btn-light" target="_blank" rel="noopener">
          Back the project <span className="arr">&rarr;</span>
        </a>
      </div>
    </header>
  );
}
