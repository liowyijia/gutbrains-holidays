"""Exercise the local prototype's public/owner boundaries and persistence.

Run with the dev server on loopback. Test responses are removed from local D1
in finally; no credentials or test responses are written to files or logs.
"""
import glob
import json
import os
import sqlite3
import urllib.error
import urllib.parse
import urllib.request
import uuid

BASE = os.environ.get("CALENDAR_TEST_URL", "http://127.0.0.1:8787")
GITHUB_ORIGIN = "https://liowyijia.github.io"
PERSONAL_ORIGIN = "https://yijialiow.com"
assert urllib.parse.urlparse(BASE).hostname in {"localhost", "127.0.0.1"}
name = "Prototype test " + uuid.uuid4().hex[:10]
created_id = None


def request(method="GET", data=None, token=None, origin=BASE):
    headers = {"Origin": origin, "Content-Type": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    req = urllib.request.Request(BASE + "/api/responses", method=method,
                                 headers=headers,
                                 data=None if data is None else json.dumps(data).encode())
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            payload = response.read()
            return response.status, json.loads(payload) if payload else {}
    except urllib.error.HTTPError as error:
        payload = error.read().decode()
        try:
            return error.code, json.loads(payload)
        except json.JSONDecodeError:
            return error.code, {"error": payload}


try:
    preflight = urllib.request.Request(BASE + "/api/responses", method="OPTIONS", headers={
        "Origin": PERSONAL_ORIGIN,
        "Access-Control-Request-Method": "PUT",
        "Access-Control-Request-Headers": "content-type,authorization",
    })
    with urllib.request.urlopen(preflight, timeout=15) as response:
        assert response.status == 204
        assert response.headers["Access-Control-Allow-Origin"] == PERSONAL_ORIGIN
        assert "authorization" in response.headers["Access-Control-Allow-Headers"].lower()
        assert "PUT" in response.headers["Access-Control-Allow-Methods"]
    shared_read = urllib.request.Request(BASE + "/api/responses", headers={"Origin": GITHUB_ORIGIN})
    with urllib.request.urlopen(shared_read, timeout=15) as response:
        assert response.headers["Access-Control-Allow-Origin"] == GITHUB_ORIGIN
        assert response.headers["Cache-Control"] == "no-store"
    status, initial = request()
    assert status == 200 and isinstance(initial["responses"], list)
    assert all("token" not in r and "edit_token_hash" not in r for r in initial["responses"])
    status, _ = request("POST", {"name": name, "days": ["2026-11-22"]})
    assert status == 400, "Out-of-season dates must be rejected"
    status, _ = request("POST", {"name": name, "days": ["2026-11-26"]}, origin="https://example.com")
    assert status == 403, "Cross-origin writes must be rejected"
    status, created = request("POST", {"name": name, "days": ["2026-12-25", "2026-11-26", "2026-11-26"]}, origin=PERSONAL_ORIGIN)
    assert status == 201, created.get("error")
    created_id = created["response"]["id"]
    token = created["token"]
    assert created["response"]["days"] == ["2026-11-26", "2026-12-25"]
    assert len(token) == 64
    status, duplicate = request("POST", {"name": "  " + name.upper() + "  ", "days": []})
    assert status == 409, "Normalized duplicate names must not overwrite schedules"
    update = {"id": created_id, "name": name, "days": [], "revision": 1}
    status, _ = request("PUT", update)
    assert status == 403, "Names alone must not authorize updates"
    status, _ = request("PUT", update, token="0" * 64)
    assert status == 403, "Invalid tokens must not authorize updates"
    status, updated = request("PUT", update, token=token, origin=GITHUB_ORIGIN)
    assert status == 200 and updated["response"]["revision"] == 2
    assert updated["response"]["days"] == [], "Zero-day schedules must be accepted"
    status, _ = request("PUT", update, token=token)
    assert status == 409, "Stale edits must not overwrite newer changes"
    status, shared = request()
    mine = next(r for r in shared["responses"] if r["id"] == created_id)
    assert mine["days"] == [] and mine["revision"] == 2
    assert "token" not in mine and "edit_token_hash" not in mine
    # A member can return with the same edit identity after clearing all dates,
    # including from the other allowed browser origin, and add dates again.
    restore = {"id": created_id, "name": name, "days": ["2027-01-04"], "revision": mine["revision"]}
    status, restored = request("PUT", restore, token=token, origin=PERSONAL_ORIGIN)
    assert status == 200 and restored["response"]["revision"] == 3
    status, shared = request()
    mine = next(r for r in shared["responses"] if r["id"] == created_id)
    assert mine["days"] == ["2027-01-04"], "Clearing dates must preserve later edit access"
    print("PASS: GitHub CORS/preflight, creation, shared persistence, clear-and-restore editing, date validation, duplicate names, origin checks, private edits, stale-edit protection, token privacy.")
finally:
    for file in glob.glob(".wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite"):
        with sqlite3.connect(file, timeout=10) as db:
            if db.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='responses'").fetchone():
                db.execute("DELETE FROM responses WHERE name = ?", (name,))
                db.commit()
    print("Local test data cleaned up.")
