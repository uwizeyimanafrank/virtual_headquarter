// @vitest-environment node
import { describe, expect, it } from "vitest";
import { findProblems, scanProject } from "../scripts/check-images.mjs";

describe("check:images", () => {
  it("the public side of this project is clean", () => {
    expect(scanProject()).toEqual([]);
  });
  it("catches a hardcoded bundled picture, picture file name, and Cloudinary address", () => {
    expect(findProblems('<img src="/art/hero.svg" alt="" />')).toHaveLength(1);
    expect(findProblems("const bg = '/samples/profile.svg';")).toHaveLength(1);
    expect(findProblems('background: url("photo.jpg")')).toHaveLength(1);
    expect(findProblems("const a = `banner.PNG`;")).toHaveLength(1);
    expect(findProblems('const u = "https://res.cloudinary.com/demo/x";')).toHaveLength(1);
  });
  it("names the file and line", () => {
    expect(findProblems("ok\n\nconst x = '/art/a.svg';", "components/home/Hero.tsx")[0]).toMatch(/^components\/home\/Hero\.tsx:3 /);
  });
  it("leaves comments, normal code, slot keys and opted-out lines alone", () => {
    for (const ok of ["// the picture is /art/hero.svg", " * see /samples/x.png", '<SlotImage slot="home.hero.bg" />', "const key = 'home.hero.bg';", "import x from './a.module.css';", "const n = a.png.length;", 'const u = "/art/x.svg"; // check:images-ignore (demo)']) {
      expect(findProblems(ok), ok).toEqual([]);
    }
  });
});
