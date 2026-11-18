import { afterEach, describe, expect, it } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { CaseVideo } from "@/components/museum/CaseVideo";

const SRC = "https://res.cloudinary.com/demo/video/upload/v1/clip.mp4";
afterEach(() => { Object.defineProperty(navigator, "connection", { value: undefined, configurable: true }); });

describe("CaseVideo", () => {
  it("loads nothing before Play: no video element, only a still picture", () => {
    const { container } = render(<CaseVideo src={SRC} title="Demo" />);
    expect(container.querySelector("video")).toBeNull();
    expect(container.querySelector("img")!.getAttribute("src")).toContain("so_0,f_jpg");
  });
  it("Play starts it with controls", () => {
    const { container } = render(<CaseVideo src={SRC} title="Demo" />);
    fireEvent.click(screen.getByRole("button", { name: "Play video: Demo" }));
    const v = container.querySelector("video")!;
    expect(v.getAttribute("src")).toBe(SRC);
    expect(v.hasAttribute("controls")).toBe(true);
  });
  it("says so when data saver is on, and still waits for Play", async () => {
    Object.defineProperty(navigator, "connection", { value: { saveData: true }, configurable: true });
    const { container } = render(<CaseVideo src={SRC} title="Demo" />);
    await act(async () => {});
    expect(screen.getByText(/Data saver is on/)).toBeTruthy();
    expect(container.querySelector("video")).toBeNull();
  });
  it("shows a plain play button when the address has no poster", () => {
    const { container } = render(<CaseVideo src="https://example.org/a.mp4" title="Demo" />);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByRole("button", { name: "Play video: Demo" })).toBeTruthy();
  });
});
