/* A room that is not there. It renders inside the shell, so the rail stays
 * up and the reader is one click from somewhere real rather than one press
 * of the back button. */

import Link from "next/link";

import { FIRST_ROOM } from "@/lib/rooms";

import styles from "./missing.module.css";

export default function NotFound() {
  return (
    <div className={styles.missing}>
      <h1 className={styles.head}>No such room</h1>
      <p className={styles.body}>
        Nothing in Azeroth answers to that name. Pick a place from the rail, or
        press ⌘K and type.
      </p>
      <Link href={FIRST_ROOM} className={styles.out}>
        Go to Duskwood
      </Link>
    </div>
  );
}
