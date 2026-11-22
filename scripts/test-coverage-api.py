"""Coverage persistence checks, restricted to a disposable local calendar."""
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid

BASE = os.environ.get("CALENDAR_TEST_URL", "http://127.0.0.1:5173")
assert urllib.parse.urlparse(BASE).hostname in {"localhost", "127.0.0.1"}
urllib.request.install_opener(urllib.request.build_opener(urllib.request.ProxyHandler({})))

def request(path, method="GET", data=None):
    time.sleep(0.1)
    req = urllib.request.Request(BASE + path, method=method, headers={"Origin": "https://yijialiow.com", "Content-Type": "application/json"}, data=None if data is None else json.dumps(data).encode())
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            return response.status, json.loads(response.read())
    except urllib.error.HTTPError as error:
        return error.code, json.loads(error.read())

people = []
for name in ["Owner", "Helper", "Other helper"]:
    status, created = request("/api/responses", "POST", {"name": name + " coverage QA " + uuid.uuid4().hex[:8], "days": []})
    assert status == 201, created
    people.append(created["response"])
owner, helper, other = people
base = {"profileId": owner["id"], "title": "Coverage check", "startDate": "2026-12-20", "endDate": "2026-12-31", "notes": "Keep original ownership"}
entry = {"profileId": helper["id"], "startDate": "2026-12-24", "endDate": "2026-12-26"}
second = {"profileId": other["id"], "startDate": "2026-12-28", "endDate": "2026-12-29"}
status, existing = request("/api/responsibilities")
assert status == 200
for coverage in [[{**entry, "profileId": owner["id"]}], [{**entry, "profileId": str(uuid.uuid4())}], [{**entry, "startDate": "2026-12-19"}], [{**entry, "endDate": "2027-01-01"}], [entry, {**second, "startDate": "2026-12-26"}]]:
    status, invalid = request("/api/responsibilities", "POST", {**base, "coverage": coverage})
    assert status == 400, invalid
status, created = request("/api/responsibilities", "POST", {**base, "coverage": [second, entry]})
assert status == 201, created
task = created["responsibility"]
assert task["profileId"] == owner["id"] and task["coverage"] == [entry, second]
status, shared = request("/api/responsibilities")
assert next(row for row in shared["responsibilities"] if row["id"] == task["id"])["coverage"] == [entry, second]
assert all(row in shared["responsibilities"] for row in existing["responsibilities"]), "Existing tasks must be preserved"
# Older browser code omits coverage on update. It must not erase the arrangements.
status, changed = request("/api/responsibilities", "PUT", {**base, "id": task["id"], "revision": 1, "notes": "Legacy browser update"})
assert status == 200 and changed["responsibility"]["coverage"] == [entry, second], changed
assert request("/api/responsibilities", "PUT", {**base, "id": task["id"], "revision": 1, "coverage": []})[0] == 409
assert request("/api/responsibilities", "PUT", {**base, "id": task["id"], "revision": 2, "endDate": "2026-12-25"})[0] == 400
status, cleared = request("/api/responsibilities", "PUT", {**base, "id": task["id"], "revision": 2, "coverage": []})
assert status == 200 and cleared["responsibility"]["coverage"] == [], cleared
assert request("/api/responsibilities", "DELETE", {"id": task["id"], "profileId": owner["id"], "revision": 3})[0] == 200
status, legacy = request("/api/responsibilities", "POST", base)
assert status == 201 and legacy["responsibility"]["coverage"] == []
assert request("/api/responsibilities", "DELETE", {"id": legacy["responsibility"]["id"], "profileId": owner["id"], "revision": 1})[0] == 200
status, profiles = request("/api/responses")
assert all(person in profiles["responses"] for person in people), "Coverage must not change ownership profiles or days away"
print("PASS: partial-date and multi-helper persistence, shared reads, legacy-client preservation, coverage removal, validation, revision conflicts, and existing task/profile preservation.")
