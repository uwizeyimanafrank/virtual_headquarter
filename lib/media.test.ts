import { describe, expect, it } from "vitest";
import { thumb } from "@/lib/media";

describe("thumb", () => {
  it("asks Cloudinary for a smaller, optimised image", () => {
    expect(thumb("https://res.cloudinary.com/demo/image/upload/v1/me.jpg", 160)).toBe("https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_160,c_limit/v1/me.jpg");
  });
  it("leaves bundled sample images and other addresses alone", () => {
    expect(thumb("/samples/profile.svg", 160)).toBe("/samples/profile.svg");
    expect(thumb("https://other.example/image/upload/x.jpg", 160)).toBe("https://other.example/image/upload/x.jpg");
  });
});
