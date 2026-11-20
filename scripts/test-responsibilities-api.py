"""Run only against a disposable local calendar database."""
import json
import os
import urllib.error
import urllib.parse
import urllib.request
import uuid
import time

BASE = os.environ.get("CALENDAR_TEST_URL", "http://127.0.0.1:8787")
assert urllib.parse.urlparse(BASE).hostname in {"localhost", "127.0.0.1"}
ORIGIN = "https://yijialiow.com"

def request(path, method="GET", data=None, origin=ORIGIN):
    time.sleep(0.1)  # Let the local Worker finish the preceding request.
    req = urllib.request.Request(BASE + path, method=method, headers={"Origin": origin, "Content-Type": "application/json"}, data=None if data is None else json.dumps(data).encode())
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            payload = response.read()
            assert response.headers.get("Access-Control-Allow-Origin") == ORIGIN
            return response.status, json.loads(payload) if payload else {}
    except urllib.error.HTTPError as error:
        payload = error.read().decode()
        try:
            return error.code, json.loads(payload)
        except json.JSONDecodeError:
            return error.code, {"error": payload}

urllib.request.install_opener(urllib.request.build_opener(urllib.request.ProxyHandler({})))
status, initial = request("/api/responses")
assert status == 200
status, created = request("/api/responses", "POST", {"name": "Responsibility QA " + uuid.uuid4().hex[:8], "days": ["2026-12-25"]})
assert status == 201
person = created["response"]
task = {"profileId": person["id"], "title": "Animal checks", "startDate": "2026-12-24", "endDate": "2026-12-26", "notes": "Daily at 09:00\nRoom 2"}
preflight = urllib.request.Request(BASE + "/api/responsibilities", method="OPTIONS", headers={"Origin": ORIGIN, "Access-Control-Request-Method": "DELETE", "Access-Control-Request-Headers": "content-type"})
with urllib.request.urlopen(preflight) as response:
    assert response.status == 204 and "DELETE" in response.headers["Access-Control-Allow-Methods"]
for patch in [{"startDate": "2026-12-27"}, {"endDate": "2027-01-11"}, {"startDate": "2026-11-14"}, {"title": " "}, {"title": "x" * 121}, {"notes": "x" * 1001}, {"endDate": "2026-12-32"}]:
    assert request("/api/responsibilities", "POST", {**task, **patch})[0] == 400
assert request("/api/responsibilities", "POST", {**task, "profileId": str(uuid.uuid4())})[0] == 404
assert request("/api/responsibilities", "POST", task, origin="https://example.com")[0] == 403
status, created = request("/api/responsibilities", "POST", task)
assert status == 201, created
item = created["responsibility"]
assert item["revision"] == 1 and item["notes"] == task["notes"]
status, shared = request("/api/responsibilities")
assert status == 200 and item in shared["responsibilities"]
changed = {**task, "id": item["id"], "revision": 1, "title": "Single-day checks", "startDate": "2026-12-25", "endDate": "2026-12-25"}
assert request("/api/responsibilities", "PUT", {**changed, "profileId": str(uuid.uuid4())})[0] == 404
status, updated = request("/api/responsibilities", "PUT", changed)
assert status == 200 and updated["responsibility"]["revision"] == 2
assert request("/api/responsibilities", "PUT", changed)[0] == 409
assert request("/api/responsibilities", "DELETE", {"id": item["id"], "profileId": person["id"], "revision": 1})[0] == 409
assert request("/api/responsibilities", "DELETE", {"id": item["id"], "profileId": person["id"], "revision": 2}, origin="https://example.com")[0] == 403
status, shared_profiles = request("/api/responses")
assert next(p for p in shared_profiles["responses"] if p["id"] == person["id"]) == person, "Tasks must not change days away or profile revisions"
# Renaming a profile preserves its responsibilities through the stable profile ID.
assert request("/api/responses", "PUT", {**person, "name": person["name"] + " renamed"})[0] == 200
status, shared = request("/api/responsibilities")
assert next(row for row in shared["responsibilities"] if row["id"] == item["id"])["profileId"] == person["id"]
assert request("/api/responsibilities", "DELETE", {"id": item["id"], "profileId": person["id"], "revision": 2})[0] == 200
assert all(row["id"] != item["id"] for row in request("/api/responsibilities")[1]["responsibilities"])
assert all(row in shared_profiles["responses"] for row in initial["responses"]), "Existing schedules must survive"
print("PASS: shared responsibility CRUD, single-day and range dates, validation, notes, profile links, renames, revision conflicts, CORS, origin rejection, and existing holiday schedules.")
