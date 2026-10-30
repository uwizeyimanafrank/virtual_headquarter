import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, act } from "@testing-library/react";
import { Gate } from "@/components/home/Gate";
import { mockMedia } from "@/tests/media-query";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, prefetch: vi.fn() }) }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => <a href={href} {...rest}>{children}</a>,
}));

// jsdom cannot navigate, so we stop real link clicks, but first we RECORD whether the component
// itself cancelled the browser's normal link behaviour (that is what avoids a full page reload).
let componentPreventedDefault = false;
const recordAndStop = (e: Event) => { componentPreventedDefault = e.defaultPrevented; e.preventDefault(); };

beforeEach(() => {
  push.mockClear();
  vi.useFakeTimers();
  componentPreventedDefault = false;
  document.addEventListener("click", recordAndStop);
});
afterEach(() => {
  document.removeEventListener("click", recordAndStop);
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const link = () => screen.getByRole("link", { name: /Continue to the Museum/ });

describe("Gate", () => {
  it("shows the invitation and points at the Museum", () => {
    mockMedia({});
    render(<Gate />);
    expect(screen.getByText(/The foundation is laid/)).toBeInTheDocument();
    expect(link()).toHaveAttribute("href", "/museum");
  });

  it("fades out first, then moves to the Museum without a page reload", () => {
    mockMedia({});
    render(<Gate />);
    fireEvent.click(link());
    expect(componentPreventedDefault).toBe(true); // no browser navigation = no full reload
    expect(screen.getByTestId("curtain")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(600); });
    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith("/museum");
  });

  it("ignores a second click while leaving", () => {
    mockMedia({});
    render(<Gate />);
    fireEvent.click(link());
    fireEvent.click(link());
    act(() => { vi.advanceTimersByTime(600); });
    expect(push).toHaveBeenCalledTimes(1);
  });

  it("with reduced motion it does not play the fade (normal link behaviour)", () => {
    mockMedia({ "prefers-reduced-motion": true });
    render(<Gate />);
    fireEvent.click(link());
    expect(componentPreventedDefault).toBe(false); // the normal link is left to do its job
    expect(screen.queryByTestId("curtain")).not.toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(600); });
    expect(push).not.toHaveBeenCalled();
  });

  it("ctrl-click (open in new tab) is left alone", () => {
    mockMedia({});
    render(<Gate />);
    fireEvent.click(link(), { ctrlKey: true });
    expect(componentPreventedDefault).toBe(false);
    expect(screen.queryByTestId("curtain")).not.toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("does not navigate after the component is removed", () => {
    mockMedia({});
    const { unmount } = render(<Gate />);
    fireEvent.click(link());
    unmount();
    act(() => { vi.advanceTimersByTime(600); });
    expect(push).not.toHaveBeenCalled();
  });
});
