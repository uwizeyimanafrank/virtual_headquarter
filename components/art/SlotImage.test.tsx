import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { SlotPicture, SlotImage } from "@/components/art/SlotImage";
import { resolveSlots } from "@/lib/image-slots";

const getSlot = vi.fn();
vi.mock("@/lib/slots", () => ({ getSlot: (k: string) => getSlot(k) }));

const CLOUD = "https://res.cloudinary.com/demo/image/upload/v1/vhq/hero.jpg";
const slots = (o: Parameters<typeof resolveSlots>[0] = []) => resolveSlots(o);
const img = (c: HTMLElement) => c.querySelector("img") as HTMLImageElement;

describe("SlotPicture", () => {
  it("shows the default picture without responsive sizes", () => {
    const { container } = render(<SlotPicture slot={slots()["home.hero.bg"]} />);
    expect(img(container).getAttribute("src")).toBe("/art/defaults/wide.svg");
    expect(img(container).getAttribute("srcset")).toBeNull();
  });
  it("shows the owner's Cloudinary picture with sizes and a blurred placeholder", () => {
    const { container } = render(<SlotPicture slot={slots([{ key: "home.hero.bg", url: CLOUD }])["home.hero.bg"]} sizes="50vw" />);
    const i = img(container);
    expect(i.getAttribute("src")).toContain("f_auto,q_auto,w_1200");
    expect(i.getAttribute("srcset")?.match(/ \d+w/g)).toEqual([" 480w", " 800w", " 1200w", " 1600w", " 2000w"]);
    expect(i.getAttribute("sizes")).toBe("50vw");
    expect((container.firstChild as HTMLElement).style.backgroundImage).toContain("w_24");
  });
  it("keeps the focal point and the slot's shape (no layout shift)", () => {
    const { container } = render(<SlotPicture slot={slots([{ key: "home.hero.character", url: CLOUD, focal: { x: 20, y: 70 } }])["home.hero.character"]} />);
    expect(img(container).style.objectPosition).toBe("20% 70%");
    expect(parseFloat((container.firstChild as HTMLElement).style.aspectRatio)).toBeCloseTo(0.8); // 4:5
    expect(img(container).getAttribute("width")).toBeTruthy();
  });
  it("hides decorative pictures from screen readers and labels the others", () => {
    const r = slots([{ key: "home.profile.photo", url: CLOUD, alt: "Frank at his desk" }]);
    const deco = render(<SlotPicture slot={r["home.hero.bg"]} />).container;
    expect(img(deco).getAttribute("alt")).toBe("");
    expect(img(deco).getAttribute("aria-hidden")).toBe("true");
    const photo = render(<SlotPicture slot={r["home.profile.photo"]} />).container;
    expect(img(photo).getAttribute("alt")).toBe("Frank at his desk");
    expect(img(photo).getAttribute("aria-hidden")).toBeNull();
  });
  it("loads lazily by default and first when it is the top picture", () => {
    const s = slots()["home.hero.bg"];
    expect(img(render(<SlotPicture slot={s} />).container).getAttribute("loading")).toBe("lazy");
    const top = img(render(<SlotPicture slot={s} priority />).container);
    expect(top.getAttribute("loading")).toBe("eager");
    expect(top.getAttribute("fetchpriority")).toBe("high");
  });
  it("marks itself with the slot key, and fill mode covers its parent", () => {
    const s = slots()["museum.backdrop"];
    const a = render(<SlotPicture slot={s} />).container.firstChild as HTMLElement;
    expect(a.getAttribute("data-slot")).toBe("museum.backdrop");
    const b = render(<SlotPicture slot={s} mode="fill" />).container.firstChild as HTMLElement;
    expect(b.className).toContain("absolute inset-0");
    expect(b.style.aspectRatio).toBe("");
  });
});

describe("SlotImage (server)", () => {
  it("looks the slot up and renders it", async () => {
    getSlot.mockResolvedValueOnce(slots()["gallery.backdrop"]);
    const { container } = render(await SlotImage({ slot: "gallery.backdrop" }));
    expect(container.querySelector('[data-slot="gallery.backdrop"]')).not.toBeNull();
  });
  it("shows nothing for an unknown key instead of crashing", async () => {
    getSlot.mockResolvedValueOnce(undefined);
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await SlotImage({ slot: "nope.nothing" })).toBeNull();
    expect(err).toHaveBeenCalled();
    err.mockRestore();
  });
});
