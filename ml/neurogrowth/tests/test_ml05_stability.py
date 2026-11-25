import unittest
import numpy as np
from ml05_stability import bootstrap_by_business, run

class NeuroGrowthML05Tests(unittest.TestCase):
    def test_cluster_bootstrap_repeats_and_alignment(self):
        y=np.tile(np.array([0,1]),12)
        ids=np.repeat(np.arange(12),2)
        neural=y.copy();tree=np.zeros_like(y);rules=np.ones_like(y)
        first=bootstrap_by_business(y,neural,tree,rules,ids,25,7)
        second=bootstrap_by_business(y,neural,tree,rules,ids,25,7)
        self.assertEqual(first,second)
        self.assertEqual(first["neural_accuracy"]["lower_95"],1.0)
        self.assertGreater(first["delta_accuracy_vs_tree"]["lower_95"],0)
        with self.assertRaises(ValueError):
            bootstrap_by_business(y,neural[:-1],tree,rules,ids,25,7)
    def test_synthetic_only_multi_dataset_scenarios(self):
        result=run(dataset_seeds=(11,42),businesses=120,epochs=3,
                   model_seeds=(7,),bootstrap_resamples=25)
        self.assertTrue(result["research_only"])
        self.assertFalse(result["real_business_validation"])
        self.assertFalse(result["production_promotion_permitted"])
        self.assertEqual(len(result["scenarios"]),2)
        for scenario in result["scenarios"]:
            self.assertEqual(scenario["test_businesses"],18)
            self.assertEqual(scenario["test_rows"],36)
            self.assertEqual(len(scenario["candidate_validation"]),2)
            self.assertEqual(len(scenario["test_class_support"]),5)
            self.assertEqual(set(scenario["paired_cluster_bootstrap_95_intervals"]),{
                "neural_accuracy","neural_macro_f1","delta_accuracy_vs_tree",
                "delta_macro_f1_vs_tree","delta_accuracy_vs_rules","delta_macro_f1_vs_rules"})
    def test_reject_single_dataset_seed(self):
        with self.assertRaises(ValueError):
            run(dataset_seeds=(42,),businesses=120,epochs=2,
                model_seeds=(7,),bootstrap_resamples=20)

if __name__=="__main__":
    unittest.main()
