from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest

import cloudflare_reconcile as reconcile


QUEUE_ID = "queue_12345678"
CONSUMER = {
    "consumer_id": "consumer_12345678",
    "script_name": reconcile.WORKER,
    "type": "worker",
}


def state(
    *,
    consumer: bool = True,
    cron: bool = True,
    subdomain: bool = True,
) -> dict[str, Any]:
    consumers = [CONSUMER] if consumer else []
    return {
        "queue": {"queue_name": reconcile.QUEUE_NAME, "queue_id": QUEUE_ID},
        "queue_id": QUEUE_ID,
        "consumers": consumers,
        "matching_consumers": consumers,
        "metrics": {
            "backlog_count": 0,
            "backlog_bytes": 0,
            "oldest_message_timestamp_ms": 0,
        },
        "schedules": [{"cron": "0 * * * *"}] if cron else [],
        "domains": [],
        "subdomain": {"enabled": subdomain, "previews_enabled": False},
    }


def write_backup(path: Path) -> None:
    path.write_text(
        json.dumps(
            {
                "worker": reconcile.WORKER,
                "queue_name": reconcile.QUEUE_NAME,
                "queue_id": QUEUE_ID,
                "matching_consumers": [CONSUMER],
                "schedules": [{"cron": "0 * * * *"}],
                "subdomain": {"enabled": True, "previews_enabled": False},
                "domains": [],
            }
        ),
        encoding="utf-8",
    )


def test_schedule_restore_payload_uses_api_objects() -> None:
    assert reconcile._schedule_payload([{"cron": "0 * * * *"}]) == [
        {"cron": "0 * * * *"}
    ]


def test_disable_is_idempotent_after_verified_cutover(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    backup = tmp_path / "backup.json"
    write_backup(backup)
    monkeypatch.setattr(reconcile, "BACKUP_PATH", backup)
    monkeypatch.setattr(reconcile, "_state", lambda _: state(consumer=False, cron=False, subdomain=False))
    monkeypatch.setattr(
        reconcile,
        "_cf",
        lambda *args, **kwargs: pytest.fail("idempotent disable must not mutate Cloudflare"),
    )
    reconcile.disable("opaque")
    assert '"action": "already_disabled"' in capsys.readouterr().out


def test_disable_recovers_partial_prior_attempt_then_retries(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    backup = tmp_path / "backup.json"
    write_backup(backup)
    monkeypatch.setattr(reconcile, "BACKUP_PATH", backup)
    states = iter(
        [
            state(consumer=True, cron=False, subdomain=False),
            state(),
            state(consumer=False, cron=False, subdomain=False),
        ]
    )
    monkeypatch.setattr(reconcile, "_state", lambda _: next(states))
    restored: list[str] = []
    monkeypatch.setattr(reconcile, "restore", lambda key: restored.append(key))
    monkeypatch.setattr(reconcile, "_save_backup", lambda _: None)
    monkeypatch.setattr(reconcile, "_wait_for_stable_empty", lambda *args: None)
    calls: list[tuple[str, str]] = []
    monkeypatch.setattr(
        reconcile,
        "_cf",
        lambda method, path, key, payload=None: calls.append((method, path)),
    )
    reconcile.disable("opaque")
    assert restored == ["opaque"]
    assert [method for method, _ in calls] == ["PUT", "DELETE", "DELETE"]


def test_partial_cutover_recovery_rejects_unrelated_queue_consumer(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    backup = tmp_path / "backup.json"
    write_backup(backup)
    monkeypatch.setattr(reconcile, "BACKUP_PATH", backup)
    changed = state(consumer=True, cron=False, subdomain=False)
    changed["consumers"] = [
        *changed["consumers"],
        {"consumer_id": "unrelated_12345678", "script_name": "other-worker"},
    ]
    assert not reconcile._recognized_partial_cutover(changed)


def test_restore_does_not_duplicate_existing_consumer(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    backup = tmp_path / "backup.json"
    write_backup(backup)
    monkeypatch.setattr(reconcile, "BACKUP_PATH", backup)
    monkeypatch.setattr(reconcile, "_state", lambda _: state())
    calls: list[str] = []
    monkeypatch.setattr(
        reconcile,
        "_cf",
        lambda method, path, key, payload=None: calls.append(method),
    )
    reconcile.restore("opaque")
    assert calls == ["PUT"]


def test_existing_backup_must_match_queue_identity(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    backup = tmp_path / "backup.json"
    write_backup(backup)
    payload = json.loads(backup.read_text(encoding="utf-8"))
    payload["queue_id"] = "wrong_queue_1234"
    backup.write_text(json.dumps(payload), encoding="utf-8")
    monkeypatch.setattr(reconcile, "BACKUP_PATH", backup)
    with pytest.raises(RuntimeError, match="backup identity"):
        reconcile._save_backup(state())


def test_existing_backup_must_match_full_trigger_baseline(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    backup = tmp_path / "backup.json"
    write_backup(backup)
    monkeypatch.setattr(reconcile, "BACKUP_PATH", backup)
    changed = state()
    changed["schedules"] = [{"cron": "15 * * * *"}]
    with pytest.raises(RuntimeError, match="cron contract"):
        reconcile._save_backup(changed)


def test_incomplete_backup_is_never_accepted_for_disabled_state(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    backup = tmp_path / "backup.json"
    backup.write_text(
        json.dumps(
            {
                "worker": reconcile.WORKER,
                "queue_name": reconcile.QUEUE_NAME,
                "queue_id": QUEUE_ID,
            }
        ),
        encoding="utf-8",
    )
    monkeypatch.setattr(reconcile, "BACKUP_PATH", backup)
    disabled = state(consumer=False, cron=False, subdomain=False)
    with pytest.raises(RuntimeError, match="one legacy consumer"):
        reconcile._save_backup(disabled)


@pytest.mark.parametrize(
    ("field", "value"),
    [("script_name", "unexpected-other-worker"), ("type", "http_pull")],
)
def test_restore_backup_requires_exact_legacy_worker_consumer_identity(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    field: str,
    value: str,
) -> None:
    backup = tmp_path / "backup.json"
    write_backup(backup)
    payload = json.loads(backup.read_text(encoding="utf-8"))
    payload["matching_consumers"][0][field] = value
    backup.write_text(json.dumps(payload), encoding="utf-8")
    monkeypatch.setattr(reconcile, "BACKUP_PATH", backup)
    with pytest.raises(RuntimeError, match="consumer identity"):
        reconcile._load_backup(QUEUE_ID)
    assert not reconcile._backup_restoreable(QUEUE_ID)


def test_restoreable_backup_allows_idempotent_redeploy_after_cutover(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    backup = tmp_path / "backup.json"
    write_backup(backup)
    original = backup.read_bytes()
    monkeypatch.setattr(reconcile, "BACKUP_PATH", backup)
    reconcile._save_backup(state(consumer=False, cron=False, subdomain=False))
    assert backup.read_bytes() == original


@pytest.mark.parametrize(
    "metrics",
    [
        {},
        {"backlog_count": 0, "backlog_bytes": 0},
        {
            "backlog_count": "0",
            "backlog_bytes": 0,
            "oldest_message_timestamp_ms": 0,
        },
        {
            "backlog_count": 0,
            "backlog_bytes": -1,
            "oldest_message_timestamp_ms": 0,
        },
    ],
)
def test_metrics_are_required_exact_nonnegative_numbers(metrics: Any) -> None:
    with pytest.raises(RuntimeError, match="metric"):
        reconcile._metric_snapshot(metrics)


def test_disabled_state_requires_post_detach_queue_to_remain_empty() -> None:
    changed = state(consumer=False, cron=False, subdomain=False)
    changed["metrics"]["backlog_count"] = 1
    assert not reconcile._is_disabled(changed)


def test_disabled_state_requires_zero_total_consumers() -> None:
    changed = state(consumer=False, cron=False, subdomain=False)
    changed["consumers"] = [{"consumer_id": "unexpected", "script_name": "other-worker"}]
    assert not reconcile._is_disabled(changed)


def test_unrecognized_cron_drift_is_never_mutated_or_auto_restored(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    backup = tmp_path / "backup.json"
    write_backup(backup)
    monkeypatch.setattr(reconcile, "BACKUP_PATH", backup)
    changed = state()
    changed["schedules"] = [{"cron": "15 * * * *"}]
    monkeypatch.setattr(reconcile, "_state", lambda _: changed)
    monkeypatch.setattr(
        reconcile,
        "_cf",
        lambda *args, **kwargs: pytest.fail("baseline drift must not mutate Cloudflare"),
    )
    with pytest.raises(RuntimeError, match="cron contract"):
        reconcile.disable("opaque")


def test_quiet_window_requires_sustained_zero_with_producers_disabled(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    quiet = state(consumer=True, cron=False, subdomain=False)
    monkeypatch.setattr(reconcile, "_state", lambda _: quiet)
    monkeypatch.setattr(
        reconcile,
        "_cf",
        lambda *args, **kwargs: {
            "backlog_count": 0,
            "backlog_bytes": 0,
            "oldest_message_timestamp_ms": 0,
        },
    )
    samples = iter((0.0, 0.0, 0.0, 60.0, 60.0))
    monkeypatch.setattr(reconcile.time, "monotonic", lambda: next(samples))
    monkeypatch.setattr(reconcile.time, "sleep", lambda _: None)
    monkeypatch.setenv("SG_CF_QUIET_SECONDS", "60")
    reconcile._wait_for_stable_empty("opaque", QUEUE_ID)


def test_restore_never_reposts_consumer_after_ambiguous_response(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    backup = tmp_path / "backup.json"
    write_backup(backup)
    monkeypatch.setattr(reconcile, "BACKUP_PATH", backup)
    disabled = state(consumer=False, cron=False, subdomain=False)
    monkeypatch.setattr(reconcile, "_state", lambda _: disabled)
    calls: list[tuple[str, str]] = []

    def request(method: str, path: str, key: str, payload: Any = None) -> None:
        calls.append((method, path))
        if method == "POST" and path.endswith("/consumers"):
            raise TimeoutError("ambiguous response")

    monkeypatch.setattr(reconcile, "_cf", request)
    samples = iter((0.0, 100.0))
    monkeypatch.setattr(reconcile.time, "monotonic", lambda: next(samples))
    with pytest.raises(RuntimeError, match="bounded verification retries"):
        reconcile.restore("opaque")
    assert sum(method == "POST" and path.endswith("/consumers") for method, path in calls) == 1
