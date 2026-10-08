interface BridgeSchematicProps {
  highestComponentId: string;
}

export default function BridgeSchematic({
  highestComponentId
}: BridgeSchematicProps) {
  return (
    <div className="bridge-diagram" aria-label="Simplified bridge schematic">
      <div className="deck-line" />

      <div className={`pier ${highestComponentId === 'PIER-01' ? 'hot' : ''}`}>
        <span>P1</span>
      </div>

      <div className={`pier ${highestComponentId === 'PIER-02' ? 'hot' : ''}`}>
        <span>P2</span>
      </div>

      <div className={`pier ${highestComponentId === 'PIER-03' ? 'hot' : ''}`}>
        <span>P3</span>
      </div>

      <div className="ground-line" />
    </div>
  );
}