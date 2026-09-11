"use client";

import { useEffect, useRef } from "react";

// Renders the Cloudflare Turnstile challenge inline. The script (loaded once
// in the root layout) discovers `.cf-turnstile` nodes on its own and injects
// an invisible iframe; on completion it sets a hidden input named
// "cf-turnstile-response" inside our form, which is what the Server Action
// reads via formData.
//
// Renders nothing when no sitekey is configured, so the form still works
// before Turnstile is set up.
export function TurnstileWidget({ sitekey }: { sitekey: string | null }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Re-run Turnstile's auto-render if its script loaded before this
    // component mounted (e.g. on a client-side navigation).
    const w = window as unknown as {
      turnstile?: {
        render?: (el: HTMLElement, opts: { sitekey: string }) => void;
      };
    };
    if (sitekey && ref.current && w.turnstile?.render) {
      w.turnstile.render(ref.current, { sitekey });
    }
  }, [sitekey]);

  if (!sitekey) return null;
  return <div ref={ref} className="cf-turnstile" data-sitekey={sitekey} />;
}
