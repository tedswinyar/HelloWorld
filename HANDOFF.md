# HANDOFF — HelloWorld / Maze Runner

**Resume this session:**

```
cd /Users/swinyted/Code/HelloWorld
claude --resume cc3f4f65-4551-4eee-94c0-59a31df499a3
```

Transcript is 2.5 MB. **If context is the constraint, start fresh instead** — everything
needed is in this file plus `CLAUDE.md` and `docs/decisions/`. There is no beads tracker in
this project.

**Last updated:** 2026-10-15 · **Push path since 2026-10-15:** this repo is on the personal
build-server relay model. `git push mbp master` goes to the relay, which forwards it to GitHub as
`staging`; `.github/workflows/ci.yml` runs on the relay's self-hosted runner (label `HelloWorld`)
and fast-forwards `master` on green. `origin`'s push URL is disabled. Nothing below about pushing
from a build checkout or about Code Defender applies any more; it is kept as history.

**State at 2026-09-21** · the work is done, green, and **PUSHED to
GitHub on 2026-09-21** (master `6c4f54e` + tag `baseline-2025-kiro`, verified by `ls-remote`).
The push went from the personal MBP's build checkout, per Ted's 2026-09-15 decision that pushes
to his personal public repos go through the MBP rather than a Code Defender request (this
supersedes the 2026-09-05 "build + staging only" call below). The corporate Mac still cannot
reach GitHub, so `origin/master` here was aligned by hand with `git update-ref` after the push.
Any later commit here (including this HANDOFF edit) is again one `git push mbp master` plus one
push from the MBP away from GitHub.

**Specter card:** `8df7b4cb-cfc3-4460-800d-3057f583ba74` — *if you change what is committed,
pushed, or merged in this repo, UPDATE THAT CARD.* It asserts this repo's state and cannot
detect being wrong.

---

## Deliverables in flight

| What | State |
| --- | --- |
| Core rebuild | **Merged to `master`** — `4333032` (merge commit, `--no-ff`), `ccb350e` (the work) |
| `modernise-2026` branch | Merged and pushed; safe to delete locally (`git branch -d modernise-2026`) |
| `baseline-2025-kiro` tag | **Pushed** 2026-09-21 (`ab14a4e`) |
| Working tree | Clean |
| Push to GitHub | **DONE** 2026-09-21 from the MBP; the Code Defender request (2026-09-03) is moot |
| Build + staging server on the personal MBP | **Working** — green, one manual step left; see below |

Verified at handoff time: `npm run check` exits 0 (typecheck + lint + 115 unit tests), 14
Playwright tests pass, `npm run build` emits 24.66 kB (8.86 kB gzipped).

## Blocked: the push

Code Defender refuses pushes to this repo as an **unapproved public repository**. This is the
external-repository allowlist, *not* a secret-scanning finding — nothing in the diff trips a
scanner.

```
Blocking: Code Defender detected a push to an unapproved public repository.
  refs/heads/master → https://github.com/tedswinyar/HelloWorld.git (origin)
```

`git-defender request-repo --reason 3` (personal project) was submitted 2026-09-03 and is
awaiting **Alex's** approval. Requests are visible at https://codedefender.aws.dev/rules.

**Submitting the request does not unblock the push** — verified by retrying immediately after
submission and getting the identical block. The manager has to approve it.

Note: this repo pushed fine on 2025-09-08, so an approval more likely lapsed than never
existed.

## Build + staging server: the personal MBP (10.0.0.68)

Set up 2026-09-05. `ssh swinte@10.0.0.68` works on an existing key, no password.
The corporate Mac cannot reach GitHub, so this box is where a build can be proven and
played, and eventually where the push goes from.

**It has no `git-defender`**, so pushes from it are not gated. That is deliberately
*not* being used to route around the pending approval — Ted's call, 2026-09-05. The
box is build + staging only until Alex approves.

| Path on the MBP | What it is |
| --- | --- |
| `~/repos/HelloWorld.git` | Bare repo. Fed by `git push mbp master` from the corporate Mac (remote `mbp` = `ssh://swinte@10.0.0.68/Users/swinte/repos/HelloWorld.git`). Holds `master` + the `baseline-2025-kiro` tag. |
| `~/build/HelloWorld` | Build checkout. `origin` → the bare repo, `github` → `git@github-helloworld:tedswinyar/HelloWorld.git`. |
| `~/build/build-helloworld.sh` | One command: sync, `npm ci`, `npm run check`, `npm run build`, restart staging. `--e2e` adds Playwright. |
| `~/build/staging.log` | Staging server output. |

Verified 2026-09-05: 115 unit tests pass, **14/14** Playwright pass, build is
**byte-identical** to the corporate Mac (24.66 kB / 8.86 kB gzipped), and
`http://10.0.0.68:4173/` is reachable across the LAN.

Gotchas that will bite a future session:

- **Homebrew is not on the PATH of a non-interactive ssh session** on that box. `node`,
  `npm`, `git` 2.55 and `brew` all live in `/opt/homebrew/bin` but a scripted
  `ssh swinte@... 'npm ...'` gets `MISSING`. Export the PATH explicitly; the build
  script already does.
- **`gh` is not installed** there, and there is no Homebrew `gh` either.
- Node is **v26.5.0**, npm **11.17.0** — newer than the corporate Mac. Nothing broke,
  but `npm ci` warns that `fsevents` install scripts are unapproved (harmless; it is
  only the watch-mode file watcher).
- Identity on that box is deliberately **`8061019+tedswinyar@users.noreply.github.com`**
  (GitHub-masked `ted.swinyar@gmail.com`), *never* `swinyted@amazon.com`. Standing rule:
  anything pushed from the MBP uses the personal identity.
- A **self-hosted GitHub Actions runner** (`~/actions-runner`, agent name `mbp`) is
  registered to `tedswinyar/distributed-backups`. Unrelated to this repo; its token
  cannot push.
- **Use `ssh -n` for any `ssh` run *inside* a script piped to `ssh swinte@... bash -s`.**
  Without it the inner `ssh` reads the rest of the script off stdin and silently discards
  it: the remaining commands never run and emit nothing, so a truncated run is
  indistinguishable from a quiet success. This bit once already while verifying the
  deploy key.
- The staging server is a plain `nohup`'d `vite preview`. It survives the ssh session
  ending but **not a reboot** — there is no launchd job and nothing keeps it alive.
  Re-run the build script to bring it back. Nothing rebuilds on push either; the script
  is manual by design (a `post-receive` hook was considered and not installed).

### Latent e2e flake, found on that box

`e2e/game.spec.ts:121` — *"draws something other than an empty canvas"* — failed once,
on the very first cold run, with `distinctColours` 1 instead of >3. It then passed 3/3
in isolation and 14/14 on three consecutive full runs, including via the build script.

Not a defect of the MBP. `open()` (line 68) only waits for `window.__mazeRunner` to be
defined, which happens at module init — *before* the first `requestAnimationFrame`
paints. Every other test reads game state through that probe and so needs no frame; this
one calls `getImageData`, so on a cold, contended machine it samples the cleared canvas
and wins the race. The fix is to wait for a painted frame before sampling rather than to
relax the threshold. **Not done — deliberately left as a decision for Ted.**

## What's owed, in order

1. ~~Register the deploy key on GitHub.~~ **Done 2026-09-05** — titled *"Deploy from Ted's
   MBP"*, write access enabled, verified read-only from the box (`ssh -T` returns
   `Hi tedswinyar/HelloWorld!`, and `ls-remote`/`fetch` both succeed). The MBP can push
   this one repo and nothing else. Re-check with:
   ```bash
   ssh -n swinte@10.0.0.68 'export PATH=/opt/homebrew/bin:$PATH; git -C ~/build/HelloWorld ls-remote github | head -3'
   ```
   As of that date GitHub `master` is `ab14a4e` (the 2025 baseline) and carries **no tags**;
   the three rebuild commits and `baseline-2025-kiro` exist only locally and on the MBP.
2. **Wait for Alex's approval** (email notification) before anything reaches GitHub.
   The MBP *could* push right now — that is the point of not doing so.
3. Then push both refs — the tag is not optional, the README links to it:
   ```bash
   cd /Users/swinyted/Code/HelloWorld
   git push origin master && git push origin baseline-2025-kiro
   ```
   Or, once the deploy key is registered, from the MBP instead:
   ```bash
   ssh swinte@10.0.0.68 '~/build/build-helloworld.sh --e2e && \
     export PATH=/opt/homebrew/bin:$PATH && cd ~/build/HelloWorld && \
     git push github master && git push github baseline-2025-kiro'
   ```
4. Verify it actually landed rather than assuming: `git log --oneline @{upstream}..HEAD`
   should print nothing, and `git ls-remote --tags origin` should list the tag.
5. Optional cleanup: `git branch -d modernise-2026`.
6. Optional: fix the cold-start e2e flake described above.

## Open decisions awaiting Ted

- **Repo identity.** Still named `HelloWorld`, still described on GitHub as "First GitHub test
  project", but it has been a maze game since Aug 2025. `gh repo edit --description ...` for
  the blurb; the rename is a settings toggle. Flagged, deliberately not done — outward-facing.
- **Multiplayer.** Unstarted. Ted chose "polish single-player, then decide from a solid base";
  that base now exists. The 2025 spec's AWS design (API Gateway WS + Lambda + DynamoDB + SQS +
  CloudWatch Events, the last two purely to broadcast a mode change) was judged too heavy for a
  hobby game and should be redesigned rather than inherited. The genre-breaking modes are
  client-side and need no backend at all.

## Environment state — will be stale on resume

Do **not** trust these on a resumed session; re-derive them.

- **Two dev servers were running** from the original session and die with it:
  `npm run dev` on :8080 (the rebuild) and `npx http-server client -p 8090` in the worktree
  (the 2025 baseline). Restart as needed.
- **A comparison worktree exists at `/private/tmp/maze-2025`** (detached at `ab14a4e`), with
  `node_modules` installed. It is the 2025 baseline for side-by-side play. Remove with
  `git worktree remove --force /tmp/maze-2025`. `/tmp` may have been cleared by a reboot, in
  which case run `git worktree prune`.
- **Vite's preview/dev server binds to `localhost`, not `127.0.0.1`** on this machine — the
  IPv4 loopback literal is never answered. `playwright.config.ts` depends on this.
- **`CI=true` is set in Ted's interactive shell**, which silently makes Playwright use the
  GitHub reporter, enable 2 retries, and refuse to reuse an existing server. Pass
  `--reporter=list` for readable local output.
- Playwright's browser is installed; a fresh machine needs `npm run e2e:install`.

## Stale-fact warning

A resumed session will believe things that may have expired:

- **Whether the push is still blocked.** Alex may have approved it in the meantime. Check by
  attempting the push, not by re-reading this file.
- **The commit shas above** (`4333032`, `ccb350e`) — correct at handoff, but any later work
  moves `master`.
- **"2 commits unpushed"** — a predicate, not a count. Verify with
  `git log --oneline @{upstream}..HEAD`.
- **Midway credentials** expire on a ~20h clock, and `git-defender` needs them. If the push
  fails oddly rather than with the allowlist message, run `mwinit` first.

## What is deliberately not built

Multiplayer, the six genre-breaking modes, audio, and deployment wiring. All stated honestly
in `README.md` and `.kiro/specs/maze-runner-game/tasks.md` — do not "discover" them as gaps.

## Why the core was rebuilt

Short version: the 2025 build had 301 tests and was unplayable, because none of them played
the game. Long version in `docs/decisions/0001-tile-based-movement.md` and
`docs/decisions/0002-verify-by-playing.md`. Read those before concluding that any constraint
in `CLAUDE.md` is over-engineering.
