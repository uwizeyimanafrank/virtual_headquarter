import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HireForm } from "@/components/hire/HireForm";
import { HireHero } from "@/components/hire/HireHero";
import { Faq, HireFeatured, Services, Steps } from "@/components/hire/HireSections";
import { api, ApiError } from "@/lib/api";
import { HIRE_DEFAULTS } from "@/lib/hire";
import type { HirePage } from "@/lib/hire-public";
import type { HomeItem } from "@/lib/home";

vi.mock("@/lib/api", async (orig) => ({ ...(await orig<typeof import("@/lib/api")>()), api: vi.fn() }));
const mockApi = vi.mocked(api);
beforeEach(() => mockApi.mockReset());

const page = (over: Partial<HirePage> = {}): HirePage => ({ content: HIRE_DEFAULTS, badge: { tone: "open", label: "Open to new work" }, name: "Frank", cvUrl: "", items: [], demo: false, ...over });

describe("HireHero", () => {
  it("shows the headline, the availability badge and the request button", () => {
    render(<HireHero page={page()} />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(HIRE_DEFAULTS.headline);
    expect(screen.getByRole("status").textContent).toBe("Open to new work");
    expect(screen.getByRole("link", { name: "Send a request" }).getAttribute("href")).toBe("#request");
  });
  it("shows the CV button only when there is a CV, and opens it safely", () => {
    const a = render(<HireHero page={page()} />);
    expect(screen.queryByRole("link", { name: /CV/ })).toBeNull();
    a.unmount();
    render(<HireHero page={page({ cvUrl: "https://res.cloudinary.com/demo/raw/upload/cv.pdf" })} />);
    const cv = screen.getByRole("link", { name: "Download my CV" });
    expect(cv.getAttribute("href")).toContain("cv.pdf");
    expect(cv.getAttribute("rel")).toContain("noopener");
  });
  it("shows the note under the badge, and a busy badge", () => {
    render(<HireHero page={page({ badge: { tone: "busy", label: "Fully booked right now" }, content: { ...HIRE_DEFAULTS, availability: { status: "busy", from: "", note: "Back in January" } } })} />);
    expect(screen.getByText("Back in January")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe("Fully booked right now");
  });
});

describe("sections", () => {
  it("services as cards, steps numbered 1 to 3", () => {
    render(<><Services items={HIRE_DEFAULTS.services} /><Steps items={HIRE_DEFAULTS.steps} /></>);
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(HIRE_DEFAULTS.services.length + 3);
    expect(screen.getByText("Step 1")).toBeTruthy(); expect(screen.getByText("Step 3")).toBeTruthy();
  });
  it("FAQ uses native open/close and hides when empty", () => {
    const { container, rerender } = render(<Faq items={HIRE_DEFAULTS.faq} />);
    expect(container.querySelectorAll("details")).toHaveLength(HIRE_DEFAULTS.faq.length);
    expect(container.querySelectorAll("summary")).toHaveLength(HIRE_DEFAULTS.faq.length);
    rerender(<Faq items={[]} />);
    expect(container.firstChild).toBeNull();
  });
  const item = (n: number, over: Partial<HomeItem> = {}): HomeItem => ({ id: `i${n}`, type: "project", title: `Project ${n}`, date: `2026-0${n}`, description: "", mediaUrl: "", skills: ["React"], link: "https://example.org", featured: true, problem: "P", whatIDid: "A", result: `Result ${n}`, ...over } as HomeItem);
  it("featured work shows at most 3 complete featured projects, and nothing otherwise", () => {
    const { container, rerender } = render(<HireFeatured items={[item(1), item(2), item(3), item(4)]} />);
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(3);
    rerender(<HireFeatured items={[item(1, { featured: false }), item(2, { result: "" })]} />);
    expect(container.firstChild).toBeNull();
  });
  it("external links open safely", () => {
    render(<HireFeatured items={[item(1)]} />);
    expect(screen.getByRole("link", { name: /View live/ }).getAttribute("rel")).toContain("noopener");
  });
});

describe("HireForm", () => {
  async function fillRequired() {
    await userEvent.type(screen.getByLabelText(/Your name/), "Ada");
    await userEvent.type(screen.getByLabelText(/^Email/), "ada@example.com");
    await userEvent.type(screen.getByLabelText(/What do you need/), "We need a booking site by March.");
  }
  const send = () => userEvent.click(screen.getByRole("button", { name: /Send request|Sending/ }));

  it("has labelled fields, three kinds of work and an invisible bot trap", () => {
    render(<HireForm />);
    for (const l of [/Your name/, /^Email/, /Company or organisation/, /Budget range/, /Timeline/, /What do you need/, /Links/]) expect(screen.getByLabelText(l)).toBeTruthy();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    const trap = document.getElementById("h-website") as HTMLInputElement;
    expect(trap.tabIndex).toBe(-1);
    expect(trap.closest("[aria-hidden='true']")).not.toBeNull();
  });
  it("sends everything, with links tidied, then thanks the visitor and clears the form", async () => {
    mockApi.mockResolvedValue({ ok: true });
    render(<HireForm />);
    await fillRequired();
    await userEvent.click(screen.getByLabelText("A full-time role"));
    await userEvent.type(screen.getByLabelText(/Company/), "Acme");
    await userEvent.type(screen.getByLabelText(/Links/), "acme.com{enter}https://github.com/acme/x");
    await send();
    await waitFor(() => expect(screen.getByRole("status").textContent).toMatch(/Request received/));
    const [path, init] = mockApi.mock.calls[0];
    expect(path).toBe("/api/hire");
    expect(JSON.parse(String((init as RequestInit).body))).toMatchObject({ name: "Ada", email: "ada@example.com", company: "Acme", kind: "full-time", message: "We need a booking site by March.", links: ["https://acme.com", "https://github.com/acme/x"], website: "" });
    await userEvent.click(screen.getByRole("button", { name: "Send another" }));
    expect((screen.getByLabelText(/Your name/) as HTMLInputElement).value).toBe("");
  });
  it("a bot that fills the trap still sends it (the server decides)", async () => {
    mockApi.mockResolvedValue({ ok: true });
    render(<HireForm />);
    await fillRequired();
    fireEvent.change(document.getElementById("h-website") as HTMLInputElement, { target: { value: "http://spam" } });
    await send();
    await waitFor(() => expect(mockApi).toHaveBeenCalled());
    expect(JSON.parse(String((mockApi.mock.calls[0][1] as RequestInit).body)).website).toBe("http://spam");
  });
  it("shows a friendly message, never the server's words, and keeps what was typed", async () => {
    mockApi.mockRejectedValueOnce(new ApiError(500, "SECRET INTERNAL TEXT"));
    render(<HireForm />);
    await fillRequired();
    await send();
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).not.toContain("SECRET");
    expect(alert.textContent).toMatch(/could not be sent/);
    expect((screen.getByLabelText(/Your name/) as HTMLInputElement).value).toBe("Ada");
  });
  it("says so for too many requests (429) and for bad details (400)", async () => {
    mockApi.mockRejectedValueOnce(new ApiError(429, "x"));
    render(<HireForm />);
    await fillRequired();
    await send();
    expect((await screen.findByRole("alert")).textContent).toMatch(/few requests already/);
    mockApi.mockRejectedValueOnce(new ApiError(400, "x"));
    await send();
    await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/does not look right/));
  });
  it("cannot be sent twice at once", async () => {
    let release: (v: unknown) => void = () => {};
    mockApi.mockImplementationOnce(() => new Promise((resolve) => { release = resolve; }));
    render(<HireForm />);
    await fillRequired();
    const form = document.querySelector("form") as HTMLFormElement;
    fireEvent.submit(form);
    fireEvent.submit(form); // a second submit while the first is still travelling
    expect(mockApi).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Sending..." })).toHaveProperty("disabled", true);
    release({ ok: true });
    expect(await screen.findByText("Request received")).toBeTruthy();
    expect(mockApi).toHaveBeenCalledTimes(1);
  });
});
