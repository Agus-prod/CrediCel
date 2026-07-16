"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { logout } from "@/app/login/actions";

export interface MobileNavItem {
  readonly href: string;
  readonly label: string;
}

const isCurrentPath = (pathname: string, href: string) =>
  href === "/"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);

export function NavigationLinks({
  items,
  label,
}: {
  readonly items: readonly MobileNavItem[];
  readonly label: string;
}) {
  const pathname = usePathname();
  return (
    <nav aria-label={label}>
      {items.map((item) => {
        const current = isCurrentPath(pathname, item.href);
        return (
          <Link
            aria-current={current ? "page" : undefined}
            className={current ? "navlink active" : "navlink"}
            href={item.href}
            key={`${item.href}-${item.label}`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileNavigation({
  items,
}: {
  readonly items: readonly MobileNavItem[];
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const previousPathRef = useRef(pathname);

  useEffect(() => {
    if (previousPathRef.current !== pathname) {
      previousPathRef.current = pathname;
      setOpen(false);
    }
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const menuButton = menuButtonRef.current;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = drawerRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      menuButton?.focus();
    };
  }, [open]);

  return (
    <>
      <button
        aria-controls="mobile-navigation"
        aria-expanded={open}
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        className="menu-button"
        onClick={() => setOpen((value) => !value)}
        ref={menuButtonRef}
        type="button"
      >
        <span />
        <span />
        <span />
      </button>
      {open && (
        <button
          aria-label="Cerrar menú"
          className="nav-backdrop"
          onClick={() => setOpen(false)}
          tabIndex={-1}
          type="button"
        />
      )}
      <div
        aria-hidden={!open}
        aria-label="Menú principal"
        aria-modal={open || undefined}
        className={`mobile-drawer ${open ? "is-open" : ""}`}
        id="mobile-navigation"
        inert={!open}
        ref={drawerRef}
        role="dialog"
      >
        <div className="mobile-drawer-head">
          <strong>Menú</strong>
          <button
            aria-label="Cerrar menú"
            onClick={() => setOpen(false)}
            ref={closeButtonRef}
            type="button"
          >
            ×
          </button>
        </div>
        <NavigationLinks items={items} label="Navegación móvil" />
        <form action={logout}>
          <button className="mobile-logout" type="submit">
            Cerrar sesión
          </button>
        </form>
      </div>
    </>
  );
}
