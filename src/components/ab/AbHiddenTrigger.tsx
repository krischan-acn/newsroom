'use client';

import './AbOverlay.css';

// Deliberately unlabeled — opens the employee A/B overlay (same as pressing
// F2). Lives in TopNav per spec: "a button somewhere hidden in the navbar."
export default function AbHiddenTrigger() {
  return (
    <button
      type="button"
      aria-label="Employee tools"
      tabIndex={-1}
      onClick={() => window.dispatchEvent(new Event('ab:trigger'))}
      className="ab-hidden-trigger ml-2 h-2 w-2 rounded-full bg-gray-400"
    />
  );
}
