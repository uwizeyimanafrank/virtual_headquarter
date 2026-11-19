import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { DispatchCard } from "@/components/home/DispatchCard";
import { DispatchList } from "@/components/home/DispatchList";
import type { PublicDispatch } from "@/lib/dispatches-public";

const d = (over: Partial<PublicDispatch>): PublicDispatch => ({ id: "1", title: "Title", text: "Body", kind: "news", imageUrl: "", video: "", date: "2026-11-20T10:00:00.000Z", pinned: false, ...over });

describe("DispatchCard", () => {
  it("shows kind, date, title and text as plain text (no markup is interpreted)", () => {
    const { container } = render(<DispatchCard d={d({ title: "<b>Hi</b>" })} />);
    expect(screen.getByText("News")).toBeTruthy();
    expect(screen.getByText("20 Nov 2026")).toBeTruthy();
    expect(screen.getByRole("heading").textContent).toBe("<b>Hi</b>");
    expect(container.querySelector("h3 b")).toBeNull();
  });
  it("uses a still frame for a Cloudinary video with no picture, and nothing for neither", () => {
    const a = render(<DispatchCard d={d({ video: "https://res.cloudinary.com/demo/video/upload/v1/clip.mp4" })} />);
    expect(a.container.querySelector("img")?.getAttribute("src")).toContain("so_0,f_jpg");
    const b = render(<DispatchCard d={d({})} />);
    expect(b.container.querySelector("img")).toBeNull();
  });
});

describe("DispatchList", () => {
  const items = [d({ id: "1", title: "A", kind: "news" }), d({ id: "2", title: "B", kind: "win" })];
  it("filters by kind and can show all again", () => {
    render(<DispatchList items={items} />);
    expect(screen.getAllByRole("heading")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Win" }));
    expect(screen.getAllByRole("heading").map((h) => h.textContent)).toEqual(["B"]);
    fireEvent.click(screen.getByRole("button", { name: "All" }));
    expect(screen.getAllByRole("heading")).toHaveLength(2);
  });
  it("hides the filter when there is only one kind", () => {
    render(<DispatchList items={[d({})]} />);
    expect(screen.queryByRole("button", { name: "All" })).toBeNull();
  });
});
