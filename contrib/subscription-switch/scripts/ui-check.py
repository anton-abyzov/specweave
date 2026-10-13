#!/usr/bin/env python3
"""Headless UI checks for the fleet dashboard. Fixture data only: nothing signs in or runs.

Run with Playwright installed, or: uv run --with playwright python3 <this file>.
Serves public/ from a private loopback port. SWITCH_EVIDENCE_DIR selects where
screenshots go. SWITCH_CHROMIUM picks a Chromium binary. Set SWITCH_URL to also screenshot a live dashboard read-only.
"""
import functools
import json
import os
import tempfile
import threading
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

os.environ["PWDEBUG"] = "0"
os.environ["PLAYWRIGHT_HTML_OPEN"] = "never"

from playwright.sync_api import sync_playwright

PUBLIC = Path(__file__).resolve().parents[1] / "public"
EVIDENCE = Path(os.environ.get("SWITCH_EVIDENCE_DIR", str(Path(tempfile.gettempdir()) / "specweave-switch-ui")))
EVIDENCE.mkdir(parents=True, exist_ok=True)
LIVE = os.environ.get("SWITCH_URL", "").rstrip("/")
if LIVE and (urlparse(LIVE).scheme != "http" or urlparse(LIVE).hostname not in {"127.0.0.1", "localhost"}):
    raise SystemExit("SWITCH_URL must be a loopback HTTP URL.")

now = time.time()
iso = lambda t: time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(t))


def account(id, **extra):
    provider, n = id.split("-")
    base = {"id": id, "provider": provider, "label": f"{provider.title()} {n}", "authenticated": False, "authKind": None,
            "authError": None, "subscriptionType": None, "status": "auth-required",
            "quota": {"window": None, "weekly": None, "observedAt": None, "expiresAt": None, "source": None}}
    base.update(extra)
    return base


def quota(five, week, five_in=3600, week_in=4 * 86400):
    return {"window": None if five is None else {"usedPercent": five, "resetsAt": int(now + five_in)},
            "weekly": {"usedPercent": week, "resetsAt": int(now + week_in)},
            "observedAt": iso(now - 120), "expiresAt": iso(now + 780), "source": "native-app-server"}


def state(accounts, mode="balanced", selected=None, next_id=None, proxy="running"):
    ids = {a["id"] for a in accounts}
    full = accounts + [account(f"{p}-{i}") for p, c in (("codex", 4), ("claude", 3)) for i in range(1, c + 1) if f"{p}-{i}" not in ids]
    return {"accounts": full, "policy": {"mode": mode, "preferredProvider": None, "selectedAccount": selected},
            "hosts": [], "runs": [],
            "services": [{"id": "cli-proxy", "label": "CLIProxyAPI", "port": 8317, "status": proxy, **({"accounts": 0} if proxy == "running" else {})}],
            "recommendations": [{"provider": "any", "id": next_id, "reason": "fixture"}]}


FLEET = {"checkedAt": iso(now), "autoRefreshMinutes": 10, "hosts": [
    {"id": "local", "label": "M4 Max", "local": True, "ok": True, "refreshing": False, "state": state([
        account("codex-1", authenticated=True, authKind="chatgpt", subscriptionType="pro", status="exhausted", sharedWith=["M1 Max"], identity="2bbf7efd5896ea8b",
                quota={**quota(None, 100, week_in=2 * 86400), "credits": {"hasCredits": True, "unlimited": False, "balance": "46483.3029020000"},
                       "resetCredits": {"availableCount": 1, "nextExpiresAt": iso(now + 25 * 86400)}}),
        account("claude-1", authenticated=True, authKind="claude.ai", subscriptionType="max", status="ready",
                quota={**quota(41, 32), "extraUsage": {"used": 12.5, "limit": 50, "currency": "USD", "limitReached": False},
                       "windows": [{"label": "Fable", "usedPercent": 7, "resetsAt": int(now + 5 * 86400), "appliesToSelection": False}]}),
    ], mode="reset-first", next_id="claude-1")},
    {"id": "m1", "label": "M1 Max", "local": False, "ok": True, "state": state([
        account("codex-1", authenticated=True, authKind="chatgpt", status="ready", quota=quota(12, 4)),
        account("codex-2", authenticated=True, authKind="chatgpt", status="ready", quota=quota(85, 88)),
        account("codex-3", authenticated=True, authKind="chatgpt", subscriptionType="pro", status="exhausted", sharedWith=["M4 Max"], identity="2bbf7efd5896ea8b",
                quota=quota(None, 100, week_in=2 * 86400)),
        account("claude-1", authenticated=None, authKind="oauth_token", authError="subscription-auth-unverified", status="unknown"),
    ], mode="reset-first", selected="codex-2", proxy="unavailable")},
    {"id": "m3", "label": "M3", "local": False, "ok": False, "error": "Tunnel not connected"},
], "providers": [
    {"id": "copilot:abycrash", "provider": "copilot", "login": "abycrash", "plan": "business", "org": "Crash-Champions", "host": "M4 Max",
     "meter": {"name": "AI credits", "used": 1000, "entitlement": 175000, "overagePermitted": True}, "resetsAt": iso(now + 19 * 86400),
     "observedAt": iso(now - 3 * 3600), "source": "copilot-cli-cache", "cliActive": True},
    {"id": "copilot:anton-abyzov", "provider": "copilot", "login": "anton-abyzov", "plan": "individual", "org": None, "host": "M4 Max",
     "meter": {"name": "Chat credits", "used": 1.8, "entitlement": 200, "overagePermitted": False}, "resetsAt": iso(now + 19 * 86400),
     "observedAt": iso(now - 60), "source": "live", "cliActive": False},
]}


def serve_public():
    handler = functools.partial(type("Quiet", (SimpleHTTPRequestHandler,), {"log_message": lambda *a: None}), directory=str(PUBLIC))
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server


def check(page, width, scheme):
    cards = page.locator("#groups .card")
    assert cards.count() == 7, f"expected 7 subscription cards, got {cards.count()}"
    groups = page.inner_text("#groups")
    for needle in ("Claude Max", "59%", "Limit reached", "Plan not verified", "Pinned", "Next", "Signed in on", "back in", "46,483 credits", "1 reset banked", "$12.50 of $50.00 extra this month", "Fable", "93%"):
        assert needle in groups, f"missing {needle!r} at {width}px {scheme}"
    summary = page.inner_text("#summary")
    for needle in ("1 of 2", "2 of 3", "Next reset", "174,000"):
        assert needle in summary, f"missing {needle!r} in summary at {width}px {scheme}"
    macs = page.inner_text("#macs")
    for needle in ("M4 Max", "this Mac", "M1 Max", "Tunnel not connected"):
        assert needle in macs, f"missing {needle!r} in Macs at {width}px {scheme}"
    assert page.locator('[data-mode="reset-first"][aria-pressed="true"]').count() == 1
    copilot = page.inner_text('#groups [data-provider="copilot"]')
    for needle in ("abycrash · Crash-Champions", "174,000 of 175,000 AI credits left", "198.2 of 200 chats left", "Copilot CLI uses this", "Live", "As of 3h"):
        assert needle in copilot, f"missing {needle!r} in Copilot at {width}px {scheme}"
    assert "T3" not in page.inner_text("body"), f"T3 label still shown at {width}px {scheme}"
    overflow = page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
    assert overflow <= 0, f"horizontal overflow {overflow}px at {width}px"


def main():
    server = serve_public()
    base = f"http://127.0.0.1:{server.server_address[1]}"
    posted = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, executable_path=os.environ.get("SWITCH_CHROMIUM") or None)
        for width, height in ((1280, 820), (390, 844)):
            for scheme in ("light", "dark"):
                page = browser.new_page(viewport={"width": width, "height": height}, color_scheme=scheme)
                page.route("**/api/fleet", lambda route: route.fulfill(json=FLEET))
                def on_post(route):
                    posted.append((route.request.url.rsplit("/api/", 1)[1], json.loads(route.request.post_data or "{}")))
                    route.fulfill(json={**FLEET, "failures": []})
                page.route("**/api/fleet/*", on_post)
                started = time.monotonic()
                page.goto(base + "/")
                page.wait_for_selector(".card")
                elapsed = time.monotonic() - started
                assert elapsed < 2, f"first render took {elapsed:.2f}s"
                check(page, width, scheme)
                page.screenshot(path=str(EVIDENCE / f"switch-{width}-{scheme}.png"), full_page=True)
                if width == 1280 and scheme == "light":
                    page.click('[data-mode="spend-first"]')
                    page.wait_for_selector("#notice:not([hidden])")
                    page.click('[data-account="m1/codex-2"]')
                    page.wait_for_timeout(200)
                page.close()
        if LIVE:
            page = browser.new_page(viewport={"width": 1280, "height": 820})
            page.goto(LIVE + "/")
            page.wait_for_selector(".card", timeout=10000)
            page.screenshot(path=str(EVIDENCE / "switch-live.png"), full_page=True)
            page.close()
        browser.close()
    server.shutdown()
    assert posted == [("fleet/policy", {"mode": "spend-first"}), ("fleet/select", {"host": "m1", "id": None})], posted
    print(json.dumps({"ok": True, "evidence": str(EVIDENCE)}))


if __name__ == "__main__":
    main()
