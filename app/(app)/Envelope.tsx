"use client";

/* THE ENVELOPE. docs/WELCOME.md §3.3; lib/envelope.ts has the argument.
 *
 * WoW's mail icon, and the reason it is the model is that it is the softest
 * notification ever designed: a small mark on a screen you were already
 * looking at, no sound, and it waits exactly as long as you want it to. Every
 * thing about Tari lands here — a reply, a follow, a room you seeded getting
 * busy — because §3.2 rule 1 says only Azeroth may reach for you.
 *
 * THE MARK CARRIES NO NUMBER. §13 refuses a number that only goes up, and a
 * bold count on an envelope is the oldest engagement device on the internet:
 * it exists to make the unopened feel owed. The mark says *something* or
 * *nothing*. The list inside says what.
 *
 * IT IS NOT DRAWN WITHOUT AN ACCOUNT. Not a gate — there is simply no address
 * for anything to be sent to, and an empty envelope offered to a stranger
 * would be an advertisement for signing in. COMMUNITY.md: a stranger keeps the
 * whole tool, and the whole tool does not include a mailbox with nothing in
 * it.
 *
 * OPENING IT MARKS EVERYTHING SEEN, not one line at a time. The reader looked
 * at the list; that is what happened. An inbox where each item has to be
 * dismissed is a chore, and §13 does not hand out chores — nothing here is
 * ever deleted either, it just falls out of the bottom (ENVELOPE_LIMIT).
 */

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { CLASS_COLOR } from "@/lib/class-color";
import { noticeHref, noticeParts, type Notice } from "@/lib/envelope";
import { ageOf } from "@/lib/ago";
import type { ClassId } from "@/lib/types";

import styles from "./shell.module.css";

/* The game's own mail, off the same CDN every item icon comes off. Nothing
   here is redrawn — docs/CHARACTER.md's rule, and the reason the app feels
   like the world it is about. */
const MAIL = "https://render.worldofwarcraft.com/us/icons/56/inv_letter_15.jpg";

export default function Envelope({ signedIn }: { signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const [notices, setNotices] = useState<Notice[] | null>(null);
  const [unread, setUnread] = useState(false);
  const box = useRef<HTMLDivElement | null>(null);

  const look = useCallback(() => {
    if (!signedIn) return;
    fetch("/api/envelope")
      .then((r) => r.json())
      .then((b: { notices?: Notice[]; unread?: boolean }) => {
        setNotices(b.notices ?? []);
        setUnread(b.unread === true);
      })
      .catch(() => {});
  }, [signedIn]);

  /* Once on mount and never on a timer. A mailbox that polls is a mailbox
     that is trying to get your attention, which is the thing §3 exists to
     refuse. It refreshes when you open it, and that is enough. */
  useEffect(() => {
    look();
  }, [look]);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", away);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("mousedown", away);
      window.removeEventListener("keydown", key);
    };
  }, [open]);

  if (!signedIn) return null;

  const show = () => {
    const next = !open;
    setOpen(next);
    if (!next) return;
    look();
    /* Seen is seen. The mark goes out as the list comes up rather than after
       a delay, because the delay would only exist to keep the mark lit. */
    if (unread) {
      setUnread(false);
      fetch("/api/envelope", { method: "POST" }).catch(() => {});
    }
  };

  return (
    <div className={styles.post} ref={box}>
      <button
        type="button"
        className={styles.mail}
        data-lit={unread ? "" : undefined}
        onClick={show}
        aria-expanded={open}
        aria-label={unread ? "The envelope, with something in it" : "The envelope"}
        title={unread ? "Something is waiting" : "Nothing waiting"}
      >
        <img src={MAIL} alt="" decoding="async" />
      </button>

      {open ? (
        <div className={styles.postBox} role="dialog" aria-label="The envelope">
          {notices === null ? null : notices.length === 0 ? (
            <p className={styles.postEmpty}>
              Nothing yet. Replies to your pins and people following where you stand wait here.
            </p>
          ) : (
            <ul className={styles.postList}>
              {notices.map((n) => {
                const { lead, name, tail } = noticeParts(n);
                const href = noticeHref(n);
                const cls = n.actorCls ? CLASS_COLOR[n.actorCls as ClassId] : undefined;
                const line = (
                  <>
                    <span className={styles.postText}>
                      {lead}
                      {name ? (
                        <strong style={n.kind === "follow" && cls ? { color: cls } : undefined}>{name}</strong>
                      ) : null}
                      {tail}
                    </span>
                    <span className={styles.postAge}>{ageOf(n.at)}</span>
                  </>
                );
                return (
                  <li key={n.id} className={styles.postRow} data-new={n.readAt === null ? "" : undefined}>
                    {href ? (
                      <Link href={href} className={styles.postLink} onClick={() => setOpen(false)}>
                        {line}
                      </Link>
                    ) : (
                      <span className={styles.postLink}>{line}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
