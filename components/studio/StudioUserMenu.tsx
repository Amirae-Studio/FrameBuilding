"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";
import { useTheme } from "../../lib/theme";
import type { NavUser } from "../../lib/user";

/** Avatar button in the Studio header that opens account, stage-light and access controls. */
export function StudioUserMenu({
  user,
  hasAccess,
  onConnect,
}: {
  user: NavUser;
  hasAccess: boolean;
  onConnect: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const { mode, setMode } = useTheme();
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="fbs-menu" ref={rootRef}>
      <button
        type="button"
        className={`fbs-user${open ? " is-open" : ""}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        onClick={() => setOpen((o) => !o)}
      >
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" className="fbs-avatar" />
        ) : (
          <span className="fbs-avatar">{user.initial}</span>
        )}
        <svg className="fbs-chev" viewBox="0 0 24 24" aria-hidden>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="fbs-menu-pop" role="menu">
          <div className="fbs-menu-who">
            <span className="fbs-menu-name">{user.name}</span>
            <span className="fbs-menu-email">{user.email}</span>
            <span className={`fbs-menu-access${hasAccess ? " is-connected" : ""}`}>
              <i />
              {hasAccess ? "Studio unlocked" : "View only"}
            </span>
          </div>

          {!hasAccess && (
            <button
              type="button"
              role="menuitem"
              className="fbs-menu-item is-accent"
              onClick={() => {
                setOpen(false);
                onConnect();
              }}
            >
              Enter access code
            </button>
          )}

          <div className="fbs-menu-row">
            <span>Stage</span>
            <div className="fbs-menu-seg" role="group" aria-label="Stage light">
              <button type="button" aria-pressed={mode === "dark"} onClick={() => setMode("dark")}>
                Violet
              </button>
              <button type="button" aria-pressed={mode === "light"} onClick={() => setMode("light")}>
                Paper
              </button>
            </div>
          </div>

          <Link href="/account" role="menuitem" className="fbs-menu-item" onClick={() => setOpen(false)}>
            Account
          </Link>
          <button type="button" role="menuitem" className="fbs-menu-item" onClick={signOut}>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
