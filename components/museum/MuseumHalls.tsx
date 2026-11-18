"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { CasesHall } from "@/components/museum/CasesHall";
import { DetailPanel } from "@/components/museum/DetailPanel";
import { HallSwitcher } from "@/components/museum/HallSwitcher";
import { MuseumClient } from "@/components/museum/MuseumClient";
import { casesItems } from "@/lib/cases";
import { caseHash, caseIdFromHash, hallFromHash, hashForHall, type Hall } from "@/lib/halls";
import type { MuseumChapter, MuseumItemData } from "@/lib/museum";

// The address bar is the only memory: "#cases" is the Glass Cases, "#case=<id>" is one open piece, nothing is the Story Tour.
const subscribe = (cb: () => void) => { window.addEventListener("hashchange", cb); window.addEventListener("vhq-hash", cb); return () => { window.removeEventListener("hashchange", cb); window.removeEventListener("vhq-hash", cb); }; };
const getHash = () => window.location.hash;
const getServerHash = () => "";
function setHash(hash: string) {
  window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${hash}`);
  window.dispatchEvent(new Event("vhq-hash"));
}

/** The Museum with its two halls. Both halls share the same data, so switching never loads anything. */
export function MuseumHalls({ chapters }: { chapters: MuseumChapter[] }) {
  const hash = useSyncExternalStore(subscribe, getHash, getServerHash);
  const hall = hallFromHash(hash);
  const items = casesItems(chapters);
  const wanted = caseIdFromHash(hash);
  const openId = wanted && items.some((i) => i.id === wanted) ? wanted : null;
  const [trigger, setTrigger] = useState<HTMLElement | null>(null); // the card that opened the panel, so focus can go back to it

  const chooseHall = useCallback((h: Hall) => setHash(hashForHall(h)), []);
  const open = useCallback((item: MuseumItemData, el: HTMLElement) => { setTrigger(el); setHash(caseHash(item.id)); }, []);

  return (
    <>
      <HallSwitcher hall={hall} onChange={chooseHall} />
      <div role="tabpanel" id={`hall-panel-${hall}`} aria-labelledby={`hall-tab-${hall}`} className={hall === "tour" ? "md:-mt-[18vh]" : ""}>
        {hall === "tour" ? <MuseumClient chapters={chapters} /> : <CasesHall items={items} onOpen={open} />}
      </div>
      <DetailPanel items={items} openId={openId} onClose={() => setHash("#cases")} onNavigate={(id) => setHash(caseHash(id))} returnFocusTo={trigger} />
    </>
  );
}
