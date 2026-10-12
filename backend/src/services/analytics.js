'use strict';

// Direct port of analyzeLogs() from the dashboard-analytics Lambda — same thresholds, same
// output shape (numbers are returned as fixed-decimal strings, as the app's types expect).
// `logs` must be newest-first.

const avg = (values) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);
const fixed = (n, d) => (n ? n.toFixed(d) : null);

function analyzeLogs(logs) {
  if (!logs || logs.length === 0) {
    return {
      averageWeight: null,
      averageTemperature: null,
      appetiteTrend: null,
      energyTrend: null,
      averagePooCount: null,
      averagePeeCount: null,
      averageFoodCount: null,
      averageWaterCount: null,
      healthIssues: [],
      totalLogs: 0,
    };
  }

  const pick = (key) => logs.filter((l) => l[key]).map((l) => l[key]);

  const averageWeight = avg(pick('weight'));
  const averageTemperature = avg(pick('temperature'));
  const averagePooCount = avg(pick('pooCount'));
  const averagePeeCount = avg(pick('peeCount'));
  const averageFoodCount = avg(pick('foodCount'));
  const averageWaterCount = avg(pick('waterCount'));

  const recent = logs.slice(0, 7);
  const appetiteTrend = avg(recent.filter((l) => l.appetite).map((l) => l.appetite));
  const energyTrend = avg(recent.filter((l) => l.energy).map((l) => l.energy));

  const healthIssues = [];
  const lastThree = recent.slice(0, 3);
  if (lastThree.filter((l) => l.vomiting).length >= 2) healthIssues.push('Frequent vomiting detected in recent logs');
  if (lastThree.filter((l) => l.diarrhea).length >= 2) healthIssues.push('Frequent diarrhea detected in recent logs');
  if (averageTemperature && (averageTemperature < 37.5 || averageTemperature > 39.5)) {
    healthIssues.push('Temperature outside normal range (37.5-39.5°C)');
  }
  if (appetiteTrend && appetiteTrend < 3) healthIssues.push('Low appetite trend detected');
  if (energyTrend && energyTrend < 3) healthIssues.push('Low energy trend detected');
  if (averagePooCount && averagePooCount < 1) healthIssues.push('Low bowel movement frequency detected');
  if (averagePooCount && averagePooCount > 4) healthIssues.push('High bowel movement frequency detected');
  if (averageWaterCount && averageWaterCount < 2) healthIssues.push('Low water intake detected');

  return {
    averageWeight: fixed(averageWeight, 2),
    averageTemperature: fixed(averageTemperature, 1),
    appetiteTrend: fixed(appetiteTrend, 1),
    energyTrend: fixed(energyTrend, 1),
    averagePooCount: fixed(averagePooCount, 1),
    averagePeeCount: fixed(averagePeeCount, 1),
    averageFoodCount: fixed(averageFoodCount, 1),
    averageWaterCount: fixed(averageWaterCount, 1),
    healthIssues,
    totalLogs: logs.length,
  };
}

module.exports = { analyzeLogs };
