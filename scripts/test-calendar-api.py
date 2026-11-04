"""Exercise name-only profile editing against a disposable local D1 database."""
import datetime
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
legacy_name = "Legacy test " + uuid.uuid4().hex[:10]
legacy_id = str(uuid.uuid4())


def databases():
    return glob.glob(".wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite")


def request(method="GET", data=None, origin=BASE):
    # Every call is an independent client: no cookies, browser storage or token.
    req = urllib.request.Request(BASE + "/api/responses", method=method,
                                 headers={"Origin": origin, "Content-Type": "application/json"},
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
        "Origin": PERSONAL_ORIGIN, "Access-Control-Request-Method": "PUT",
        "Access-Control-Request-Headers": "content-type",
    })
    with urllib.request.urlopen(preflight, timeout=15) as response:
        assert response.status == 204
        assert response.headers["Access-Control-Allow-Origin"] == PERSONAL_ORIGIN
        assert "PUT" in response.headers["Access-Control-Allow-Methods"]
    shared_read = urllib.request.Request(BASE + "/api/responses", headers={"Origin": GITHUB_ORIGIN})
    with urllib.request.urlopen(shared_read, timeout=15) as response:
        assert response.headers["Access-Control-Allow-Origin"] == GITHUB_ORIGIN
        assert response.headers["Cache-Control"] == "no-store"
    status, initial = request()
    assert status == 200 and isinstance(initial["responses"], list)
    assert all("token" not in r and "edit_token_hash" not in r for r in initial["responses"])
    status, _ = request("POST", {"name": name, "days": ["2026-11-14"]})
    assert status == 400, "Out-of-season dates must be rejected"
    status, _ = request("POST", {"name": name, "days": ["2026-11-26"]}, origin="https://example.com")
    assert status == 403, "Unapproved-origin writes must be rejected"
    status, created = request("POST", {"name": name, "days": ["2026-12-25", "2026-11-16", "2026-11-15", "2026-11-22", "2026-11-26", "2026-11-26"]}, origin=PERSONAL_ORIGIN)
    assert status == 201, created.get("error")
    created_id = created["response"]["id"]
    assert created["response"]["days"] == ["2026-11-15", "2026-11-16", "2026-11-22", "2026-11-26", "2026-12-25"]
    assert "token" not in created, "The shared poll must not issue unnecessary private credentials"
    status, duplicate = request("POST", {"name": "  " + name.upper() + "  ", "days": []})
    assert status == 409, "Duplicate names must lead to the existing profile instead of overwriting it"

    # A new browser finds the existing profile by name and edits without a token.
    status, shared = request(origin=GITHUB_ORIGIN)
    mine = next(r for r in shared["responses"] if r["name"] == name)
    update = {"id": mine["id"], "name": name, "days": [], "revision": mine["revision"]}
    status, _ = request("PUT", update, origin="https://example.com")
    assert status == 403
    status, updated = request("PUT", update, origin=GITHUB_ORIGIN)
    assert status == 200 and updated["response"]["revision"] == 2
    assert updated["response"]["days"] == []
    status, _ = request("PUT", update)
    assert status == 409, "Stale edits must not overwrite newer changes"
    status, shared = request()
    mine = next(r for r in shared["responses"] if r["id"] == created_id)
    assert mine["days"] == [] and mine["revision"] == 2, "Empty profiles must remain selectable for future edits"
    assert "token" not in mine and "edit_token_hash" not in mine
    restore = {"id": mine["id"], "name": name, "days": [(datetime.date(2026, 11, 15) + datetime.timedelta(days=i)).isoformat() for i in range(57)], "revision": mine["revision"]}
    status, restored = request("PUT", restore, origin=PERSONAL_ORIGIN)
    assert status == 200 and restored["response"]["revision"] == 3
    assert len(restored["response"]["days"]) == 57
    assert restored["response"]["days"][0] == "2026-11-15"
    assert restored["response"]["days"][-1] == "2027-01-10"

    # Existing production-style rows keep their old token hash but need no
    # credential reset or database migration to join the name-only poll.
    inserted = 0
    for file in databases():
        with sqlite3.connect(file, timeout=10) as db:
            if db.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='responses'").fetchone():
                db.execute("INSERT INTO responses (id,name,name_key,edit_token_hash,days,revision,updated_at) VALUES (?,?,?,?,?,?,?)",
                           (legacy_id, legacy_name, legacy_name.lower(), "a" * 64, '["2026-12-25"]', 7, "2026-11-04T00:00:00Z"))
                db.commit()
                inserted += 1
    assert inserted == 1, "Expected one disposable local calendar database"
    status, shared = request()
    legacy = next(r for r in shared["responses"] if r["name"] == legacy_name)
    status, changed = request("PUT", {"id": legacy["id"], "name": legacy_name, "days": ["2027-01-01"], "revision": legacy["revision"]}, origin=PERSONAL_ORIGIN)
    assert status == 200 and changed["response"]["revision"] == 8
    status, _ = request("PUT", {"id": legacy_id, "name": name, "days": [], "revision": 8})
    assert status == 409, "Renaming must not collide with another profile"
    status, _ = request("PUT", {"id": str(uuid.uuid4()), "name": name, "days": [], "revision": 1})
    assert status == 404
    print("PASS: fresh-browser name-only editing, legacy-profile compatibility, clear/restore, CORS, origin rejection, dates, duplicate profiles, missing profiles, revision conflicts, credential exclusion.")
finally:
    for file in databases():
        with sqlite3.connect(file, timeout=10) as db:
            if db.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='responses'").fetchone():
                db.execute("DELETE FROM responses WHERE name IN (?, ?)", (name, legacy_name))
                db.commit()
    print("Local test profiles cleaned up.")
