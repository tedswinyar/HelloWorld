# HANDOFF — HelloWorld / Maze Runner

**Resume this session:**

```
cd /Users/swinyted/Code/HelloWorld
claude --resume cc3f4f65-4551-4eee-94c0-59a31df499a3
```

Transcript is 2.5 MB. **If context is the constraint, start fresh instead** — everything
needed is in this file plus `CLAUDE.md` and `docs/decisions/`. There is no beads tracker in
this project.

**Last updated:** 2026-09-03 · **Read this first:** the work is done and green; the only
thing outstanding is a push that corporate policy is blocking.

**Specter card:** `8df7b4cb-cfc3-4460-800d-3057f583ba74` — *if you change what is committed,
pushed, or merged in this repo, UPDATE THAT CARD.* It asserts this repo's state and cannot
detect being wrong.

---

## Deliverables in flight

| What | State |
| --- | --- |
| Core rebuild | **Merged to `master`** — `4333032` (merge commit, `--no-ff`), `ccb350e` (the work) |
| `modernise-2026` branch | Merged; still exists locally, safe to delete once pushed |
| `baseline-2025-kiro` tag | Local only — **the README points readers at it, so it must be pushed too** |
| Working tree | Clean |
| Push to GitHub | **BLOCKED** — see below |

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

## What's owed, in order

1. **Wait for Alex's approval** (email notification). Nothing else can proceed.
2. Then push both refs — the tag is not optional, the README links to it:
   ```bash
   cd /Users/swinyted/Code/HelloWorld
   git push origin master && git push origin baseline-2025-kiro
   ```
3. Verify it actually landed rather than assuming: `git log --oneline @{upstream}..HEAD`
   should print nothing, and `git ls-remote --tags origin` should list the tag.
4. Optional cleanup: `git branch -d modernise-2026`.

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
