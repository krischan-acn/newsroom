'use client';

import { useEffect, useRef, useState, type FormEvent, type ReactElement } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import './AbOverlay.css';

type Session = { username: string; isAdmin: boolean };
type ExperimentInfo = { id: string; name: string };
type Mode = 'a' | 'b' | 'side' | 'slider';

const VARIANT_LINK_ID = 'ab-variant-stylesheet';

const MODES: { key: Mode; label: string; icon: ReactElement }[] = [
  {
    key: 'a',
    label: 'A',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
      </svg>
    ),
  },
  {
    key: 'b',
    label: 'B',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3" />
      </svg>
    ),
  },
  {
    key: 'side',
    label: 'Side-by-side',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="5" width="8" height="14" rx="1.5" stroke="currentColor" strokeWidth="2" />
        <rect x="13" y="5" width="8" height="14" rx="1.5" stroke="currentColor" strokeWidth="2" strokeDasharray="2.5 2.5" />
      </svg>
    ),
  },
  {
    key: 'slider',
    label: 'Slider',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
        <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="12" r="2.2" fill="currentColor" />
      </svg>
    ),
  },
];

function applyVariant(experimentId: string | null) {
  document.getElementById(VARIANT_LINK_ID)?.remove();
  if (!experimentId) return;
  const link = document.createElement('link');
  link.id = VARIANT_LINK_ID;
  link.rel = 'stylesheet';
  link.href = `/ab-variants/${experimentId}.css`;
  document.head.appendChild(link);
}

function pulse() {
  const root = document.documentElement;
  root.classList.remove('ab-pulse');
  void root.offsetWidth; // restart the animation
  root.classList.add('ab-pulse');
  window.setTimeout(() => root.classList.remove('ab-pulse'), 1200);
}

export default function AbOverlay() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const frame = searchParams.get('ab'); // 'a' | 'b' when rendered inside a compare iframe

  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [showLogin, setShowLogin] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginBusy, setLoginBusy] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [experiment, setExperiment] = useState<ExperimentInfo | null>(null);
  const [experimentLoading, setExperimentLoading] = useState(false);
  const [mode, setMode] = useState<Mode>('a');
  const [vote, setVote] = useState<'a' | 'b' | null>(null);
  const [sliderPos, setSliderPos] = useState(50);

  const frameARef = useRef<HTMLIFrameElement>(null);
  const frameBRef = useRef<HTMLIFrameElement>(null);
  const syncingRef = useRef(false);

  // ---- who's logged in (cookie-based; shared by iframes on the same origin) ----
  useEffect(() => {
    fetch('/api/ab/me')
      .then((r) => (r.ok ? r.json() : { session: null }))
      .then((d) => setSession(d.session))
      .catch(() => setSession(null));
  }, []);

  // ---- which experiment (if any) is active for this path ----
  useEffect(() => {
    if (!session) {
      setExperiment(null);
      return;
    }
    setExperimentLoading(true);
    const controller = new AbortController();
    fetch(`/api/ab/experiments?path=${encodeURIComponent(pathname)}`, {
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.json() : { experiment: null }))
      .then((d) => setExperiment(d.experiment))
      .catch(() => {})
      .finally(() => setExperimentLoading(false));
    return () => controller.abort();
  }, [pathname, session]);

  // ---- this employee's existing vote on that experiment ----
  useEffect(() => {
    if (!experiment || !session) {
      setVote(null);
      return;
    }
    fetch(`/api/ab/vote?experimentId=${experiment.id}`)
      .then((r) => (r.ok ? r.json() : { voted: null }))
      .then((d) => setVote(d.voted))
      .catch(() => {});
  }, [experiment, session]);

  // ---- reset per page: never carry a variant/mode choice across navigation ----
  useEffect(() => {
    setMode('a');
    setSliderPos(50);
    if (!frame) {
      setPanelOpen(false);
      applyVariant(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // ---- top-level solo A/B: swap the variant stylesheet in/out ----
  useEffect(() => {
    if (frame) return; // handled separately below for iframe panes
    if ((mode === 'a' || mode === 'b') && experiment) {
      applyVariant(mode === 'b' ? experiment.id : null);
    } else if (mode === 'a' || mode === 'b') {
      applyVariant(null);
    }
  }, [mode, experiment, frame]);

  // ---- iframe pane: apply the variant fixed by the ?ab= query param ----
  useEffect(() => {
    if (!frame) return;
    applyVariant(frame === 'b' && experiment ? experiment.id : null);
  }, [frame, experiment]);

  // ---- iframe pane: report its own scroll, and obey the parent's ----
  useEffect(() => {
    if (!frame) return;
    function onScroll() {
      if (syncingRef.current) return;
      window.parent.postMessage({ type: 'ab-scroll', from: frame, y: window.scrollY }, window.location.origin);
    }
    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin || e.data?.type !== 'ab-scroll-to') return;
      syncingRef.current = true;
      window.scrollTo(0, e.data.y);
      requestAnimationFrame(() => {
        syncingRef.current = false;
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('message', onMessage);
    };
  }, [frame]);

  // ---- parent: relay scroll position between the two compare iframes ----
  useEffect(() => {
    if (frame || (mode !== 'side' && mode !== 'slider')) return;
    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin || e.data?.type !== 'ab-scroll') return;
      const target = e.data.from === 'a' ? frameBRef.current : frameARef.current;
      target?.contentWindow?.postMessage({ type: 'ab-scroll-to', y: e.data.y }, window.location.origin);
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [frame, mode]);

  // ---- F2 / hidden navbar button trigger ----
  useEffect(() => {
    if (frame) return;
    function trigger() {
      if (!session) setShowLogin(true);
      else setPanelOpen((v) => !v);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'F2') return;
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      e.preventDefault();
      trigger();
    }
    window.addEventListener('keydown', onKey);
    window.addEventListener('ab:trigger', trigger);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('ab:trigger', trigger);
    };
  }, [frame, session]);

  async function submitLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoginBusy(true);
    setLoginError(null);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch('/api/ab/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: form.get('username'), password: form.get('password') }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error ?? 'Login failed');
        return;
      }
      const me = await fetch('/api/ab/me').then((r) => r.json());
      setSession(me.session);
      setShowLogin(false);
      setPanelOpen(true);
    } catch {
      setLoginError('Network error');
    } finally {
      setLoginBusy(false);
    }
  }

  async function logout() {
    await fetch('/api/ab/logout', { method: 'POST' });
    setSession(null);
    setPanelOpen(false);
    setExperiment(null);
    applyVariant(null);
  }

  function selectMode(next: Mode) {
    setMode(next);
    pulse();
  }

  async function castVote(choice: 'a' | 'b') {
    if (!experiment) return;
    setVote(choice); // optimistic; results stay hidden either way
    const res = await fetch('/api/ab/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ experimentId: experiment.id, choice }),
    });
    if (!res.ok) {
      // reconcile on failure
      const d = await fetch(`/api/ab/vote?experimentId=${experiment.id}`).then((r) => r.json());
      setVote(d.voted ?? null);
    }
  }

  function frameSrc(which: 'a' | 'b') {
    const params = new URLSearchParams(searchParams.toString());
    params.set('ab', which);
    return `${pathname}?${params.toString()}`;
  }

  // Rendered inside a compare iframe: no chrome of its own, just the effects above.
  if (frame) return null;

  const showCompare = panelOpen && experiment && (mode === 'side' || mode === 'slider');

  return (
    <>
      {showLogin && !session && (
        <div className="ab-modal-backdrop fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 px-4 backdrop-blur-[2px]">
          <form
            onSubmit={submitLogin}
            className="ab-modal-card w-full max-w-xs rounded-xl bg-white p-6 shadow-2xl ring-1 ring-black/5"
          >
            <div className="mb-4 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--accent-color)] text-[11px] font-bold text-white">
                AB
              </span>
              <h2 className="text-sm font-semibold text-gray-900">Employee sign in</h2>
            </div>
            <label className="mb-3 block text-xs font-medium text-gray-600">
              Username
              <input
                name="username"
                autoComplete="username"
                autoFocus
                className="mt-1 w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm outline-none transition-colors focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)]"
              />
            </label>
            <label className="mb-4 block text-xs font-medium text-gray-600">
              Password
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                className="mt-1 w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm outline-none transition-colors focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)]"
              />
            </label>
            {loginError && (
              <p className="mb-3 rounded-md bg-red-50 px-2.5 py-1.5 text-xs text-red-600">{loginError}</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowLogin(false)}
                className="rounded-md px-3 py-1.5 text-xs text-gray-500 transition-colors hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loginBusy}
                className="rounded-md bg-[var(--accent-color)] px-3.5 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {loginBusy ? 'Signing in…' : 'Sign in'}
              </button>
            </div>
          </form>
        </div>
      )}

      {showCompare && (
        <div className="fixed inset-x-0 top-0 bottom-14 z-[998] flex bg-white">
          {mode === 'side' && (
            <>
              <div className="relative w-1/2">
                <span className="absolute left-2 top-2 z-10 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  A
                </span>
                <iframe ref={frameARef} src={frameSrc('a')} className="h-full w-full border-0" title="Variant A" />
              </div>
              <div className="w-px shrink-0 bg-gray-300" />
              <div className="relative w-1/2">
                <span className="absolute left-2 top-2 z-10 rounded bg-[var(--accent-color)] px-1.5 py-0.5 text-[10px] font-medium text-white">
                  B
                </span>
                <iframe ref={frameBRef} src={frameSrc('b')} className="h-full w-full border-0" title="Variant B" />
              </div>
            </>
          )}
          {mode === 'slider' && (
            <div className="relative h-full w-full overflow-hidden">
              <iframe ref={frameARef} src={frameSrc('a')} className="absolute inset-0 h-full w-full border-0" title="Variant A" />
              <span className="absolute right-2 top-2 z-10 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                A
              </span>
              <div className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${sliderPos}%` }}>
                <iframe
                  ref={frameBRef}
                  src={frameSrc('b')}
                  className="absolute inset-y-0 left-0 h-full border-0"
                  style={{ width: '100vw' }}
                  title="Variant B"
                />
                <span className="absolute left-2 top-2 z-10 rounded bg-[var(--accent-color)] px-1.5 py-0.5 text-[10px] font-medium text-white">
                  B
                </span>
              </div>
              <div
                className="absolute inset-y-0 z-10 flex w-0.5 -translate-x-1/2 items-center justify-center bg-[var(--accent-color)]"
                style={{ left: `${sliderPos}%` }}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent-color)] text-[10px] text-white shadow">
                  ⇔
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {session && (
        <div
          className={`ab-bar fixed inset-x-0 bottom-0 z-[999] flex h-14 items-center gap-3 border-t border-gray-200 bg-white px-4 text-sm shadow-[0_-2px_12px_rgba(0,0,0,0.08)] ${
            panelOpen ? 'translate-y-0' : 'pointer-events-none translate-y-full'
          }`}
        >
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[var(--accent-color)] text-[9px] font-bold text-white">
            AB
          </span>

          {experimentLoading ? (
            <span className="text-xs text-gray-400">Checking this page…</span>
          ) : (
            <span className="max-w-[12rem] shrink-0 truncate font-medium text-gray-800">
              {experiment ? experiment.name : 'No experiment on this page'}
            </span>
          )}

          {experiment && (
            <>
              <div className="flex gap-1">
                {MODES.map(({ key, label, icon }) => (
                  <button
                    key={key}
                    onClick={() => selectMode(key)}
                    title={label}
                    aria-pressed={mode === key}
                    className={`flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                      mode === key
                        ? 'bg-[var(--accent-color)] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {icon}
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                ))}
              </div>

              {mode === 'slider' && (
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={sliderPos}
                  onChange={(e) => setSliderPos(Number(e.target.value))}
                  className="w-28 accent-[var(--accent-color)]"
                  aria-label="Slider position"
                />
              )}

              <div className="ml-auto flex items-center gap-1.5">
                <span className="text-xs text-gray-500">Prefer:</span>
                <button
                  onClick={() => castVote('a')}
                  className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    vote === 'a' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {vote === 'a' && <span aria-hidden>✓</span>} A
                </button>
                <button
                  onClick={() => castVote('b')}
                  className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    vote === 'b' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {vote === 'b' && <span aria-hidden>✓</span>} B
                </button>
              </div>
            </>
          )}

          <div className={`flex shrink-0 items-center gap-3 ${experiment ? '' : 'ml-auto'}`}>
            {session.isAdmin && (
              <a href="/admin" className="text-xs text-gray-400 transition-colors hover:text-gray-700">
                Admin
              </a>
            )}
            <button onClick={logout} className="text-xs text-gray-400 transition-colors hover:text-gray-700">
              Log out
            </button>
            <button
              onClick={() => setPanelOpen(false)}
              aria-label="Close"
              className="flex h-5 w-5 items-center justify-center rounded text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </>
  );
}
