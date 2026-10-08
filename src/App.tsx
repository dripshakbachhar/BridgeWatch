import { useMemo, useState } from 'react';
import { analyzeSensor, assessComponent } from './engineering/anomaly';
import { generateMeasurements } from './engineering/generator';
import { components, sensors } from './engineering/sensorConfig';
import type { Scenario, Severity } from './engineering/types';
import './styles.css';

const scenarios: { value: Scenario; label: string }[] = [
  { value: 'normal', label: 'Normal operation' },
  { value: 'heavy-traffic', label: 'Heavy traffic' },
  { value: 'increased-vibration', label: 'Increased vibration' },
  { value: 'temperature-change', label: 'Temperature change' },
  { value: 'structural-anomaly', label: 'Structural anomaly' },
  { value: 'sensor-failure', label: 'Sensor failure' }
];

const severityLabel: Record<Severity, string> = {
  normal: 'NORMAL',
  watch: 'WATCH',
  elevated: 'ELEVATED',
  high: 'HIGH PRIORITY'
};

export default function App() {
  const [scenario, setScenario] = useState<Scenario>('structural-anomaly');

  const result = useMemo(() => {
    const analyses = sensors.map((sensor) => {
      const measurements = generateMeasurements(sensor, scenario, { points: 100, seed: 7 });
      return analyzeSensor(sensor, measurements);
    });

    const assessments = components
      .filter((component) => sensors.some((sensor) => sensor.componentId === component.id))
      .map((component) => assessComponent(analyses, component.id))
      .sort((a, b) => b.score - a.score);

    return { analyses, assessments };
  }, [scenario]);

  const highest = result.assessments[0];
  const activeAnomalies = result.analyses.filter((analysis) => analysis.severity !== 'normal');

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <div className="eyebrow">STRUCTURAL HEALTH MONITORING LABORATORY</div>
          <h1>BridgeWatch</h1>
          <p className="subtitle">A software prototype for simulated structural sensor analysis.</p>
        </div>
        <div className={`status-pill status-${highest.severity}`}>
          {severityLabel[highest.severity]}
        </div>
      </header>

      <section className="control-panel">
        <label htmlFor="scenario">Simulation scenario</label>
        <select id="scenario" value={scenario} onChange={(event) => setScenario(event.target.value as Scenario)}>
          {scenarios.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
        <span className="hint">100 deterministic measurements per sensor</span>
      </section>

      <section className="metrics-grid">
        <article className="metric-card"><span>Sensors online</span><strong>{sensors.length} / {sensors.length}</strong></article>
        <article className="metric-card"><span>Active anomalies</span><strong>{activeAnomalies.length}</strong></article>
        <article className="metric-card"><span>Highest priority</span><strong>{highest.componentId}</strong></article>
        <article className="metric-card"><span>Top score</span><strong>{highest.score.toFixed(2)}</strong></article>
      </section>

      <section className="content-grid">
        <article className="panel bridge-panel">
          <div className="panel-heading">
            <div>
              <div className="eyebrow">VIRTUAL STRUCTURE</div>
              <h2>Bridge schematic</h2>
            </div>
            <span className="small-tag">Prototype</span>
          </div>

          <div className="bridge-diagram" aria-label="Simplified bridge schematic">
            <div className="deck-line" />
            <div className={`pier ${highest.componentId === 'PIER-01' ? 'hot' : ''}`}><span>P1</span></div>
            <div className={`pier ${highest.componentId === 'PIER-02' ? 'hot' : ''}`}><span>P2</span></div>
            <div className={`pier ${highest.componentId === 'PIER-03' ? 'hot' : ''}`}><span>P3</span></div>
            <div className="ground-line" />
          </div>

          <div className="diagram-caption">
            <span>● sensor-equipped component</span>
            <span>Highlighted component = current highest score</span>
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <div className="eyebrow">DECISION MODEL</div>
              <h2>Inspection priority</h2>
            </div>
          </div>
          <div className="assessment-list">
            {result.assessments.map((assessment) => (
              <div className="assessment-row" key={assessment.componentId}>
                <div>
                  <strong>{assessment.componentId}</strong>
                  <span>{assessment.sensorAnalyses.length} sensor(s)</span>
                </div>
                <div className="assessment-right">
                  <span className={`severity-text severity-${assessment.severity}`}>{severityLabel[assessment.severity]}</span>
                  <strong>{assessment.score.toFixed(2)}</strong>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <div className="eyebrow">SENSOR ANALYSIS</div>
            <h2>Latest simulated measurements</h2>
          </div>
          <span className="small-tag">Z-score model</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Sensor</th><th>Component</th><th>Latest value</th><th>Z-score</th><th>Status</th><th>Reason</th></tr></thead>
            <tbody>
              {result.analyses.map((analysis) => {
                const sensor = sensors.find((item) => item.id === analysis.sensorId)!;
                return (
                  <tr key={analysis.sensorId}>
                    <td>{analysis.sensorId}</td>
                    <td>{analysis.componentId}</td>
                    <td>{analysis.latestValue.toFixed(2)} {sensor.unit}</td>
                    <td>{analysis.zScore.toFixed(2)}</td>
                    <td><span className={`severity-text severity-${analysis.severity}`}>{severityLabel[analysis.severity]}</span></td>
                    <td>{analysis.reason}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <footer>
        Synthetic-data prototype. This tool is for software/engineering experimentation and is not a structural safety or certification system.
      </footer>
    </main>
  );
}
