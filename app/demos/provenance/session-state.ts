"use client";

// ————————————————————————————————————————————————————————————————
// State that survives a reload, for the life of the browser session.
//
// On a phone, exporting a PDF navigates the window to it and coming back
// reloads the app. The shell already remembers which section you were
// on. This is the same idea one level down: the filters you had set, the
// tab you were on, which row was open — written down as you change them
// and read back when the page comes back.
//
// It is a drop-in for useState. Swap the call, give it a key, and the
// value is remembered.
//
// Session rather than permanent, deliberately. A reload in the middle of
// work puts you back where you were; a fresh visit another day starts
// clean, rather than opening on whatever filter somebody left last week.
//
// It reads synchronously as the component starts rather than after, so
// there is no frame where the default filter shows and then snaps to
// yours. That is safe only because the shell draws nothing until it has
// restored its own place, which means no desk ever renders on the server
// — the window check below is the belt to that pair of braces.
//
// What it cannot remember is a half-filled form. Those are drafts, and
// drafts are a separate feature.
// ————————————————————————————————————————————————————————————————

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

const PREFIX = "salcombe-dairy.ui.";

export function useSessionState<T>(
  key: string,
  initial: T,
  // A value read back from storage is untrusted: an older build may have
  // written a tab or a sort that no longer exists. Anything that fails
  // this is ignored in favour of the default, rather than rendering a
  // screen for a state the code no longer knows.
  valid?: (v: unknown) => boolean,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return initial;
    try {
      const raw = window.sessionStorage.getItem(PREFIX + key);
      if (raw === null) return initial;
      const parsed: unknown = JSON.parse(raw);
      if (valid && !valid(parsed)) return initial;
      return parsed as T;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      window.sessionStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      // Storage full or blocked: it lasts until the next reload instead.
    }
  }, [key, value]);

  return [value, setValue];
}

// Small validators, so each call site reads as a sentence.
export const isOneOf =
  <T extends string>(...allowed: T[]) =>
  (v: unknown): boolean =>
    typeof v === "string" && (allowed as string[]).includes(v);

export const isStringOrNull = (v: unknown): boolean => v === null || typeof v === "string";

export const isRecordOfBooleans = (v: unknown): boolean =>
  typeof v === "object" &&
  v !== null &&
  !Array.isArray(v) &&
  Object.values(v as Record<string, unknown>).every((x) => typeof x === "boolean");
