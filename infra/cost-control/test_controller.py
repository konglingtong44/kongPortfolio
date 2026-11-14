import copy
import unittest
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from controller import Controller

NOW = datetime(2026, 12, 10, tzinfo=timezone.utc)


class Fake(Controller):
    def __init__(self):
        self.state = None
        self.cost = Decimal(0)
        self.config = {"topics": {f"topic-{n}": n for n in (5, 10, 15, 25)}}
        self.calls = []
        self.failed = False
        self.original = 5

    def load(self): return copy.deepcopy(self.state)
    def save(self, state): self.state = copy.deepcopy(state)
    def spend(self): return self.cost
    def resources(self): return [{"kind": "lambda", "id": "api"}]
    def snapshot(self, resource): return self.original
    def quiesce(self): pass
    def change(self, resource, restore=False):
        self.calls.append((restore, resource["original"]))
        if self.failed:
            raise RuntimeError("temporary failure")

    def event(self, threshold, now=NOW):
        return self.run({"Records": [{"Sns": {"TopicArn": f"topic-{threshold}",
            "Timestamp": now.isoformat()}}]}, now)


class Scenarios(unittest.TestCase):
    def init(self):
        f = Fake()
        f.run({"action": "initialize"}, NOW - timedelta(hours=1))
        return f

    def test_four_tiers_with_manual_resume_and_duplicates(self):
        f = self.init()
        for threshold in (5, 10, 15, 25):
            current = NOW + timedelta(hours=threshold)
            f.cost = Decimal(threshold) + Decimal(".1")
            self.assertEqual(f.event(threshold, current)["status"], "off")
            f.run({"action": "on"}, current + timedelta(minutes=1))
            calls = len(f.calls)
            self.assertTrue(f.event(threshold, current)["status"].startswith("ignored"))
            self.assertEqual(len(f.calls), calls)
        self.assertEqual(f.state["consumed"], [5, 10, 15, 25])

    def test_current_month_resume_leaves_25_available(self):
        f = self.init()
        f.cost = Decimal("19.021")
        f.run({"action": "on"}, NOW)
        self.assertEqual(f.state["consumed"], [5, 10, 15])
        self.assertTrue(f.event(15, NOW + timedelta(minutes=1))["status"].startswith("ignored"))
        f.cost = Decimal("25.01")
        self.assertEqual(f.event(25, NOW + timedelta(minutes=2))["status"], "off")
        f.run({"action": "on"}, NOW + timedelta(minutes=3))
        calls = len(f.calls)
        self.assertTrue(f.event(25, NOW + timedelta(minutes=4))["status"].startswith("ignored"))
        self.assertEqual(len(f.calls), calls)

    def test_cost_jump_consumes_all_crossed_tiers(self):
        f = self.init()
        f.cost = Decimal(16)
        f.event(5)
        f.run({"action": "on"}, NOW)
        self.assertTrue(f.event(15)["status"].startswith("ignored"))

    def test_initialize_already_over_budget(self):
        f = Fake()
        f.cost = Decimal("19.02")
        f.run({"action": "initialize"}, NOW)
        self.assertEqual(f.state["consumed"], [5, 10, 15])
        self.assertEqual(f.calls, [])

    def test_repeated_off_preserves_original(self):
        f = self.init()
        f.run({"action": "off"}, NOW)
        f.original = 0
        f.run({"action": "off"}, NOW)
        f.run({"action": "on"}, NOW)
        self.assertEqual(f.calls[-1], (True, 5))

    def test_partial_failure_retry_and_resume_consumes_seen_alert(self):
        f = self.init()
        f.failed = True
        with self.assertRaises(RuntimeError): f.event(10)
        self.assertEqual(f.state["resources"][0]["original"], 5)
        f.failed = False
        f.run({"action": "on"}, NOW)
        self.assertEqual(f.state["consumed"], [5, 10])
        self.assertNotIn("errors", f.state)
        self.assertTrue(f.event(10)["status"].startswith("ignored"))

    def test_resume_baseline_suppresses_delayed_lower_alerts(self):
        f = self.init()
        f.run({"action": "off"}, NOW)
        f.run({"action": "on", "baseline_usd": "10.5"}, NOW)
        self.assertTrue(f.event(5)["status"].startswith("ignored"))
        self.assertTrue(f.event(10)["status"].startswith("ignored"))

    def test_next_month_never_opens_services(self):
        f = self.init()
        f.run({"action": "off"}, NOW)
        calls = len(f.calls)
        next_month = datetime(2027, 1, 1, tzinfo=timezone.utc)
        f.run({"action": "status"}, next_month)
        self.assertEqual(len(f.calls), calls)
        self.assertEqual(f.state["mode"], "off")
        self.assertEqual(f.event(5, next_month)["status"], "off")
        self.assertEqual(f.state["month"], "2027-01")

    def test_previous_month_notification_ignored(self):
        f = self.init()
        event = {"Records": [{"Sns": {"TopicArn": "topic-5", "Timestamp": "2026-11-30T23:59:00Z"}}]}
        self.assertEqual(f.run(event, NOW)["status"], "ignored-old-period")

    def test_delayed_pre_resume_alert_is_ignored_even_if_cost_data_lags(self):
        f = self.init()
        f.run({"action": "on"}, NOW)
        self.assertEqual(f.event(15, NOW)["status"], "ignored-before-resume")

    def test_fails_closed_without_initialization_or_trusted_topic(self):
        f = Fake()
        with self.assertRaises(RuntimeError): f.event(5)
        with self.assertRaises(ValueError):
            f.run({"Records": [{"Sns": {"TopicArn": "untrusted"}}]}, NOW)

    def test_failed_restore_retains_snapshot_and_blocks_notifications(self):
        f = self.init()
        f.run({"action": "off"}, NOW)
        f.failed = True
        with self.assertRaises(RuntimeError): f.run({"action": "on"}, NOW)
        self.assertEqual(f.state["mode"], "restoring")
        self.assertEqual(len(f.state["resources"]), 1)
        self.assertTrue(f.event(15)["status"].startswith("ignored"))
        with self.assertRaises(RuntimeError): f.event(15, NOW + timedelta(minutes=1))
        f.failed = False
        f.run({"action": "on"}, NOW)
        self.assertEqual(f.state["resources"], [])


if __name__ == "__main__": unittest.main()
