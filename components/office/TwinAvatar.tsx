"use client";
import { useRef, useState } from "react";
import { TwinChat } from "@/components/office/TwinChat";

const DEFAULT_AVATAR = "/twin.svg";

/** The round AI Twin button fixed in the corner of every Office page. Click it to open the chat. */
export function TwinAvatar({ avatarUrl }: { avatarUrl?: string }) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const src = avatarUrl || DEFAULT_AVATAR;

  function close() {
    setOpen(false);
    button.current?.focus(); // keyboard users land back where they were
  }

  return (
    <>
      <button
        ref={button}
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-expanded={open}
        aria-label={open ? "Close AI Twin" : "Open AI Twin"}
        className="fixed bottom-4 right-4 z-40 h-14 w-14 overflow-hidden rounded-full border-2 border-accent shadow-lg shadow-black/40 transition hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" width={56} height={56} className="h-full w-full object-cover" />
      </button>
      {open && <TwinChat avatarUrl={src} onClose={close} />}
    </>
  );
}
