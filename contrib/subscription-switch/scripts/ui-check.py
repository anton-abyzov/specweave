#!/usr/bin/env python3
"""Headless UI contract checks; intercepted fixtures never sign in or start runs.

Run with Playwright installed, or: uv run --with playwright python3 <this file>.
SWITCH_URL defaults to http://127.0.0.1:8318; SWITCH_EVIDENCE_DIR selects artifacts.
"""
import copy
import functools
import json
import os
from pathlib import Path
import socket
import tempfile
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

os.environ["PWDEBUG"] = "0"
os.environ["PLAYWRIGHT_HTML_OPEN"] = "never"

from playwright.sync_api import sync_playwright

PUBLIC = Path(__file__).resolve().parents[1] / "public"
URL = os.environ.get("SWITCH_URL", "http://127.0.0.1:8318").rstrip("/")
parsed = urlparse(URL)
if parsed.scheme != "http" or parsed.hostname not in {"127.0.0.1", "localhost", "::1"}:
    raise SystemExit("SWITCH_URL must be a loopback HTTP URL.")
EVIDENCE = Path(os.environ.get("SWITCH_EVIDENCE_DIR", str(Path(tempfile.gettempdir()) / "specweave-switch-ui")))
EVIDENCE.mkdir(parents=True, exist_ok=True)

fixture = {
    "accounts": [
        {"id": f"{provider}-{i}", "provider": provider, "label": f"{provider.title()} {i}",
         "authenticated": i == 1, "status": "ready" if i == 1 else "auth-required",
         "quota": {"window": None, "weekly": None, "observedAt": None, "source": None}}
        for provider, count in [("codex", 4), ("claude", 3)] for i in range(1, count + 1)
    ],
    "policy": {"mode": "balanced", "preferredProvider": None, "selectedAccount": None},
    "hosts": [
        {"id": "m4", "label": "M4 Max", "role": "main", "hostname": "Antons-MacBook-M4MAX.local", "status": "local", "sshReachable": None, "installed": True},
        {"id": "m1", "label": "M1 Max", "role": "worker", "hostname": "Antons-MacBook-Pro-M1MAX-2.local", "status": "auth-required", "sshReachable": True, "installed": False},
        {"id": "m3", "label": "M3 / Olympus", "role": "worker", "hostname": "Antons-MacBook-Pro.local", "status": "offline", "sshReachable": False, "installed": None},
    ],
    "services": [{"id": "t3", "label": "T3 Code stable", "port": 3773, "status": "running"}, {"id": "proxy", "label": "CLIProxyAPI", "port": 8317, "status": "unavailable"}],
    "runs": [],
    "recommendations": [{"provider": "codex", "id": "codex-1", "reason": "Signed in; capacity has not been observed."}, {"provider": "claude", "id": None, "reason": "Weekly quota is exhausted."}],
}
fixture["accounts"][0]["quota"] = {"window": {"usedPercent": 25, "resetsAt": 1791403200}, "weekly": {"usedPercent": 76, "resetsAt": 1791496800}, "observedAt": "2026-10-07T04:00:00Z", "source": "native-app-server"}
fixture["accounts"][4]["status"] = "exhausted"
fixture["accounts"][4]["quota"] = {"window": None, "weekly": {"usedPercent": 100, "resetsAt": 1791511200}, "observedAt": "2026-10-07T04:00:00Z", "source": "native-cli"}


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def ensure_server():
    port = parsed.port or 80
    try:
        with socket.create_connection((parsed.hostname, port), timeout=1):
            return None
    except OSError:
        server = ThreadingHTTPServer((parsed.hostname, port), functools.partial(QuietHandler, directory=str(PUBLIC)))
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        return server


def assert_no_overflow(page):
    assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth"), "Horizontal page overflow"
    assert page.evaluate("""() => [...document.querySelectorAll('button')].every(b => {
      const r = b.getBoundingClientRect(); return r.width === 0 || (r.left >= 0 && r.right <= innerWidth + 1);
    })"""), "Control outside viewport"


server = ensure_server()
receipt = {"headless": True, "fixture": True, "url": URL, "checks": [], "screenshots": []}
try:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        try:
            for name, width, theme in [("desktop-light", 1440, "light"), ("desktop-dark", 1440, "dark"), ("phone-light", 390, "light"), ("phone-dark", 390, "dark")]:
                current = copy.deepcopy(fixture)
                requests = []
                context = browser.new_context(viewport={"width": width, "height": 1000}, color_scheme=theme)
                page = context.new_page()
                errors = []
                page.on("pageerror", lambda error: errors.append(str(error)))

                def route_request(route):
                    request = route.request
                    path = urlparse(request.url).path
                    if path.startswith("/api/"):
                        if request.method == "POST":
                            body = request.post_data_json
                            requests.append({"path": path, "body": body})
                            if path == "/api/policy":
                                current["policy"]["mode"] = body["mode"]
                            elif path == "/api/select":
                                current["policy"]["selectedAccount"] = body["id"]
                        route.fulfill(status=200, content_type="application/json", body=json.dumps(current))
                        return
                    # Always verify this checkout's UI, including when a backend already occupies the port.
                    file = PUBLIC / ({"/": "index.html", "/app.js": "app.js", "/styles.css": "styles.css"}.get(path, "missing"))
                    if file.is_file():
                        mime = "text/html" if file.suffix == ".html" else "text/css" if file.suffix == ".css" else "text/javascript"
                        route.fulfill(status=200, content_type=mime, body=file.read_bytes())
                    else:
                        route.fulfill(status=404, body="Not found")

                page.route("**/*", route_request)
                page.goto(URL, wait_until="networkidle")
                page.get_by_text("2 signed in / 7 slots", exact=True).wait_for()
                assert page.locator(".account-card").count() == 7
                assert page.locator('[data-account-id="codex-2"]').get_by_text("Unknown", exact=True).count() == 2
                assert page.locator('[data-account-id="claude-1"]').get_by_text("0%", exact=True).count() == 1
                assert page.locator('[data-select="claude-1"]').is_disabled()
                assert page.locator('[data-select="codex-2"]').is_disabled()
                assert "EDT" in page.locator('[data-account-id="codex-1"]').inner_text()
                assert "No managed runs recorded" in page.locator("#run-list").inner_text()
                assert_no_overflow(page)
                screenshot = EVIDENCE / f"{name}.png"
                page.screenshot(path=str(screenshot), full_page=True)
                receipt["screenshots"].append(str(screenshot))
                expected_theme = "light" if theme == "dark" else "dark"
                page.get_by_role("button", name=f"Use {expected_theme} theme", exact=True).click()
                assert page.locator("html").get_attribute("data-theme") == expected_theme
                page.get_by_role("button", name=f"Use {theme} theme", exact=True).click()
                page.locator('[data-mode="reset-first"]').click()
                page.locator('[data-mode="reset-first"][aria-pressed="true"]').wait_for()
                page.locator('[data-mode="spend-first"]').click()
                page.locator('[data-mode="spend-first"][aria-pressed="true"]').wait_for()
                page.locator('[data-mode="balanced"]').click()
                page.locator('[data-mode="balanced"][aria-pressed="true"]').wait_for()
                page.locator('[data-select="codex-1"]').click()
                page.locator('[data-select="codex-1"][aria-pressed="true"]').wait_for()
                page.get_by_role("button", name="Refresh accounts", exact=True).click()
                page.get_by_text("Native account observations refreshed. Unavailable usage remains unknown.", exact=True).wait_for()
                assert any(r["path"] == "/api/refresh" and r["body"] == {} for r in requests)
                assert any(r["path"] == "/api/select" and r["body"] == {"id": "codex-1"} for r in requests)
                assert {r["body"]["mode"] for r in requests if r["path"] == "/api/policy"} == {"balanced", "reset-first", "spend-first"}
                assert_no_overflow(page)
                assert not errors, errors
                assert page.get_by_role("link", name="Accounts", exact=True).count() == 1
                # Untrusted state strings must stay text, including narrow layouts and RTL labels.
                attack = '<img src=x onerror="window.__xss=1">' + "AccountWithAnExceptionallyLongUnbrokenName" * 4 + " حساب تجريبي"
                current["accounts"][0]["label"] = attack
                current["recommendations"][0]["reason"] = '<script>window.__xss=1</script>'
                page.get_by_role("button", name="Refresh accounts", exact=True).click()
                page.get_by_text(attack, exact=True).first.wait_for()
                assert page.locator(".account-card img, .account-card script, #recommendations script").count() == 0
                assert page.evaluate("window.__xss") is None
                assert_no_overflow(page)
                # Failed and quota-limited runs never look successful.
                current["runs"] = [{"id": "fixture-quota", "accountId": "claude-1", "provider": "claude", "status": "quota-exhausted", "cwd": "/fixture/workspace", "startedAt": "2026-10-07T04:00:00Z", "endedAt": "2026-10-07T04:01:00Z", "exitCode": 1, "model": None}]
                page.get_by_role("button", name="Refresh accounts", exact=True).click()
                page.get_by_text("1 recorded", exact=True).wait_for()
                assert "Quota exhausted" in page.locator("#run-list").inner_text()
                assert "Succeeded" not in page.locator("#run-list").inner_text()
                assert_no_overflow(page)
                # Match publicState's actual newest-first, 30-receipt payload.
                current["runs"] = [{"id": f"receipt-{i:02d}", "accountId": "codex-1", "provider": "codex", "status": "failed", "cwd": "/fixture/workspace", "startedAt": "2026-10-07T04:00:00Z", "endedAt": "2026-10-07T04:01:00Z", "exitCode": 1, "model": None} for i in range(30, 0, -1)]
                page.get_by_role("button", name="Refresh accounts", exact=True).click()
                page.get_by_text("30 recorded", exact=True).wait_for()
                assert page.locator(".run-row").count() == 20
                assert "receipt-30" in page.locator(".run-row").first.inner_text()
                assert "receipt-11" in page.locator(".run-row").last.inner_text()
                assert "receipt-10" not in page.locator("#run-list").inner_text()
                assert_no_overflow(page)
                # Error responses are visible and do not optimistically alter the saved policy.
                page.route("**/api/policy", lambda route: route.fulfill(status=409, content_type="application/json", body=json.dumps({"error": "Fixture policy rejected"})))
                page.locator('[data-mode="spend-first"]').click()
                page.get_by_text("Fixture policy rejected", exact=True).wait_for()
                assert page.locator('[data-mode="balanced"]').get_attribute("aria-pressed") == "true"
                assert not errors, errors
                receipt["checks"].append({"viewport": name, "overflow": False, "policy_refresh_selection": "passed", "unknown_exhausted": "passed", "xss_long_rtl": "passed", "failed_run": "passed", "newest_receipts_first": "passed", "api_error": "passed"})
                context.close()
        finally:
            browser.close()
    (EVIDENCE / "ui-check.json").write_text(json.dumps(receipt, indent=2) + "\n")
    print(json.dumps(receipt, indent=2))
finally:
    if server:
        server.shutdown()
        server.server_close()
