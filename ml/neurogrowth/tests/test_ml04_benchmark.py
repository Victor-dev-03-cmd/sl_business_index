import unittest
import numpy as np
from ml03_evaluate import synthetic_panel, split
from ml04_neural_benchmark import (
    SmallMLP, ResidualTabularMLP, benchmark, calibration_ece,
    choose_temperature, fit_network, logits_for, probabilities, rank_metrics,
)

class NeuralBenchmarkTests(unittest.TestCase):
    def test_business_and_time_split(self):
        x,y,business_ids,months=synthetic_panel(120,seed=42)
        tr,va,te=split(business_ids,months,seed=42)
        self.assertFalse(set(business_ids[tr]) & set(business_ids[va]))
        self.assertFalse(set(business_ids[tr]) & set(business_ids[te]))
        self.assertFalse(set(business_ids[va]) & set(business_ids[te]))
        self.assertLess(months[tr].max(),months[va].min())
        self.assertLess(months[va].min(),months[te].min())
    def test_probability_simplex(self):
        x=np.array([[1.0,3.,2.],[0.,-2.,4.]])
        p=probabilities(x,temperature=1.7)
        self.assertTrue(np.allclose(p.sum(axis=1),1.))
        self.assertTrue(np.isfinite(p).all())
        self.assertTrue(np.all((p>=0)&(p<=1)))
    def test_calibration_validation_only(self):
        logits=np.array([[3.,1.],[1.,3.],[3.,1.]])
        labels=np.array([0,1,1])
        temp=choose_temperature(logits,labels)
        self.assertIn(temp,(.7,1.,1.3,1.7,2.2,3.))
        self.assertGreaterEqual(calibration_ece(probabilities(logits,temp),labels),0)
    def test_architectures_shapes_and_no_real_label_claim(self):
        x,y,ids,months=synthetic_panel(120)
        tr,va,te=split(ids,months)
        for arch in ("small_mlp","residual_mlp"):
            net,rec=fit_network(x,y,tr,va,arch,seed=7,epochs=3)
            out=logits_for(net,x[te])
            self.assertEqual(out.shape,(te.sum(),5))
            metric=rank_metrics(y[te],out,rec['validation_fitted_temperature'])
            self.assertIn('macro_f1',metric)
            self.assertIn('coverage_at_threshold',metric)
        result=benchmark(businesses=120,epochs=3,neural_seeds=(7,))
        self.assertFalse(result["real_business_validation"])
        self.assertIsNone(result["revenue_probability_or_growth_lift"])
        self.assertEqual(len(result["neural_runs"]),2)
        self.assertEqual(result["split"]["test_businesses"],18)
if __name__=="__main__":
    unittest.main()
