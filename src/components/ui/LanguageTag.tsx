// components/ui/LanguageTag.tsx
'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  resolveLanguage,
  searchHrefFor,
  type LanguageInfo,
} from '@/lib/languages';

type Variant = 'badge' | 'inline';

interface LanguageTagProps {
  /** Any known spelling of a language. Unknown values render verbatim. */
  value: string | null | undefined;
  variant?: Variant;
  /** Show the English name beside the badge. */
  withLabel?: boolean;
  className?: string;
}

const MENU_MARGIN = 8;

/**
 * Language tag with an explanatory tooltip (hover + keyboard focus) and a
 * right-click details menu.
 *
 * Rendered as a <span role="button"> rather than a <button> because list rows
 * wrap their whole body in a <Link>, and a nested <button> is invalid HTML.
 * All pointer handlers stop propagation so activating the tag never triggers
 * the surrounding link.
 */
export function LanguageTag({
  value,
  variant = 'badge',
  withLabel = false,
  className = '',
}: LanguageTagProps) {
  const language = resolveLanguage(value);
  const anchorRef = useRef<HTMLSpanElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const tooltipId = useId();
  const menuId = useId();

  const [mounted, setMounted] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [menuAt, setMenuAt] = useState<{ x: number; y: number } | null>(null);
  const [menuPos, setMenuPos] = useState<{ left: number; top: number } | null>(null);

  useEffect(() => setMounted(true), []);

  const closeMenu = useCallback(() => {
    setMenuAt(null);
    setMenuPos(null);
    anchorRef.current?.focus();
  }, []);

  const openMenuAt = useCallback((x: number, y: number) => {
    setTooltipOpen(false);
    setMenuAt({ x, y });
    setMenuPos(null);
  }, []);

  const openMenuFromAnchor = useCallback(() => {
    const rect = anchorRef.current?.getBoundingClientRect();
    if (!rect) return;
    openMenuAt(rect.left, rect.bottom + 4);
  }, [openMenuAt]);

  // Measure after mount so the menu can flip away from the viewport edges.
  useEffect(() => {
    if (!menuAt || !menuRef.current) return;
    const { width, height } = menuRef.current.getBoundingClientRect();
    let left = menuAt.x;
    let top = menuAt.y;
    if (left + width + MENU_MARGIN > window.innerWidth) {
      left = Math.max(MENU_MARGIN, menuAt.x - width);
    }
    if (top + height + MENU_MARGIN > window.innerHeight) {
      top = Math.max(MENU_MARGIN, menuAt.y - height - 8);
    }
    setMenuPos({ left, top });
  }, [menuAt]);

  // Focus only once the menu is actually on screen. focus() is a silent no-op
  // on a visibility:hidden element, so focusing inside the measuring effect
  // above left keyboard users stranded on the tag with an open menu they
  // could not reach.
  useEffect(() => {
    if (menuPos) menuRef.current?.focus();
  }, [menuPos]);

  // Dismiss on Escape, outside pointer, scroll or resize.
  useEffect(() => {
    if (!menuAt) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeMenu();
      } else if (e.key === 'Tab') {
        closeMenu();
      }
    };
    const onPointerDown = (e: PointerEvent) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      if (anchorRef.current?.contains(e.target as Node)) return;
      setMenuAt(null);
      setMenuPos(null);
    };
    const onDismiss = () => {
      setMenuAt(null);
      setMenuPos(null);
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('scroll', onDismiss, true);
    window.addEventListener('resize', onDismiss);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('scroll', onDismiss, true);
      window.removeEventListener('resize', onDismiss);
    };
  }, [menuAt, closeMenu]);

  if (!value) return null;

  const label = language?.label ?? value;
  const badge = language?.badge ?? value.toUpperCase().slice(0, 6);
  const description =
    language?.description ??
    `“${value}” is not a language tag this site recognises. It is shown exactly as the newswire supplied it.`;

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openMenuAt(e.clientX, e.clientY);
  };

  const handleClick = (e: React.MouseEvent) => {
    // The tag frequently sits inside a card-wide <Link>; never navigate.
    e.preventDefault();
    e.stopPropagation();
    if (menuAt) closeMenu();
    else openMenuFromAnchor();
  };

  // Roving focus across the menu items. Without this the menu container holds
  // focus and the only reachable action is Escape.
  const handleMenuKeyDown = (e: React.KeyboardEvent) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
    );
    if (items.length === 0) return;

    const current = items.indexOf(document.activeElement as HTMLElement);
    let next: number;
    if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = items.length - 1;
    else if (e.key === 'ArrowDown') next = current < 0 ? 0 : (current + 1) % items.length;
    else next = current <= 0 ? items.length - 1 : current - 1;

    items[next]?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ContextMenu') {
      e.preventDefault();
      e.stopPropagation();
      openMenuFromAnchor();
    } else if (e.shiftKey && e.key === 'F10') {
      e.preventDefault();
      e.stopPropagation();
      openMenuFromAnchor();
    }
  };

  const baseStyles =
    variant === 'badge'
      ? 'inline-flex items-center gap-1 rounded border border-gray-300 bg-gray-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none tracking-wide text-gray-600'
      : 'inline-flex items-center gap-1 text-xs text-gray-600 underline decoration-dotted underline-offset-2';

  return (
    <>
      <span
        ref={anchorRef}
        role="button"
        tabIndex={0}
        lang={language?.bcp47}
        aria-label={`Language: ${label}. Press Enter or right-click for details.`}
        aria-describedby={tooltipOpen ? tooltipId : undefined}
        aria-haspopup="menu"
        aria-expanded={menuAt ? true : false}
        aria-controls={menuAt ? menuId : undefined}
        onContextMenu={handleContextMenu}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onMouseEnter={() => setTooltipOpen(true)}
        onMouseLeave={() => setTooltipOpen(false)}
        onFocus={() => setTooltipOpen(true)}
        onBlur={() => setTooltipOpen(false)}
        className={`${baseStyles} cursor-help transition-colors hover:border-gray-400 hover:text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2088c9] focus-visible:ring-offset-1 ${className}`}
      >
        {badge}
        {withLabel && <span className="normal-case font-normal">{label}</span>}
      </span>

      {mounted && tooltipOpen && !menuAt && (
        <Tooltip anchorRef={anchorRef} id={tooltipId}>
          <span className="font-semibold">{label}</span>
          {language && language.endonym !== language.label && (
            <span lang={language.bcp47} className="ml-1 text-gray-300">
              {language.endonym}
            </span>
          )}
          <span className="mt-1 block text-gray-300">{description}</span>
          <span className="mt-1.5 block text-[10px] uppercase tracking-wide text-gray-400">
            Right-click for details
          </span>
        </Tooltip>
      )}

      {mounted &&
        menuAt &&
        createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            tabIndex={-1}
            aria-label={`${label} language details`}
            onKeyDown={handleMenuKeyDown}
            style={{
              left: menuPos?.left ?? menuAt.x,
              top: menuPos?.top ?? menuAt.y,
              visibility: menuPos ? 'visible' : 'hidden',
            }}
            className="fixed z-[100] w-64 rounded-md border border-gray-200 bg-white py-1 text-sm shadow-lg focus:outline-none"
          >
            <div className="border-b border-gray-100 px-3 pb-2 pt-1.5">
              <p className="font-semibold text-gray-900">{label}</p>
              {language && language.endonym !== language.label && (
                <p lang={language.bcp47} className="text-xs text-gray-500">
                  {language.endonym}
                </p>
              )}
              <p className="mt-1 text-xs leading-relaxed text-gray-500">
                {description}
              </p>
            </div>

            {language && (
              <dl className="border-b border-gray-100 px-3 py-2 text-xs">
                <Detail term="Language tag" value={language.bcp47} />
                <Detail term="Script" value={language.script} />
                <Detail term="Times shown in" value={language.timezone} />
                {language.subdomain && (
                  <Detail term="Edition" value={language.subdomain} />
                )}
              </dl>
            )}

            {language && (
              <Link
                href={searchHrefFor(language)}
                role="menuitem"
                onClick={() => setMenuAt(null)}
                className="block px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
              >
                Browse all {label} releases
              </Link>
            )}

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                navigator.clipboard
                  ?.writeText(language?.bcp47 ?? value)
                  .catch(() => {});
                closeMenu();
              }}
              className="block w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
            >
              Copy language tag
            </button>
          </div>,
          document.body,
        )}
    </>
  );
}

function Detail({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 py-0.5">
      <dt className="text-gray-500">{term}</dt>
      <dd className="font-medium text-gray-800">{value}</dd>
    </div>
  );
}

/** Fixed-position tooltip that flips above/below the anchor to stay on screen. */
function Tooltip({
  anchorRef,
  id,
  children,
}: {
  anchorRef: React.RefObject<HTMLSpanElement | null>;
  id: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useEffect(() => {
    const anchor = anchorRef.current;
    const tip = ref.current;
    if (!anchor || !tip) return;

    const a = anchor.getBoundingClientRect();
    const t = tip.getBoundingClientRect();

    let left = a.left + a.width / 2 - t.width / 2;
    left = Math.max(MENU_MARGIN, Math.min(left, window.innerWidth - t.width - MENU_MARGIN));

    const above = a.top - t.height - 6;
    const top = above >= MENU_MARGIN ? above : a.bottom + 6;

    setPos({ left, top });
  }, [anchorRef]);

  return createPortal(
    <div
      ref={ref}
      id={id}
      role="tooltip"
      style={{
        left: pos?.left ?? 0,
        top: pos?.top ?? 0,
        visibility: pos ? 'visible' : 'hidden',
      }}
      className="pointer-events-none fixed z-[100] w-64 rounded-md bg-gray-900 px-3 py-2 text-xs leading-relaxed text-white shadow-lg"
    >
      {children}
    </div>,
    document.body,
  );
}
