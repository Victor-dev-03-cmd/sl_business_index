import ast,unittest,numpy as np
from ml03_evaluate import synthetic_panel,split,run,rule
class ML03(unittest.TestCase):
 def test_group_time_separation(self):
  x,y,ids,t=synthetic_panel(120)
  a,b,c=split(ids,t)
  self.assertFalse(set(ids[a])&set(ids[b]));self.assertFalse(set(ids[b])&set(ids[c]));self.assertFalse(set(ids[a])&set(ids[c]))
  self.assertLess(t[a].max(),t[b].min());self.assertLess(t[b].max(),t[c].min())
 def test_reproducible(self): self.assertEqual(run(100),run(100))
 def test_no_fake_real_claim(self):
  r=run(100);self.assertTrue(r["research_only"]);self.assertFalse(r["real_business_validation"]);self.assertIsNone(r["real_growth_or_roi_claim"])
  self.assertEqual(set(r["models"]),{"majority","heuristic_rule","hist_gradient_boosting"})
 def test_rule_shape(self): self.assertEqual(rule(np.zeros((3,10),dtype=np.float32)).shape,(3,))
if __name__=="__main__":unittest.main()
