"""Synthetic-only ML-07 training and holdout safety checks."""
import copy
from pathlib import Path
import sys
import unittest
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from ml07_studio_intent_train import (load_contract, train_and_report,
    SyntheticIntentNB, EXPECTED_APP_IDS, EXPECTED_LANGS, grams)

class ML07StudioIntentTest(unittest.TestCase):
    def setUp(self):
        self.data, self.sha = load_contract()

    def test_exact_inventory_and_disjoint_synthetic_splits(self):
        self.assertEqual(len(self.data["classes"]), 12)
        self.assertEqual(tuple(row["app_id"] for row in self.data["classes"]), EXPECTED_APP_IDS)
        self.assertEqual(self.data["provenance"], "synthetic_only")
        all_train = [text for row in self.data["classes"] for lang in EXPECTED_LANGS
                     for text in row["language_examples"][lang]["train"]]
        all_eval = [text for row in self.data["classes"] for lang in EXPECTED_LANGS
                    for text in row["language_examples"][lang]["eval"]]
        self.assertEqual((len(all_train), len(all_eval)), (72, 36))
        self.assertTrue(set(all_train).isdisjoint(set(all_eval)))

    def test_train_real_cpu_model_not_mock_metrics(self):
        report = train_and_report(self.data, self.sha)
        self.assertEqual(report["synthetic_training_count"], 72)
        self.assertEqual(report["synthetic_holdout_count"], 36)
        self.assertEqual(report["classes"], 12)
        self.assertEqual(report["source_sha256"], self.sha)
        self.assertEqual(set(report["holdout_by_language"]), set(EXPECTED_LANGS))
        for result in report["holdout_by_language"].values():
            self.assertEqual(result["holdout_count"], 12)
            self.assertTrue(0 <= result["accuracy"] <= 1)
            self.assertTrue(0 <= result["macro_f1"] <= 1)
        self.assertFalse(report["production_inference_enabled"])
        self.assertFalse(report["real_vendor_training_authorized"])
        self.assertFalse(report["automated_execution_enabled"])

    def test_does_not_accept_private_or_fake_real_data(self):
        data = copy.deepcopy(self.data)
        data["provenance"] = "real_vendor_export"
        from tempfile import TemporaryDirectory
        import json
        with TemporaryDirectory() as t:
            dest = Path(t) / "contract.json"
            dest.write_text(json.dumps(data), encoding="utf-8")
            with self.assertRaises(ValueError):
                load_contract(dest)
        data = copy.deepcopy(self.data)
        data["classes"][0]["language_examples"]["en"]["eval"][0] = "Mail test@example.com now"
        with TemporaryDirectory() as t:
            dest = Path(t) / "contract.json"
            dest.write_text(json.dumps(data), encoding="utf-8")
            with self.assertRaises(ValueError):
                load_contract(dest)

    def test_repeated_holdout_is_rejected(self):
        data = copy.deepcopy(self.data)
        en = data["classes"][0]["language_examples"]["en"]
        en["eval"][0] = en["train"][0]
        from tempfile import TemporaryDirectory
        import json
        with TemporaryDirectory() as t:
            dest = Path(t) / "contract.json"
            dest.write_text(json.dumps(data), encoding="utf-8")
            with self.assertRaises(ValueError):
                load_contract(dest)

    def test_unicode_ngrams_are_nonempty_across_scripts(self):
        for item in ["Create a poster","போஸ்டர் தயார்","පෝස්ටරයක් සකසන්න"]:
            self.assertGreater(len(grams(item)), 10)
        model = SyntheticIntentNB()
        with self.assertRaises(ValueError):
            model.fit([("unapproved-tool", "send emails")])

if __name__ == "__main__":
    unittest.main()
