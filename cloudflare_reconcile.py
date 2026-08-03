#!/usr/bin/env python3
"""Redacted, reversible inspection/cutover for the legacy Queue and cron."""

from __future__ import annotations

import argparse
import json
import os
import re
import stat
import time
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any


WORKER = "shadowglass-v8-warpspeed"
QUEUE_NAME = "shadowglass-v8-queue"
ACCOUNT_ID = ""
CF_API = os.getenv("CF_API_BASE", "https://api.cloudflare.com/client/v4").rstrip("/")
SDK_URL = os.getenv("ECHO_SDK_URL", "http://127.0.0.1:8000/sdk/invoke")
KEY_FILE = Path(os.getenv("ECHO_SOVEREIGN_KEY_FILE", "/home/forge/.echo_sovereign_key"))
CREDENTIAL_DIR = Path(
    os.getenv(
        "SG_V8_CREDENTIAL_DIR",
        "/etc/echo/credentials/shadowglass-v8-warpspeed",
    )
)
BACKUP_PATH = Path(
    os.getenv(
        "SG_V8_CF_BACKUP",
        "/home/forge/shadowglass-v8-warpspeed/cloudflare-trigger-backup.json",
    )
)
RECOVERY_PATH = Path(
    os.getenv(
        "SG_V8_RECOVERY_MARKER",
        "/home/forge/shadowglass-v8-warpspeed/RECOVERY_REQUIRED.json",
    )
)


def _clear_recovery_marker() -> None:
    if not RECOVERY_PATH.exists():
        return
    RECOVERY_PATH.unlink()
    descriptor = os.open(RECOVERY_PATH.parent, os.O_RDONLY)
    try:
        os.fsync(descriptor)
    finally:
        os.close(descriptor)


def _sovereign_key() -> str:
    match = re.search(r"SOVEREIGN_KEY\s*=\s*(\S+)", KEY_FILE.read_text(encoding="utf-8"))
    if not match:
        raise RuntimeError("SDK credential unavailable")
    return match.group(1)


def _cloudflare_token() -> str:
    payload = {
        "envelope_version": 1,
        "capability": "echo.vault.get",
        "params": {
            "command": "get",
            "service": "cloudflare_shadowglass_v8_cutover_token",
            "username": "queue-worker-triggers",
        },
        "context": {
            "bypass_reason": (
                "Inspect and reversibly cut over the verified ShadowGlass v8 "
                "Cloudflare queue consumer and hourly trigger after staging passes."
            )
        },
    }
    request = urllib.request.Request(
        SDK_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "X-Echo-API-Key": _sovereign_key()},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        result = json.loads(response.read())
    secret = ((result.get("result") or {}).get("body") or {}).get("secret")
    if not secret:
        raise RuntimeError("Cloudflare credential unavailable")
    return str(secret)


def _load_identity() -> None:
    global ACCOUNT_ID
    account_id = (CREDENTIAL_DIR / "cloudflare-account-id").read_text(
        encoding="utf-8"
    ).strip()
    if not re.fullmatch(r"[0-9a-f]{32}", account_id):
        raise RuntimeError("Cloudflare account identity is invalid")
    ACCOUNT_ID = account_id


def _cf(method: str, path: str, key: str, payload: Any = None) -> Any:
    request = urllib.request.Request(
        f"{CF_API}{path}",
        data=None if payload is None else json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {key}",
        },
        method=method,
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        raw = response.read()
    result = json.loads(raw) if raw else {"success": True, "result": None}
    if not result.get("success"):
        raise RuntimeError("Cloudflare operation failed")
    return result.get("result")


def _validate_identity(key: str) -> None:
    token = _cf("GET", "/user/tokens/verify", key) or {}
    if str(token.get("status") or "").casefold() != "active":
        raise RuntimeError("Cloudflare scoped token is not active")


def _state(key: str) -> dict[str, Any]:
    queues = list(_cf("GET", f"/accounts/{ACCOUNT_ID}/queues", key) or [])
    matches = [queue for queue in queues if queue.get("queue_name") == QUEUE_NAME]
    if len(matches) != 1:
        raise RuntimeError("expected exactly one legacy queue")
    queue = matches[0]
    queue_id = str(queue.get("queue_id") or queue.get("queue_id_string") or "")
    if not re.fullmatch(r"[A-Za-z0-9_-]{8,64}", queue_id):
        raise RuntimeError("legacy queue identity is unavailable")
    consumers = list(
        _cf("GET", f"/accounts/{ACCOUNT_ID}/queues/{queue_id}/consumers", key) or []
    )
    metrics = _cf("GET", f"/accounts/{ACCOUNT_ID}/queues/{queue_id}/metrics", key) or {}
    schedules = _cf(
        "GET",
        f"/accounts/{ACCOUNT_ID}/workers/scripts/{urllib.parse.quote(WORKER)}/schedules",
        key,
    ) or []
    if isinstance(schedules, dict):
        schedules = schedules.get("schedules") or []
    domains = list(
        _cf(
            "GET",
            f"/accounts/{ACCOUNT_ID}/workers/domains?service={urllib.parse.quote(WORKER)}",
            key,
        )
        or []
    )
    subdomain = _cf(
        "GET",
        f"/accounts/{ACCOUNT_ID}/workers/scripts/{urllib.parse.quote(WORKER)}/subdomain",
        key,
    ) or {}
    matching_consumers = [
        item
        for item in consumers
        if (item.get("script") or item.get("script_name")) == WORKER
    ]
    return {
        "queue": queue,
        "queue_id": queue_id,
        "consumers": consumers,
        "matching_consumers": matching_consumers,
        "metrics": metrics,
        "schedules": schedules,
        "domains": [item for item in domains if item.get("service") == WORKER],
        "subdomain": subdomain,
    }


def _summary(state: dict[str, Any]) -> dict[str, Any]:
    backlog_count, backlog_bytes, oldest_timestamp_ms = _metric_snapshot(
        state["metrics"]
    )
    return {
        "worker": WORKER,
        "queue_exists": bool(state["queue_id"]),
        "consumer_count": len(state["consumers"]),
        "matching_worker_consumers": len(state["matching_consumers"]),
        "backlog_count": backlog_count,
        "backlog_bytes": backlog_bytes,
        "oldest_message_timestamp_ms": oldest_timestamp_ms,
        "crons": sorted(str(item.get("cron")) for item in state["schedules"]),
        "custom_domain_count": len(state["domains"]),
        "workers_dev_enabled": bool(state["subdomain"].get("enabled")),
    }


def _metric_snapshot(metrics: Any) -> tuple[int, int, int]:
    if not isinstance(metrics, dict):
        raise RuntimeError("legacy queue metrics response is not an object")
    values: list[int] = []
    for name in ("backlog_count", "backlog_bytes", "oldest_message_timestamp_ms"):
        value = metrics.get(name)
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            raise RuntimeError(f"legacy queue metric is missing or malformed: {name}")
        if value < 0 or int(value) != value:
            raise RuntimeError(f"legacy queue metric is outside its valid range: {name}")
        values.append(int(value))
    return values[0], values[1], values[2]


def _save_backup(state: dict[str, Any]) -> None:
    if BACKUP_PATH.exists():
        existing = _load_backup(state["queue_id"])
        if _is_disabled(state):
            return
        _assert_disable_baseline(state)
        if (
            [_consumer_payload(item) for item in existing["matching_consumers"]]
            != [_consumer_payload(item) for item in state["matching_consumers"]]
            or _schedule_payload(list(existing["schedules"]))
            != _schedule_payload(list(state["schedules"]))
            or dict(existing["subdomain"]) != dict(state["subdomain"])
            or sorted(existing["domains"], key=lambda item: json.dumps(item, sort_keys=True))
            != sorted(state["domains"], key=lambda item: json.dumps(item, sort_keys=True))
        ):
            raise RuntimeError("existing backup differs from the current legacy trigger baseline")
        return
    _assert_disable_baseline(state)
    BACKUP_PATH.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "worker": WORKER,
        "queue_name": QUEUE_NAME,
        "queue_id": state["queue_id"],
        "matching_consumers": state["matching_consumers"],
        "schedules": state["schedules"],
        "subdomain": state["subdomain"],
        "domains": state["domains"],
        "summary": _summary(state),
    }
    descriptor = os.open(
        BACKUP_PATH,
        os.O_WRONLY | os.O_CREAT | os.O_EXCL,
        stat.S_IRUSR | stat.S_IWUSR,
    )
    with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, separators=(",", ":"), sort_keys=True)
        handle.write("\n")
        handle.flush()
        os.fsync(handle.fileno())
    directory_descriptor = os.open(BACKUP_PATH.parent, os.O_RDONLY)
    try:
        os.fsync(directory_descriptor)
    finally:
        os.close(directory_descriptor)


def _load_backup(queue_id: str) -> dict[str, Any]:
    if not BACKUP_PATH.exists():
        raise RuntimeError("legacy trigger recovery backup is missing")
    try:
        backup = json.loads(BACKUP_PATH.read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        raise RuntimeError("legacy trigger recovery backup is unreadable") from exc
    if not isinstance(backup, dict) or (
        backup.get("worker") != WORKER
        or backup.get("queue_name") != QUEUE_NAME
        or str(backup.get("queue_id") or "") != queue_id
    ):
        raise RuntimeError("existing backup identity mismatch")
    consumers = list(backup.get("matching_consumers") or [])
    schedules = list(backup.get("schedules") or [])
    subdomain = backup.get("subdomain")
    domains = backup.get("domains")
    if len(consumers) != 1:
        raise RuntimeError("backup does not contain one legacy consumer")
    consumer_payload = _consumer_payload(consumers[0])
    if (
        consumer_payload.get("script_name") != WORKER
        or consumer_payload.get("type") != "worker"
    ):
        raise RuntimeError("backup legacy consumer identity mismatch")
    if _schedule_payload(schedules) != [{"cron": "0 * * * *"}]:
        raise RuntimeError("backup does not contain the recovered hourly schedule")
    if not isinstance(subdomain, dict) or subdomain.get("enabled") is not True:
        raise RuntimeError("backup does not contain the enabled workers.dev baseline")
    if not isinstance(domains, list) or domains:
        raise RuntimeError("backup custom-domain baseline is invalid")
    return backup


def _backup_restoreable(queue_id: str) -> bool:
    try:
        _load_backup(queue_id)
    except RuntimeError:
        return False
    return True


def _consumer_payload(item: dict[str, Any]) -> dict[str, Any]:
    script_name = item.get("script_name") or item.get("script")
    if not script_name:
        raise RuntimeError("legacy consumer script identity is unavailable")
    payload: dict[str, Any] = {
        "script_name": str(script_name),
        "type": str(item.get("type") or "worker"),
    }
    for name in ("dead_letter_queue", "settings"):
        if item.get(name) not in (None, ""):
            payload[name] = item[name]
    return payload


def _schedule_payload(items: list[dict[str, Any]]) -> list[dict[str, str]]:
    result = []
    for item in items:
        cron = str(item.get("cron") or "")
        if not cron:
            raise RuntimeError("legacy schedule is missing its cron expression")
        result.append({"cron": cron})
    return result


def _wait_for_stable_empty(key: str, queue_id: str) -> None:
    quiet_seconds = int(os.getenv("SG_CF_QUIET_SECONDS", "900"))
    if not 60 <= quiet_seconds <= 1800:
        raise RuntimeError("Cloudflare quiet window must be between 60 and 1800 seconds")
    beginning = _state(key)
    if beginning["schedules"] or beginning["subdomain"].get("enabled") or beginning["domains"]:
        raise RuntimeError("legacy producers are not quiesced at quiet-window start")
    if len(beginning["consumers"]) != 1 or len(beginning["matching_consumers"]) != 1:
        raise RuntimeError("legacy consumer must remain attached while the queue drains")
    quiet_started: float | None = None
    deadline = time.monotonic() + quiet_seconds + 600
    while time.monotonic() < deadline:
        metrics = _cf("GET", f"/accounts/{ACCOUNT_ID}/queues/{queue_id}/metrics", key) or {}
        count, size, oldest = _metric_snapshot(metrics)
        now = time.monotonic()
        if count == 0 and size == 0 and oldest == 0:
            if quiet_started is None:
                quiet_started = now
            if now - quiet_started >= quiet_seconds:
                ending = _state(key)
                if (
                    ending["schedules"]
                    or ending["subdomain"].get("enabled")
                    or ending["domains"]
                    or len(ending["consumers"]) != 1
                    or len(ending["matching_consumers"]) != 1
                ):
                    raise RuntimeError("legacy producer/consumer state changed during quiet window")
                final_count, final_bytes, final_oldest = _metric_snapshot(
                    ending["metrics"]
                )
                if final_count or final_bytes or final_oldest:
                    raise RuntimeError("legacy queue changed at quiet-window completion")
                return
        else:
            quiet_started = None
        time.sleep(10)
    raise RuntimeError("legacy queue did not sustain an empty propagation window")


def _is_disabled(state: dict[str, Any]) -> bool:
    count, size, oldest = _metric_snapshot(state["metrics"])
    return not (
        state["consumers"]
        or state["schedules"]
        or state["subdomain"].get("enabled")
        or state["domains"]
        or count
        or size
        or oldest
    )


def _assert_disable_baseline(state: dict[str, Any]) -> None:
    summary = _summary(state)
    if (
        summary["backlog_count"] != 0
        or summary["backlog_bytes"] != 0
        or summary["oldest_message_timestamp_ms"] != 0
    ):
        raise RuntimeError("legacy queue backlog is not empty")
    if len(state["consumers"]) != 1 or len(state["matching_consumers"]) != 1:
        raise RuntimeError("expected one matching legacy consumer")
    if summary["crons"] != ["0 * * * *"]:
        raise RuntimeError("legacy cron contract differs from the recovered schedule")
    if summary["custom_domain_count"] != 0:
        raise RuntimeError("legacy Worker has custom domains and cannot be safely detached")
    if not summary["workers_dev_enabled"]:
        raise RuntimeError("legacy workers.dev ingress is already disabled")


def _recognized_partial_cutover(state: dict[str, Any]) -> bool:
    if not BACKUP_PATH.exists():
        return False
    try:
        backup = _load_backup(state["queue_id"])
    except RuntimeError:
        return False
    expected_consumers = [
        _consumer_payload(item) for item in backup.get("matching_consumers") or []
    ]
    current_consumers = [_consumer_payload(item) for item in state["matching_consumers"]]
    expected_schedules = _schedule_payload(list(backup.get("schedules") or []))
    current_schedules = _schedule_payload(list(state["schedules"] or []))
    saved_subdomain = dict(backup.get("subdomain") or {})
    current_subdomain = dict(state["subdomain"])
    consumer_known = (
        current_consumers in ([], expected_consumers)
        and len(state["consumers"]) == len(state["matching_consumers"])
    )
    schedule_known = current_schedules in ([], expected_schedules)
    subdomain_known = current_subdomain == saved_subdomain or not current_subdomain.get(
        "enabled"
    )
    domains_known = sorted(state["domains"], key=lambda item: json.dumps(item, sort_keys=True)) == sorted(
        backup.get("domains") or [], key=lambda item: json.dumps(item, sort_keys=True)
    )
    count, size, oldest = _metric_snapshot(state["metrics"])
    return bool(
        consumer_known
        and schedule_known
        and subdomain_known
        and domains_known
        and count == size == oldest == 0
        and (current_consumers != expected_consumers or current_schedules != expected_schedules or current_subdomain != saved_subdomain)
    )


def disable(key: str) -> None:
    state = _state(key)
    if _is_disabled(state):
        _load_backup(state["queue_id"])
        print(json.dumps({"action": "already_disabled", **_summary(state)}, sort_keys=True))
        return
    try:
        _assert_disable_baseline(state)
    except RuntimeError:
        if not _recognized_partial_cutover(state):
            raise
        restore(key)
        state = _state(key)
        _assert_disable_baseline(state)
    _save_backup(state)
    consumer_id = str(state["matching_consumers"][0].get("consumer_id") or "")
    if not re.fullmatch(r"[A-Za-z0-9_-]{8,64}", consumer_id):
        raise RuntimeError("legacy consumer identity is unavailable")
    schedules_path = (
        f"/accounts/{ACCOUNT_ID}/workers/scripts/{urllib.parse.quote(WORKER)}/schedules"
    )
    subdomain_path = (
        f"/accounts/{ACCOUNT_ID}/workers/scripts/{urllib.parse.quote(WORKER)}/subdomain"
    )
    try:
        _cf("PUT", schedules_path, key, {"schedules": []})
        if state["subdomain"].get("enabled"):
            _cf("DELETE", subdomain_path, key)
        _wait_for_stable_empty(key, state["queue_id"])
        _cf(
            "DELETE",
            f"/accounts/{ACCOUNT_ID}/queues/{state['queue_id']}/consumers/{consumer_id}",
            key,
        )
    except Exception:
        restore(key)
        raise
    after = _state(key)
    if not _is_disabled(after):
        restore(key)
        raise RuntimeError("legacy trigger cutover did not converge")
    print(json.dumps({"action": "disabled", **_summary(after)}, sort_keys=True))


def restore(key: str) -> None:
    state = _state(key)
    backup = _load_backup(state["queue_id"])
    consumers = list(backup.get("matching_consumers") or [])
    if len(consumers) != 1:
        raise RuntimeError("backup does not contain one legacy consumer")
    if len(state["consumers"]) > 1 or (
        state["consumers"] and len(state["matching_consumers"]) != 1
    ):
        raise RuntimeError("unexpected legacy queue consumers prevent safe restore")
    consumer_requested = bool(state["matching_consumers"])
    if not consumer_requested:
        # Mark the request as sent even when the HTTP response is lost. A retry
        # could otherwise create a second consumer after an ambiguous timeout.
        consumer_requested = True
        try:
            _cf(
                "POST",
                f"/accounts/{ACCOUNT_ID}/queues/{state['queue_id']}/consumers",
                key,
                _consumer_payload(consumers[0]),
            )
        except Exception:
            pass
    schedules = _schedule_payload(list(backup.get("schedules") or []))
    schedules_path = (
        f"/accounts/{ACCOUNT_ID}/workers/scripts/{urllib.parse.quote(WORKER)}/schedules"
    )
    _cf("PUT", schedules_path, key, {"schedules": schedules})
    saved_subdomain = dict(backup.get("subdomain") or {})
    current = _state(key)
    if saved_subdomain.get("enabled") and not current["subdomain"].get("enabled"):
        _cf(
            "POST",
            f"/accounts/{ACCOUNT_ID}/workers/scripts/{urllib.parse.quote(WORKER)}/subdomain",
            key,
            saved_subdomain,
        )
    elif not saved_subdomain.get("enabled") and current["subdomain"].get("enabled"):
        _cf(
            "DELETE",
            f"/accounts/{ACCOUNT_ID}/workers/scripts/{urllib.parse.quote(WORKER)}/subdomain",
            key,
        )
    expected_crons = sorted(item["cron"] for item in schedules)
    expected_consumer = _consumer_payload(consumers[0])
    expected_domains = sorted(
        list(backup.get("domains") or []),
        key=lambda item: json.dumps(item, sort_keys=True),
    )
    deadline = time.monotonic() + 90
    after = _state(key)
    while time.monotonic() < deadline:
        if (
            len(after["consumers"]) == 1
            and len(after["matching_consumers"]) == 1
            and _consumer_payload(after["matching_consumers"][0]) == expected_consumer
            and _summary(after)["crons"] == expected_crons
            and bool(after["subdomain"].get("enabled"))
            == bool(saved_subdomain.get("enabled"))
            and sorted(after["domains"], key=lambda item: json.dumps(item, sort_keys=True))
            == expected_domains
            and all(
                after["subdomain"].get(name) == value
                for name, value in saved_subdomain.items()
            )
        ):
            print(json.dumps({"action": "restored", **_summary(after)}, sort_keys=True))
            _clear_recovery_marker()
            return
        if len(after["consumers"]) > 1:
            raise RuntimeError("legacy trigger restore created multiple consumers")
        # Schedule/subdomain PUT/POST/DELETE are idempotent and may be retried;
        # consumer creation is never repeated after an ambiguous response.
        _cf("PUT", schedules_path, key, {"schedules": schedules})
        if saved_subdomain.get("enabled") and not after["subdomain"].get("enabled"):
            _cf(
                "POST",
                f"/accounts/{ACCOUNT_ID}/workers/scripts/{urllib.parse.quote(WORKER)}/subdomain",
                key,
                saved_subdomain,
            )
        elif not saved_subdomain.get("enabled") and after["subdomain"].get("enabled"):
            _cf(
                "DELETE",
                f"/accounts/{ACCOUNT_ID}/workers/scripts/{urllib.parse.quote(WORKER)}/subdomain",
                key,
            )
        time.sleep(2)
        after = _state(key)
    raise RuntimeError(
        "legacy trigger restore did not converge after bounded verification retries"
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=("status", "backup", "disable", "restore"))
    args = parser.parse_args()
    _load_identity()
    key = _cloudflare_token()
    _validate_identity(key)
    state = _state(key)
    if args.action == "status":
        print(
            json.dumps(
                {**_summary(state), "backup_restoreable": _backup_restoreable(state["queue_id"])},
                sort_keys=True,
            )
        )
    elif args.action == "backup":
        _save_backup(state)
        print(json.dumps({"action": "backed_up", **_summary(state)}, sort_keys=True))
    elif args.action == "disable":
        disable(key)
    else:
        restore(key)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
