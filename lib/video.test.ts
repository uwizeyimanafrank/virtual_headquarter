import { describe, expect, it } from "vitest";
import { isDataSaver, posterUrl } from "@/lib/video";

describe("posterUrl", () => {
  it("turns a Cloudinary video address into a small still picture", () => {
    expect(posterUrl("https://res.cloudinary.com/demo/video/upload/v123/clip.mp4")).toBe("https://res.cloudinary.com/demo/video/upload/so_0,f_jpg,q_auto,w_1000/v123/clip.jpg");
    expect(posterUrl("https://res.cloudinary.com/demo/video/upload/clip.webm?x=1", 500)).toBe("https://res.cloudinary.com/demo/video/upload/so_0,f_jpg,q_auto,w_500/clip.jpg?x=1");
  });
  it("gives null for anything that is not a Cloudinary video", () => {
    for (const u of ["", "https://youtube.com/watch?v=1", "https://res.cloudinary.com/demo/image/upload/a.jpg", "/samples/x.mp4"]) expect(posterUrl(u)).toBeNull();
  });
});

describe("isDataSaver", () => {
  it("is true for Save-Data and for slow connections", () => {
    expect(isDataSaver({ saveData: true })).toBe(true);
    expect(isDataSaver({ effectiveType: "2g" })).toBe(true);
    expect(isDataSaver({ effectiveType: "slow-2g" })).toBe(true);
  });
  it("is false for normal or unknown connections", () => {
    expect(isDataSaver({ effectiveType: "4g" })).toBe(false);
    expect(isDataSaver({})).toBe(false);
    expect(isDataSaver(undefined)).toBe(false);
  });
});
