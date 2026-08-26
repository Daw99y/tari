"use client";

/* THE ONE SOCKET. docs/SHELL.md's Liveblocks seam, filled with Ably.
 *
 * It mounts here, inside the shell, above both the room and the people
 * column — so changing room is a message on an open connection rather than
 * a fresh handshake, which is the whole "the live feeling survives
 * navigation" requirement (§11.1).
 *
 * SHELL.md put the per-room provider down in the room's page.tsx. It moves
 * up here instead, for one reason: the people column is a sibling of the
 * room, not a child, and it needs the same room's presence. One scope
 * around both is the only place both can read it.
 *
 * THREE CLIENTS, ONE CONNECTION. `Ably.Realtime` is the connection; the
 * chat client and the spaces client are two views onto it, so this costs
 * one socket, not three.
 *
 * WHAT HAPPENS WITH NO KEY. /api/ably answers 503, the connection fails,
 * and `useLive().up` goes false. Every surface then reads exactly as it did
 * before Ably existed. A deploy without the key is not a broken deploy. */

import * as Ably from "ably";
import { ChatClient } from "@ably/chat";
import { ChatClientProvider, ChatRoomProvider, usePresence } from "@ably/chat/react";
import Spaces from "@ably/spaces";
import { SpaceProvider, SpacesProvider } from "@ably/spaces/react";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { CURSOR_BATCH_MS, wireName, type Who } from "@/lib/ably";
import { loadCharacter } from "@/lib/character";

/* Room options are read once when the room is created and must be a stable
   reference or the room is released and rebuilt on every render. Module
   constants, therefore, not inline objects. */
const ROOM_OPTIONS = { typing: { heartbeatThrottleMs: 5_000 } };
/* `paginationLimit` is how far back the cursors channel is read when you
   arrive, so a cursor already on screen is there before its owner moves.
   Five is the SDK default and it is plenty. */
const SPACE_OPTIONS = {
  cursors: { outboundBatchInterval: CURSOR_BATCH_MS, paginationLimit: 5 },
};

const KEY = "tari:live-id";

/** A stable handle for a browser with no account, minted once and kept.
 *  It says "the same visitor as last time" and nothing more; the server
 *  overrides it entirely for anyone signed in (app/api/ably/route.ts). */
function guestId(): string {
  try {
    const had = localStorage.getItem(KEY);
    if (had) return had;
    const made = Math.random().toString(36).slice(2, 12);
    localStorage.setItem(KEY, made);
    return made;
  } catch {
    return "anon";
  }
}

type LiveState = {
  /** Whether there is a live layer on this build at all. */
  up: boolean;
  /** Who this browser is standing in the room as. */
  me: Who | null;
  /** Our own clientId, so a room can tell our cursor from everyone else's. */
  meId: string | null;
};

const LiveContext = createContext<LiveState>({ up: false, me: null, meId: null });

export function useLive(): LiveState {
  return useContext(LiveContext);
}

type Clients = { realtime: Ably.Realtime; chat: ChatClient; spaces: Spaces };

export default function Live({ roomId, children }: { roomId: string | null; children: ReactNode }) {
  const [me, setMe] = useState<Who | null>(null);
  const [clients, setClients] = useState<Clients | null>(null);
  const [meId, setMeId] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  /* The character is a localStorage read, so it cannot happen during the
     server render. Re-read on a room change and on focus, which between
     them cover the one real flow: switch character on /you, walk into a
     room. */
  useEffect(() => {
    function read() {
      const c = loadCharacter();
      setMe((was) => {
        if (!c) return null;
        const next: Who = {
          name: c.name,
          cls: c.cls,
          level: c.level,
          race: c.race,
          faction: c.faction,
          realm: c.realm,
          guild: c.guild ?? null,
        };
        /* Same character, same object — otherwise every focus event is a
           presence update nobody asked for. */
        return was && JSON.stringify(was) === JSON.stringify(next) ? was : next;
      });
    }
    read();
    window.addEventListener("focus", read);
    return () => window.removeEventListener("focus", read);
  }, [roomId]);

  const has = !!me;

  /* One connection for the life of the shell. Opened as soon as there is a
     character to open it as — a reader with no character is on their way to
     the creator anyway (Shell.tsx), and there is nothing to say in a room
     until they have a name. */
  useEffect(() => {
    if (!has) return;
    const realtime = new Ably.Realtime({
      authUrl: "/api/ably",
      authParams: { id: guestId() },
      closeOnUnload: true,
    });
    const onFail = () => setFailed(true);
    const onUp = () => {
      setFailed(false);
      setMeId(realtime.auth.clientId ?? null);
    };
    realtime.connection.on("failed", onFail);
    realtime.connection.on("connected", onUp);
    setClients({ realtime, chat: new ChatClient(realtime), spaces: new Spaces(realtime) });
    return () => {
      realtime.connection.off();
      realtime.close();
      setClients(null);
    };
  }, [has]);

  const value = useMemo<LiveState>(
    () => ({ up: !!clients && !failed, me, meId }),
    [clients, failed, me, meId]
  );

  /* Until there is a connection the children render exactly as they did
     before any of this existed. They remount once, on the tick the socket
     is created — the first client frame, before anything has been read,
     and never again for the life of the shell. */
  return (
    <LiveContext value={value}>
      {clients ? (
        <ChatClientProvider client={clients.chat}>
          <SpacesProvider client={clients.spaces}>
            <Scope roomId={roomId} me={me}>
              {children}
            </Scope>
          </SpacesProvider>
        </ChatClientProvider>
      ) : (
        children
      )}
    </LiveContext>
  );
}

/* One room's scope, swapped by name. The element type never changes, so
   walking next door re-targets the providers instead of tearing down
   everything under them. */
function Scope({
  roomId,
  me,
  children,
}: {
  roomId: string | null;
  me: Who | null;
  children: ReactNode;
}) {
  if (!roomId) return children;
  return (
    <ChatRoomProvider name={wireName(roomId)} options={ROOM_OPTIONS}>
      <SpaceProvider name={wireName(roomId)} options={SPACE_OPTIONS}>
        {me ? <Standing me={me} /> : null}
        {children}
      </SpaceProvider>
    </ChatRoomProvider>
  );
}

/* STANDING IN THE ROOM. Presence is entered here rather than in the chat,
 * because being in a room and talking in it are different things: you are
 * in Duskwood the moment you arrive, whether or not you ever type. */
function Standing({ me }: { me: Who }) {
  const { update, myPresenceState } = usePresence({ initialData: me });

  /* Level, gear and guild change under a reader who never reloads. */
  useEffect(() => {
    if (myPresenceState.present) void update(me).catch(() => {});
  }, [me, myPresenceState.present, update]);

  return null;
}
