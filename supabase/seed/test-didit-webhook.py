#!/usr/bin/env python3
"""Didit webhook security E2E test — canonical V2 signature verification."""
import hashlib, hmac, json, sys, time, urllib.request

SECRET = "Ukfqu94Owg0BSUSEmg_m5aeU1L8QJGPMm7RXVx5DXvM"
BASE = "http://localhost:3001/api/webhooks/didit"

def shorten_floats(v):
    if isinstance(v, list):
        return [shorten_floats(x) for x in v]
    if isinstance(v, dict):
        return {k: shorten_floats(x) for k, x in v.items()}
    if isinstance(v, float) and v.is_integer():
        return int(v)
    return v

def sort_keys(v):
    if isinstance(v, list):
        return [sort_keys(x) for x in v]
    if isinstance(v, dict):
        return {k: sort_keys(v[k]) for k in sorted(v)}
    return v

def canonical(body):
    return json.dumps(sort_keys(shorten_floats(body)), separators=(",", ":"), ensure_ascii=False)

def sign(body, ts):
    return hmac.new(SECRET.encode(), canonical(body).encode("utf-8"), hashlib.sha256).hexdigest()

def post(body, sig=None, ts=None, label=""):
    ts = ts if ts is not None else int(time.time())
    sig = sig if sig is not None else sign(body, ts)
    req = urllib.request.Request(BASE, data=json.dumps(body).encode(), method="POST")
    req.add_header("Content-Type", "application/json")
    req.add_header("x-signature-v2", sig)
    req.add_header("x-timestamp", str(ts))
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            print(f"{label}: {r.status} {r.read().decode()[:40]}")
    except urllib.error.HTTPError as e:
        print(f"{label}: {e.code} {e.read().decode()[:40]}")

results = 0
def main():
    global results
    # 1. Valid signature, fresh timestamp, unknown vendor_data -> ok + audit
    body1 = {
        "event_id": "11111111-1111-4111-8111-111111111111",
        "webhook_type": "status.updated",
        "timestamp": int(time.time()),
        "created_at": int(time.time()) - 10,
        "application_id": "22222222-2222-4222-8222-222222222222",
        "session_id": "33333333-3333-4333-8333-333333333333",
        "status": "In Review",
        "workflow_id": "29395dea-3494-413e-a9b2-52333b177f79",
        "workflow_version": 1,
        "vendor_data": "unknown-e2e-user",
        "metadata": {},
    }
    post(body1, label="1. valid sig+fresh (expect 200 ok)")

    # 2. Tampered body / bad signature -> 401 bad sig
    post(body1, sig="0" * 64, label="2. bad signature (expect 401)")

    # 3. Stale timestamp -> 401 stale
    post(body1, ts=int(time.time()) - 301, label="3. stale ts (expect 401)")

    # 4. Replay same event_id (valid sig) -> ok, deduped (audit count stays 1)
    post(body1, label="4. replay event_id (expect 200 ok, deduped)")

main()
