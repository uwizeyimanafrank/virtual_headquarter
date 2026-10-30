import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HomeTabs } from "@/components/home/HomeTabs";

const setup = () => render(<HomeTabs hero={<p>HERO CONTENT</p>} cv={<p>CV CONTENT</p>} />);

describe("HomeTabs", () => {
  it("starts on the Welcome view and hides the CV", () => {
    setup();
    expect(screen.getByRole("tab", { name: "Welcome" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("HERO CONTENT")).toBeVisible();
    expect(screen.getByText("CV CONTENT")).not.toBeVisible();
  });

  it("switches to the Canvas CV when its tab is clicked", async () => {
    setup();
    await userEvent.click(screen.getByRole("tab", { name: "Canvas CV" }));
    expect(screen.getByRole("tab", { name: "Canvas CV" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("CV CONTENT")).toBeVisible();
    expect(screen.getByText("HERO CONTENT")).not.toBeVisible();
  });

  it("only the active tab is reachable with Tab (roving tabindex)", () => {
    setup();
    expect(screen.getByRole("tab", { name: "Welcome" })).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("tab", { name: "Canvas CV" })).toHaveAttribute("tabindex", "-1");
  });

  it("arrow keys, End and Home move between tabs and move focus", async () => {
    setup();
    screen.getByRole("tab", { name: "Welcome" }).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Canvas CV" })).toHaveFocus();
    expect(screen.getByText("CV CONTENT")).toBeVisible();
    await userEvent.keyboard("{ArrowRight}"); // wraps around
    expect(screen.getByRole("tab", { name: "Welcome" })).toHaveFocus();
    await userEvent.keyboard("{End}");
    expect(screen.getByRole("tab", { name: "Canvas CV" })).toHaveAttribute("aria-selected", "true");
    await userEvent.keyboard("{Home}");
    expect(screen.getByRole("tab", { name: "Welcome" })).toHaveAttribute("aria-selected", "true");
  });

  it("links each tab to its panel for screen readers", () => {
    setup();
    const tab = screen.getByRole("tab", { name: "Canvas CV" });
    const panel = document.getElementById(tab.getAttribute("aria-controls") ?? "");
    expect(panel).toHaveAttribute("role", "tabpanel");
    expect(panel).toHaveAttribute("aria-labelledby", tab.id);
  });
});
