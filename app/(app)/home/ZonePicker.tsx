"use client";

/* ONE CLICK TO ANY ZONE. docs/DIRECTION.md §4.1: "a good default plus a click
 * is a fine product."
 *
 * A NATIVE SELECT, AND THAT IS A CHOICE. Seventy-five rooms in a custom
 * listbox is a scrolling menu to build, keyboard-trap and style twice; the
 * platform's own control types ahead, opens under the thumb on a laptop
 * trackpad and reads correctly to a screen reader on the day it ships. ⌘K is
 * already the fast way through the world (Shell.tsx) and this is the slow one,
 * sitting where the reader is looking.
 *
 * IT NAVIGATES RATHER THAN SETTING STATE. The zone is a search param, so
 * picking one is a URL the reader can share, refresh and go back from
 * (docs/SHELL.md, "the URL is the state"). `replace` and not `push`: a reader
 * who tried four zones should not have to press back four times to leave. */

import { useRouter } from "next/navigation";

import { KIND_LABEL, KIND_ORDER, roomsByKind } from "@/lib/rooms";

import styles from "./home.module.css";

export default function ZonePicker({ current }: { current: string }) {
  const router = useRouter();
  const groups = roomsByKind();

  return (
    <select
      className={styles.picker}
      value={current}
      aria-label="Show a different zone"
      onChange={(e) => router.replace(`/home?zone=${e.target.value}`)}
    >
      {KIND_ORDER.map((kind) => {
        const rooms = groups.filter((g) => g.kind === kind).flatMap((g) => g.rooms);
        if (rooms.length === 0) return null;
        return (
          <optgroup key={kind} label={KIND_LABEL[kind]}>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </optgroup>
        );
      })}
    </select>
  );
}
