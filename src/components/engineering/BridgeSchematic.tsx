interface BridgeSchematicProps {
  highestComponentId: string;
  selectedComponentId: string;
  onSelectComponent: (componentId: string) => void;
}

interface PierProps {
  id: string;
  label: string;
  highestComponentId: string;
  selectedComponentId: string;
  onSelectComponent: (componentId: string) => void;
}

function Pier({
  id,
  label,
  highestComponentId,
  selectedComponentId,
  onSelectComponent
}: PierProps) {
  const isHighest = highestComponentId === id;
  const isSelected = selectedComponentId === id;

  return (
    <button
      type="button"
      className={`bridge-pier ${
        isHighest ? 'highest' : ''
      } ${isSelected ? 'selected' : ''}`}
      onClick={() => onSelectComponent(id)}
      aria-label={`Select ${id}`}
    >
      <span className="pier-label">{label}</span>

      <span className="sensor-node sensor-node-upper" />
      <span className="sensor-node sensor-node-lower" />
    </button>
  );
}

export default function BridgeSchematic({
  highestComponentId,
  selectedComponentId,
  onSelectComponent
}: BridgeSchematicProps) {
  return (
    <div
      className="bridge-model"
      aria-label="Interactive simplified bridge structure"
    >
      <div className="bridge-status">
        <span className="bridge-status-dot" />
        <span>SIMULATED STRUCTURE</span>
      </div>

      <div className="bridge-structure">
        <div className="bridge-deck">
          <span className="deck-label">MAIN DECK</span>
        </div>

        <div className="bridge-beam bridge-beam-left" />
        <div className="bridge-beam bridge-beam-center" />
        <div className="bridge-beam bridge-beam-right" />

        <div className="bridge-piers">
          <Pier
            id="PIER-01"
            label="P1"
            highestComponentId={highestComponentId}
            selectedComponentId={selectedComponentId}
            onSelectComponent={onSelectComponent}
          />

          <Pier
            id="PIER-02"
            label="P2"
            highestComponentId={highestComponentId}
            selectedComponentId={selectedComponentId}
            onSelectComponent={onSelectComponent}
          />

          <Pier
            id="PIER-03"
            label="P3"
            highestComponentId={highestComponentId}
            selectedComponentId={selectedComponentId}
            onSelectComponent={onSelectComponent}
          />
        </div>

        <div className="bridge-foundations">
          <span />
          <span />
          <span />
        </div>

        <div className="bridge-ground" />
      </div>

      <div className="bridge-legend">
        <span>
          <i className="legend-component" />
          component
        </span>

        <span>
          <i className="legend-sensor" />
          sensor node
        </span>

        <span>
          <i className="legend-selected" />
          selected
        </span>
      </div>
    </div>
  );
}