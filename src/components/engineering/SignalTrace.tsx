import { classifyMeasurement } from '../../engineering/anomaly';
import type { Measurement, SensorConfig } from '../../engineering/types';

interface SignalTraceProps {
  measurements: Measurement[];
  sensor: SensorConfig;
}

const WIDTH = 900;
const HEIGHT = 260;
const PADDING = {
  top: 24,
  right: 24,
  bottom: 34,
  left: 58
};

export default function SignalTrace({
  measurements,
  sensor
}: SignalTraceProps) {
  if (measurements.length === 0) {
    return (
      <div className="signal-empty">
        No measurements available.
      </div>
    );
  }

  const values = measurements.map((measurement) => measurement.value);

const classifiedMeasurements = measurements.map((measurement) => ({
  measurement,
  severity: classifyMeasurement(measurement, sensor)
}));

const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);

  const range = Math.max(rawMax - rawMin, sensor.baselineStd * 2);

  const minValue = Math.min(
    rawMin,
    sensor.baselineMean - sensor.baselineStd
  );

  const maxValue = Math.max(
    rawMax,
    sensor.baselineMean + sensor.baselineStd
  );

  const valueRange = Math.max(maxValue - minValue, Number.EPSILON);

  const plotWidth = WIDTH - PADDING.left - PADDING.right;
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;

  const x = (index: number) =>
    PADDING.left +
    (index / Math.max(measurements.length - 1, 1)) * plotWidth;

  const y = (value: number) =>
    PADDING.top +
    ((maxValue - value) / valueRange) * plotHeight;

  const points = measurements
  .map(
    (measurement, index) =>
      `${x(index)},${y(measurement.value)}`
  )
  .join(' ');

const anomalyPoints = classifiedMeasurements.filter(
  ({ severity }) => severity !== 'normal'
);

const baselineY = y(sensor.baselineMean);
  const upperBandY = y(
    sensor.baselineMean + sensor.baselineStd
  );

  const lowerBandY = y(
    sensor.baselineMean - sensor.baselineStd
  );

  const latest = measurements[measurements.length - 1];

  return (
    <div className="signal-trace">
      <div className="signal-header">
        <div>
          <strong>{sensor.id}</strong>
          <span>
            {sensor.type} · {sensor.unit}
          </span>
        </div>

        <span>
          {measurements.length} samples
        </span>
      </div>

      <div className="signal-chart-wrap">
        <svg
          className="signal-chart"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-label={`Signal trace for ${sensor.id}`}
        >
          <line
            x1={PADDING.left}
            y1={upperBandY}
            x2={WIDTH - PADDING.right}
            y2={upperBandY}
            className="signal-reference signal-band"
          />

          <line
            x1={PADDING.left}
            y1={baselineY}
            x2={WIDTH - PADDING.right}
            y2={baselineY}
            className="signal-reference signal-baseline"
          />

          <line
            x1={PADDING.left}
            y1={lowerBandY}
            x2={WIDTH - PADDING.right}
            y2={lowerBandY}
            className="signal-reference signal-band"
          />

          <polyline
  points={points}
  fill="none"
  className="signal-line"
/>

{anomalyPoints.map(({ measurement, severity }) => {
  const index = measurements.indexOf(measurement);

  return (
    <circle
      key={`${measurement.sensorId}-${measurement.timestamp}`}
      cx={x(index)}
      cy={y(measurement.value)}
      r={severity === 'high' ? 5 : 4}
      className={`signal-anomaly signal-anomaly-${severity}`}
    />
  );
})}

<circle
  cx={x(measurements.length - 1)}
  cy={y(latest.value)}
  r="5"
  className="signal-latest"
/>
          <line
            x1={PADDING.left}
            y1={HEIGHT - PADDING.bottom}
            x2={WIDTH - PADDING.right}
            y2={HEIGHT - PADDING.bottom}
            className="signal-axis"
          />

          <line
            x1={PADDING.left}
            y1={PADDING.top}
            x2={PADDING.left}
            y2={HEIGHT - PADDING.bottom}
            className="signal-axis"
          />

          <text
            x={PADDING.left - 8}
            y={upperBandY + 4}
            textAnchor="end"
            className="signal-label"
          >
            +1σ
          </text>

          <text
            x={PADDING.left - 8}
            y={baselineY + 4}
            textAnchor="end"
            className="signal-label"
          >
            μ
          </text>

          <text
            x={PADDING.left - 8}
            y={lowerBandY + 4}
            textAnchor="end"
            className="signal-label"
          >
            −1σ
          </text>

          <text
            x={PADDING.left}
            y={HEIGHT - 10}
            className="signal-label"
          >
            0
          </text>

          <text
            x={WIDTH - PADDING.right}
            y={HEIGHT - 10}
            textAnchor="end"
            className="signal-label"
          >
            {measurements.length - 1}
          </text>
        </svg>
      </div>

      <div className="signal-legend">
        <span>
          <i className="legend-line" />
          measured signal
        </span>

        <span>
          <i className="legend-baseline" />
          baseline mean
        </span>

        <span>
          <i className="legend-band" />
          ±1σ reference
        </span>

        <span>
          Latest: {latest.value.toFixed(2)} {sensor.unit}
        </span>
      </div>
    </div>
  );
}