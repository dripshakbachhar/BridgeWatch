
import { useMemo } from 'react';
import { runEnvironmentalCompensationExperiment } from '../../engineering/experiments';

type Condition = 'normal' | 'structural-anomaly';
type Mode = 'without-compensation' | 'with-compensation';

function average(
  values: number[]
): number | null {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) /
    values.length;
}

function formatCount(value: number | null): string {
  return value === null ? 'N/A' : value.toFixed(2);
}

function formatPercent(value: number | null): string {
  return value === null ? 'N/A' : `${(value * 100).toFixed(1)}%`;
}

export default function EnvironmentalAnalysis() {
  const experiment = useMemo(
    () => runEnvironmentalCompensationExperiment(),
    []
  );

  function getAverage(
    condition: Condition,
    mode: Mode,
    matched: boolean,
    metric: 'falseAlarms' | 'detectionRate'
  ): number | null {
    const values = experiment.results
      .filter((result) => {
        const isMatched =
          result.trueTemperatureCoefficient ===
          result.assumedTemperatureCoefficient;

        return (
          result.condition === condition &&
          result.compensationMode === mode &&
          isMatched === matched
        );
      })
      .map((result) => result[metric]);

    return average(values);
  }

  const comparisons = [
    {
      title: 'Normal conditions · matched coefficients',
      description: 'False alarms; lower is better.',
      off: getAverage(
        'normal',
        'without-compensation',
        true,
        'falseAlarms'
      ),
      on: getAverage(
        'normal',
        'with-compensation',
        true,
        'falseAlarms'
      ),
      metric: 'count' as const
    },
    {
      title: 'Normal conditions · mismatched coefficients',
      description: 'False alarms; lower is better.',
      off: getAverage(
        'normal',
        'without-compensation',
        false,
        'falseAlarms'
      ),
      on: getAverage(
        'normal',
        'with-compensation',
        false,
        'falseAlarms'
      ),
      metric: 'count' as const
    },
    {
      title: 'Structural anomaly · matched coefficients',
      description: 'Post-onset detection rate; higher is better.',
      off: getAverage(
        'structural-anomaly',
        'without-compensation',
        true,
        'detectionRate'
      ),
      on: getAverage(
        'structural-anomaly',
        'with-compensation',
        true,
        'detectionRate'
      ),
      metric: 'percent' as const
    },
    {
      title: 'Structural anomaly · mismatched coefficients',
      description: 'Post-onset detection rate; higher is better.',
      off: getAverage(
        'structural-anomaly',
        'without-compensation',
        false,
        'detectionRate'
      ),
      on: getAverage(
        'structural-anomaly',
        'with-compensation',
        false,
        'detectionRate'
      ),
      metric: 'percent' as const
    }
  ];

  return (
    <section className="panel environmental-panel">
      <div className="panel-heading">
        <div>
          <div className="eyebrow">
            EXPERIMENT 07
          </div>
          <h2>Environmental compensation</h2>
        </div>
        <span className="small-tag">Synthetic experiment</span>
      </div>

      <p className="environmental-intro">
        Compare the existing analysis with and without
        temperature compensation. Matched cases use the same
        generating and assumed temperature coefficients;
        mismatched cases use different coefficients.
      </p>

      <div className="environmental-grid">
        {comparisons.map((comparison) => {
          const format =
            comparison.metric === 'count'
              ? formatCount
              : formatPercent;

          return (
            <article
              className="environmental-card"
              key={comparison.title}
            >
              <h3>{comparison.title}</h3>
              <p>{comparison.description}</p>

              <div className="environmental-values">
                <div>
                  <span>Compensation off</span>
                  <strong>{format(comparison.off)}</strong>
                </div>
                <div>
                  <span>Compensation on</span>
                  <strong>{format(comparison.on)}</strong>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="environmental-notes">
        <strong>Interpret these results carefully</strong>
        <ul>
          <li>
            False-alarm counts and anomaly-detection rates
            measure different outcomes.
          </li>
          <li>
            Compensation can reduce environmental variation,
            but may also reduce anomaly-related threshold
            exceedances.
          </li>
          <li>
            These results come from deterministic synthetic
            data. They do not establish real-bridge performance
            or structural safety.
          </li>
        </ul>
      </div>
    </section>
  );
}