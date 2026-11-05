import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Shell } from "@/components/office/Shell";

vi.mock("next/navigation", () => ({ usePathname: () => "/secret-slug-123" }));
vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => <a href={href} {...rest}>{children}</a> }));
vi.mock("@/components/office/AutoLock", () => ({ AutoLock: () => null }));
vi.mock("@/components/office/TwinAvatar", () => ({ TwinAvatar: () => null }));

describe("Shell down-service banner", () => {
  it("shows nothing when everything is fine", () => {
    render(<Shell base="/secret-slug-123" email="me@x.co">page</Shell>);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
  it("names the service that is down and links to the Developer tab", () => {
    render(<Shell base="/secret-slug-123" email="me@x.co" downServices={[{ id: "1", name: "Client API" }]}>page</Shell>);
    const banner = screen.getByRole("status");
    expect(banner).toHaveTextContent("A service is down: Client API");
    expect(screen.getByRole("link", { name: "Open the Developer tab" })).toHaveAttribute("href", "/secret-slug-123/developer");
  });
  it("counts several, and shows names as plain text (never HTML)", () => {
    const { container } = render(<Shell base="/secret-slug-123" email="me@x.co" downServices={[{ id: "1", name: "<img src=x onerror=alert(1)>" }, { id: "2", name: "B" }]}>page</Shell>);
    expect(screen.getByRole("status")).toHaveTextContent("2 services are down");
    expect(screen.getByRole("status")).toHaveTextContent("<img src=x onerror=alert(1)>");
    expect(container.querySelector("img")).toBeNull();
  });
});
