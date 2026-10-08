import { useMemo, useState } from 'react';
import BridgeSchematic from './components/engineering/BridgeSchematic';
import SignalTrace from './components/engineering/SignalTrace';
import { runSimulation } from './app/simulation';
import { analyzePersistence } from './engineering/persistence';
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
  const [selectedSensorId, setSelectedSensorId] = useState(sensors[0].id);
  const [selectedComponentId, setSelectedComponentId] = useState(
    sensors[0].componentId
  );

  const result = useMemo(
    () => runSimulation(scenario, { points: 100, seed: 7 }),
    [scenario]
  );

  const highest = result.assessments[0];

  const activeAnomalies = result.analyses.filter(
    (analysis) => analysis.severity !== 'normal'
  );

  const selectedSensor = sensors.find(
    (sensor) => sensor.id === selectedSensorId
  ) ?? sensors[0];

  const selectedAnalysis = result.analyses.find(
    (analysis) => analysis.sensorId === selectedSensor.id
  );

  const selectedMeasurements = result.measurements.filter(
    (measurement) => measurement.sensorId === selectedSensor.id
  );

  const selectedPersistence = analyzePersistence(
    selectedMeasurements,
    selectedSensor,
    {
      minimumSeverity: 'watch',
      requiredConsecutivePoints: 3
    }
  );

  const selectedComponent = components.find(
    (component) => component.id === selectedComponentId
  );

  const selectedComponentSensors = sensors.filter(
    (sensor) => sensor.componentId === selectedComponentId
  );

  const selectedComponentAssessment = result.assessments.find(
    (assessment) => assessment.componentId === selectedComponentId
  );

  const selectedComponentAnomalies =
    selectedComponentAssessment?.sensorAnalyses.filter(
      (analysis) => analysis.severity !== 'normal'
    ) ?? [];

  function handleComponentSelect(componentId: string) {
    setSelectedComponentId(componentId);

    const componentSensor = sensors.find(
      (sensor) => sensor.componentId === componentId
    );

    if (componentSensor) {
      setSelectedSensorId(componentSensor.id);
    }
  }

  function handleSensorSelect(sensorId: string) {
    const sensor = sensors.find((item) => item.id === sensorId);

    if (!sensor) {
      return;
    }

    setSelectedSensorId(sensorId);
    setSelectedComponentId(sensor.componentId);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <div className="eyebrow">
            STRUCTURAL HEALTH MONITORING LABORATORY
          </div>

          <h1>BridgeWatch</h1>

          <p className="subtitle">
            A software prototype for simulated structural sensor analysis.
          </p>
        </div>

        <div className={`status-pill status-${highest.severity}`}>
          {severityLabel[highest.severity]}
        </div>
      </header>

      <section className="control-panel">
        <label htmlFor="scenario">Simulation scenario</label>

        <select
          id="scenario"
          value={scenario}
          onChange={(event) =>
            setScenario(event.target.value as Scenario)
          }
        >
          {scenarios.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        <span className="hint">
          100 deterministic measurements per sensor · seed 7
        </span>
      </section>

      <section className="metrics-grid">
        <article className="metric-card">
          <span>Sensors online</span>
          <strong>
            {sensors.length} / {sensors.length}
          </strong>
        </article>

        <article className="metric-card">
          <span>Active anomalies</span>
          <strong>{activeAnomalies.length}</strong>
        </article>

        <article className="metric-card">
          <span>Highest priority</span>
          <strong>{highest.componentId}</strong>
        </article>

        <article className="metric-card">
          <span>Top score</span>
          <strong>{highest.score.toFixed(2)}</strong>
        </article>
      </section>

      <section className="content-grid">
        <article className="panel bridge-panel">
          <div className="panel-heading">
            <div>
              <div className="eyebrow">STRUCTURAL MODEL</div>
              <h2>Bridge workspace</h2>
            </div>

            <span className="small-tag">Interactive</span>
          </div>

          <BridgeSchematic
            highestComponentId={highest.componentId}
            selectedComponentId={selectedComponentId}
            onSelectComponent={handleComponentSelect}
          />

          <div className="diagram-caption">
            <span>
              Click a structural component to inspect its evidence
            </span>
          </div>
        </article>

        <article className="panel component-panel">
          <div className="panel-heading">
            <div>
              <div className="eyebrow">COMPONENT ASSESSMENT</div>

              <h2>
                {selectedComponent?.name ?? selectedComponentId}
              </h2>
            </div>

            <span className="small-tag">
              {selectedComponent?.type ?? 'component'}
            </span>
          </div>

          {selectedComponentAssessment ? (
            <>
              <div className="component-status">
                <div>
                  <span className="component-status-label">
                    Current assessment
                  </span>

                  <strong
                    className={`severity-text severity-${selectedComponentAssessment.severity}`}
                  >
                    {severityLabel[selectedComponentAssessment.severity]}
                  </strong>
                </div>

                <div className="component-score">
                  <span>Component score</span>

                  <strong>
                    {selectedComponentAssessment.score.toFixed(2)}
                  </strong>
                </div>
              </div>

              <div className="evidence-summary">
                <div>
                  <span>Connected sensors</span>
                  <strong>{selectedComponentSensors.length}</strong>
                </div>

                <div>
                  <span>Flagged sensors</span>
                  <strong>{selectedComponentAnomalies.length}</strong>
                </div>

                <div>
                  <span>Highest sensor severity</span>

                  <strong>
                    {severityLabel[selectedComponentAssessment.severity]}
                  </strong>
                </div>
              </div>

              <div className="component-sensors">
                <div className="eyebrow">SENSOR EVIDENCE</div>

                <div className="sensor-evidence-list">
                  {selectedComponentSensors.map((sensor) => {
                    const analysis = result.analyses.find(
                      (item) => item.sensorId === sensor.id
                    );

                    if (!analysis) {
                      return null;
                    }

                    return (
                      <button
                        type="button"
                        key={sensor.id}
                        className={
                          sensor.id === selectedSensor.id
                            ? 'sensor-evidence selected'
                            : 'sensor-evidence'
                        }
                        onClick={() => handleSensorSelect(sensor.id)}
                      >
                        <span>
                          <strong>{sensor.id}</strong>

                          <small>
                            {sensor.type} · {sensor.unit}
                          </small>
                        </span>

                        <span className="sensor-evidence-result">
                          <strong>
                            {analysis.zScore.toFixed(2)}σ
                          </strong>

                          <small
                            className={`severity-text severity-${analysis.severity}`}
                          >
                            {severityLabel[analysis.severity]}
                          </small>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="assessment-reason">
                <div className="eyebrow">CURRENT EVIDENCE</div>

                {selectedComponentAnomalies.length === 0 ? (
                  <p>
                    No connected sensor is currently outside the
                    configured watch threshold.
                  </p>
                ) : (
                  <p>
                    {selectedComponentAnomalies.length} connected
                    sensor(s) currently show deviations from their
                    configured baselines. Select a sensor to inspect
                    its signal trace.
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="signal-empty">
              No sensor assessment is available for this component.
            </div>
          )}
        </article>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <div className="eyebrow">DECISION MODEL</div>
            <h2>Inspection priority</h2>
          </div>
        </div>

        <div className="assessment-list">
          {result.assessments.map((assessment) => (
            <div
              className="assessment-row"
              key={assessment.componentId}
            >
              <div>
                <strong>{assessment.componentId}</strong>

                <span>
                  {assessment.sensorAnalyses.length} sensor(s)
                </span>
              </div>

              <div className="assessment-right">
                <span
                  className={`severity-text severity-${assessment.severity}`}
                >
                  {severityLabel[assessment.severity]}
                </span>

                <strong>{assessment.score.toFixed(2)}</strong>
              </div>
            </div>
          ))}
        </div>
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
            <thead>
              <tr>
                <th>Sensor</th>
                <th>Component</th>
                <th>Latest value</th>
                <th>Z-score</th>
                <th>Status</th>
                <th>Reason</th>
              </tr>
            </thead>

            <tbody>
              {result.analyses.map((analysis) => {
                const sensor = sensors.find(
                  (item) => item.id === analysis.sensorId
                )!;

                const isSelected =
                  sensor.id === selectedSensor.id;

                return (
                  <tr
                    key={analysis.sensorId}
                    onClick={() => handleSensorSelect(sensor.id)}
                    className={isSelected ? 'selected-row' : ''}
                    aria-selected={isSelected}
                  >
                    <td>{analysis.sensorId}</td>
                    <td>{analysis.componentId}</td>

                    <td>
                      {analysis.latestValue.toFixed(2)} {sensor.unit}
                    </td>

                    <td>{analysis.zScore.toFixed(2)}</td>

                    <td>
                      <span
                        className={`severity-text severity-${analysis.severity}`}
                      >
                        {severityLabel[analysis.severity]}
                      </span>
                    </td>

                    <td>{analysis.reason}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <div className="eyebrow">SIGNAL INVESTIGATION</div>
            <h2>{selectedSensor.id}</h2>
          </div>

          <span className="small-tag">Selected sensor</span>
        </div>

        <div className="metrics-grid">
          <article className="metric-card">
            <span>Sensor type</span>
            <strong>{selectedSensor.type}</strong>
          </article>

          <article className="metric-card">
            <span>Component</span>
            <strong>{selectedSensor.componentId}</strong>
          </article>

          <article className="metric-card">
            <span>Unit</span>
            <strong>{selectedSensor.unit}</strong>
          </article>

          <article className="metric-card">
            <span>Samples</span>
            <strong>{selectedMeasurements.length}</strong>
          </article>
        </div>

        <div className="persistence-panel">
          <div className="persistence-heading">
            <div>
              <div className="eyebrow">TEMPORAL EVIDENCE</div>
              <h3>Persistence analysis</h3>
            </div>

            <span
              className={
                selectedPersistence.persistent
                  ? 'persistence-status persistent'
                  : 'persistence-status isolated'
              }
            >
              {selectedPersistence.persistent
                ? 'PERSISTENT'
                : 'NOT PERSISTENT'}
            </span>
          </div>

          <div className="persistence-grid">
            <div>
              <span>Flagged observations</span>
              <strong>
                {selectedPersistence.qualifyingMeasurements}
              </strong>
            </div>

            <div>
              <span>Longest abnormal run</span>
              <strong>{selectedPersistence.longestRun}</strong>
            </div>

            <div>
              <span>Current abnormal run</span>
              <strong>{selectedPersistence.currentRun}</strong>
            </div>

            <div>
              <span>Required run</span>
              <strong>3</strong>
            </div>
          </div>

          <p className="persistence-explanation">
            A measurement is considered qualifying when its z-score
            reaches the configured watch threshold. Persistence
            requires at least three consecutive qualifying
            observations.
          </p>
        </div>

        <SignalTrace
          measurements={selectedMeasurements}
          sensor={selectedSensor}
        />

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Baseline mean</th>
                <th>Baseline std dev</th>
                <th>Latest value</th>
                <th>Z-score</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td>
                  {selectedSensor.baselineMean.toFixed(2)}{' '}
                  {selectedSensor.unit}
                </td>

                <td>
                  {selectedSensor.baselineStd.toFixed(2)}{' '}
                  {selectedSensor.unit}
                </td>

                <td>
                  {selectedAnalysis?.latestValue.toFixed(2)}{' '}
                  {selectedSensor.unit}
                </td>

                <td>
                  {selectedAnalysis?.zScore.toFixed(2)}
                </td>

                <td>
                  {selectedAnalysis && (
                    <span
                      className={`severity-text severity-${selectedAnalysis.severity}`}
                    >
                      {severityLabel[selectedAnalysis.severity]}
                    </span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <footer>
        Synthetic-data prototype. Thresholds and scores are
        project-defined analytical rules, not structural safety limits
        or certification criteria.
      </footer>
    </main>
  );
}