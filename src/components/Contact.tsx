"use client";

import { MIND_DATA } from "../lib/items";

/**
 * Contact.
 *
 * Only renders links that exist in the data — an empty slot hides rather
 * than printing a dead address at the visitor.
 */

export default function Contact() {
  const { contact } = MIND_DATA;
  const links = [
    contact.email ? { label: "Email", href: `mailto:${contact.email}` } : null,
    contact.linkedin ? { label: "LinkedIn", href: contact.linkedin } : null,
    contact.site
      ? { label: "frontforumfocus.com", href: contact.site, note: "Founder" }
      : null,
    contact.github ? { label: "GitHub", href: contact.github } : null,
    contact.podcast ? { label: "frontforumfocus", href: contact.podcast } : null,
  ].filter(Boolean) as { label: string; href: string; note?: string }[];

  if (!links.length) return null;

  return (
    <section className="shrink-0 border-t border-line px-5 py-6">
      <span className="label" style={{ color: "var(--accent)" }}>
        Get in touch
      </span>
      <ul className="mt-4">
        {links.map((l) => (
          <li key={l.label}>
            <a
              href={l.href}
              target={l.href.startsWith("mailto:") ? undefined : "_blank"}
              rel="noreferrer noopener"
              className="group flex items-center justify-between gap-4 py-1.5 text-[16px] text-ink-2 transition-colors duration-200 hover:text-ink"
            >
              <span className="flex min-w-0 items-baseline gap-2">
                <span className="truncate">{l.label}</span>
                {l.note ? <span className="label-quiet">{l.note}</span> : null}
              </span>
              <span
                aria-hidden
                className="shrink-0 text-ink-3 transition-transform duration-200 ease-brand group-hover:translate-x-1"
              >
                →
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
