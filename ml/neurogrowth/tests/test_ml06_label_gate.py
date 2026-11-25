import copy
import unittest
from ml06_label_gate import ACTIONS, assess, synthetic_rows, validate_observation

CUTOFF="2026-11-15T00:00:00Z"

class ML06ConsentLabelGateTests(unittest.TestCase):
    def setUp(self):
        self.row=synthetic_rows(25)[0]

    def check_bad(self,reason,mutate):
        r=copy.deepcopy(self.row)
        mutate(r)
        good,why=validate_observation(r,CUTOFF)
        self.assertIsNone(good)
        self.assertEqual(why,reason)

    def test_valid_synthetic_observation(self):
        good,reason=validate_observation(self.row,CUTOFF)
        self.assertIsNone(reason)
        self.assertEqual(good["group"],"sim-00000")
        self.assertEqual(good["action"],ACTIONS[0])
        self.assertNotIn("features",good)

    def test_injection_never_silently_stripped(self):
        self.check_bad("unexpected_or_missing_columns",lambda r:r.update({"customer_email":"person@example.com"}))
        self.check_bad("unexpected_or_missing_features",lambda r:r["features"].update({"phone":"0770000000"}))

    def test_owner_and_consent_fail_closed(self):
        for field in ("owner_scoped","approved_listing","consent_training_opt_in",
                      "consent_not_revoked","consent_active_at"):
            with self.subTest(field=field):
                self.check_bad("unverified_owner_or_consent",lambda r,f=field:r.update({f:False}))
        self.check_bad("mock_provenance_only",lambda r:r.update({"source_provenance":"live_supabase"}))
        self.check_bad("synthetic_only_group_required",lambda r:r.update({"synthetic_group":"real-vendor-id"}))

    def test_unknown_evidence_not_replaced_with_zero(self):
        self.check_bad("insufficient_evidence_coverage",lambda r:r["features"].update({"evidence_coverage":.5}))
        def missing(r):
            for f in list(r["features"])[:4]:r["features"][f]=None
        self.check_bad("insufficient_feature_observation",missing)
        self.check_bad("invalid_normalized_feature",lambda r:r["features"].update({"recent_views_norm":-1}))

    def test_no_hindsight_or_false_negative_from_missing(self):
        self.check_bad("feature_or_outcome_time_leakage",lambda r:r.update({"feature_snapshot_at":"2026-10-01T15:00:00Z"}))
        self.check_bad("feature_or_outcome_time_leakage",lambda r:r.update({"observation_window_end":"2026-12-01T12:00:00Z"}))
        self.check_bad("unobserved_outcome_cannot_be_negative",lambda r:r.update({"observation_window_complete":False}))
        self.check_bad("unknown_action_or_outcome",lambda r:r.update({"observed_outcome":"unknown"}))
        self.check_bad("false_outcome_must_have_null_event_time",lambda r:r.update({"outcome_recorded_at":"2026-10-02T12:00:00Z"}))

    def test_report_is_aggregate_only_and_never_production_ready(self):
        rows=synthetic_rows(500)
        rows.append(dict(self.row,customer_phone="nope"))
        report=assess(rows,CUTOFF)
        self.assertEqual(report["accepted_synthetic_rows"],500)
        self.assertEqual(report["rejected_by_reason"],{"unexpected_or_missing_columns":1})
        self.assertTrue(report["evaluation_ready_synthetic"])
        self.assertFalse(report["production_training_enabled"])
        self.assertFalse(report["production_agent_actions_enabled"])
        self.assertEqual(report["real_world_promotion_gate"],
                         "BLOCKED_NO_REAL_LABELS_OR_APPROVED_CONSENT_PIPELINE")
        self.assertEqual(sum(report["action_test_support"].values()),75)
        self.assertNotIn("sim-",str(report))
        self.assertNotIn("customer_phone",str(report))

    def test_under_supported_classes_block_synthetic_evaluation(self):
        report=assess(synthetic_rows(30),CUTOFF)
        self.assertFalse(report["evaluation_ready_synthetic"])
        self.assertTrue(report["under_supported_actions"])

if __name__=="__main__":
    unittest.main()
