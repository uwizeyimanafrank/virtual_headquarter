# Image slots: every picture on the site can be changed from the Office

**Rule:** no fixed picture on any public page is written into code. Every place that shows a picture is a named **slot**. A slot has a built-in default (our own art or a gradient) and the owner can replace it from the Office. The public site never needs a code change to change a picture.

**Slots vs content images**
- A **slot** is a fixed place on a page (hero background, hero character, page backdrop, share image...). Listed below. Managed in **Office > Images**.
- A **content image** belongs to an item the owner creates (a Museum item, a dispatch, a gallery photo, a mood card). Edited inside that item. Office > Images also has a search that shows where any picture is used.

## What the owner sees (Office > Images)
- Grouped by page and section, each row shows: a thumbnail, the label ("Home: hero character"), **where it appears** in plain words ("Home, top, right side"), the recommended shape and size, and its status (default or custom).
- Actions: **Replace** (upload a file, **paste an image link**, or choose from the library), **Adjust focus** (click the important point so crops keep it), **Alt text, credit and license**, **Reset to default**, **Show on page** (opens the page with that slot outlined, owner only).
- Nothing is required: with no custom picture, the default shows and the page looks finished.

## Using pictures from the internet
- **Paste an image link** imports the picture: the server downloads it (https only, image types only, size limit, private addresses refused with the same protection as the Developer tab), stores it in Cloudinary, and remembers the **source link, credit and license note**.
- **We never hotlink** (show a picture straight from another site): it breaks when they move it, slows pages, can leak visitors' data, and may break the license.
- Safe free sources (check each picture's license before use): Unsplash, Pexels, Pixabay. Do **not** use random Google Images results.
- Faces: public-site defaults are faceless. If the owner uses a real photo of someone, it must be his own or have permission.

## Data and code (what to build)
- `lib/image-slots.ts`: the **registry**. For each slot: `key`, `label`, `page`, `section`, `where` (plain words), `aspect` (e.g. 16:9), `minWidth`, `defaultSrc` (a file in `public/art` or `public/samples`), `decorative` (true = no alt text needed).
- `models/ImageSlot.ts`: one document per customised slot: `key` (unique), `publicId` and `url` (Cloudinary), `alt`, `focal {x,y}`, `credit`, `license`, `sourceUrl`, `kind` (`upload` | `import` | `library`), `updatedAt`.
- `lib/slots.ts`: `getSlots()` (database overrides merged over registry defaults, cached; with no database it returns the defaults) and `getSlot(key)`.
- `components/art/SlotImage.tsx`: `<SlotImage slot="home.hero.character" />` renders the current image with responsive sizes, blurred placeholder, focal point crop and the right alt text.
- `npm run check:images` (added to `prebuild`): fails if a public component uses a fixed image path (`/art/...`, `/samples/...`, an image URL) outside the registry. Like `check:urls`.

## The slots (add new ones here AND in `lib/image-slots.ts`)
| Key | Page > place | Shape | Default |
|---|---|---|---|
| `home.hero.bg` | Home > hero background | 16:9 wide | dark gradient scene |
| `home.hero.character` | Home > hero, one side, half in shadow | 4:5 tall | steepled-fingers silhouette |
| `home.profile.photo` | Home > profile, Canvas CV | 1:1 | silhouette avatar |
| `home.journey.bg` | Home > journey timeline backdrop | 16:9 | hooded figure at night desk |
| `home.hire.band` | Home > hire band | 21:9 wide | suited handshake silhouettes |
| `home.avatar.portrait` | Home > avatar teaser | 1:1 | avatar silhouette |
| `museum.backdrop` | Museum > header | 16:9 | hooded figure at the shore |
| `museum.hall.tour` | Museum > door "Story Tour" | 4:3 | corridor art |
| `museum.hall.cases` | Museum > door "Glass Cases" | 4:3 | glass cases art |
| `gallery.backdrop` | Gallery > header | 16:9 | night sky |
| `dispatches.backdrop` | Dispatches > header | 16:9 | storm cloud scene |
| `hire.backdrop` | Hire > header | 16:9 | city at dusk |
| `hire.handshake` | Hire > main art | 3:2 | suited handshake silhouettes |
| `connect.backdrop` | Connect > header | 16:9 | rooftop at night |
| `avatar.figure` | Floating avatar button and panel | 1:1 | avatar silhouette |
| `site.og.default` | Share preview (WhatsApp, X, LinkedIn) | 1.91:1 (1200x630) | generated card |
| `site.og.home` / `site.og.museum` / `site.og.hire` | Share preview per page | 1.91:1 | falls back to `site.og.default` |
| `site.favicon` | Browser tab icon | 1:1 | VHQ mark |
| `site.notfound` | 404 page | 4:3 | lost hooded figure |

Files (not pictures) follow the same idea: `home.cv.pdf` (the CV download), set in Office > Images > Files.

## Done means
Every slot above is in the registry, rendered through `SlotImage`, listed in Office > Images with its location text, replaceable by upload, link or library, resettable, and covered by a test. `npm run check:images` passes.
