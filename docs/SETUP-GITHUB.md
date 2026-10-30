# GitHub setup (once)

1. Create a **private** repo (name it for example `vhq`). Do not add a README yet.
2. On your PC:
   ```
   git init
   git branch -M main
   git remote add origin <repo address>
   ```
   Copy the contents of this book folder into the repo root, then:
   ```
   git add -A
   git commit -m "Add VHQ book"
   git push -u origin main
   git checkout -b dev
   git push -u origin dev
   ```
3. Daily routine: `git checkout dev && git pull` to see what the AI pushed. Test locally. When happy, merge `dev` into `main`.

## Giving an AI temporary push access (optional)
Use a **fine-grained personal access token**, never a classic one:
- Resource: **only this one repository**.
- Permissions: **Contents: Read and write**. Nothing else (no admin, no workflows, no secrets).
- Expiry: **7 days or less**.
- Tell the AI to push **only to `dev`**.
- When the session ends, **delete the token** in GitHub settings. Make a new one next time.
- If you can, protect `main` (branch protection) so nothing can push to it directly. Whether this is available on private repos depends on your GitHub plan.
- Remember: anything you paste into a chat stays in that chat's history. Keep the token narrow and short-lived so a leak is harmless.
- Never commit `.env`. The repo should never contain real secrets.

## Safer alternative with no token
The AI gives you the files (or a zip). You copy them in, run `npm run build`, commit and push yourself. Slower, but it teaches you git and risks nothing.
