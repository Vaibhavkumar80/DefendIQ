// Small logistic-regression style scorer over URL features. Weights are hand-tuned (not trained on a dataset),
// so it is used only as a secondary signal blended with the rule engine - see README "How detection works".
const WEIGHTS = {
  noHttps: 1.2, ipHost: 2.5, atSymbol: 2.5, subLevels: 1.0, length: 1.0, hyphens: 1.2, suspTld: 1.4, shortener: 1.3,
  brandHit: 3.0, typo: 3.0, kwHost: 1.8, kwPath: 0.8, entropyHigh: 1.0, digitRatio: 1.2, redirectParam: 1.0, oddPort: 1.0, exeDownload: 2.5,
};
const BIAS = -3.6;

export function modelProbability(features) {
  let z = BIAS;
  for (const [k, w] of Object.entries(WEIGHTS)) z += w * (features[k] || 0);
  return 1 / (1 + Math.exp(-z));
}
