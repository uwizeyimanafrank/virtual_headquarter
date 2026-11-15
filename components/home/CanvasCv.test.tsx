import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockMedia } from "@/tests/media-query";
import { render } from "@testing-library/react";
import { CanvasCv } from "@/components/home/CanvasCv";
import type { HomeData } from "@/lib/home";

const data = (cvUrl?: string): HomeData => ({ heroTitle: "", heroText: "", chapterTitles: { about: "a", certificates: "b", projects: "c", library: "d" }, profile: { name: "Frank", tagline: "", bio: "", photoUrl: "", cvUrl }, items: [], blocks: [] });

beforeEach(() => mockMedia({}));
afterEach(() => vi.unstubAllGlobals());

describe("Canvas CV download", () => {
  it("shows Download CV only when the owner set a link, opening safely in a new tab", () => {
    const { getByText } = render(<CanvasCv data={data("https://x.dev/cv.pdf")} />);
    const a = getByText("Download CV") as HTMLAnchorElement;
    expect(a.getAttribute("href")).toBe("https://x.dev/cv.pdf");
    expect(a.getAttribute("rel")).toContain("noopener");
  });
  it("hides the button with no link, but keeps the print view button", () => {
    for (const v of [undefined, ""]) {
      const { queryByText, getByText, unmount } = render(<CanvasCv data={data(v)} />);
      expect(queryByText("Download CV")).toBeNull();
      expect(getByText("Print view")).toBeTruthy();
      unmount();
    }
  });
});
