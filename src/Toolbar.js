import React from 'react';

function Toolbar({
    mode,
    setMode,
    setSelectedId,
    selectedId,
    deleteObject,
    deleteOnwards,
    handleSave,
    currentFrameTime,
    confidenceThreshold,
    onConfidenceThresholdChange
}) {
    return (
        <div className="toolbar">
            <button
                className={mode === 'add' ? 'active' : ''}
                onClick={() => {
                    setMode('add');
                    setSelectedId(null);
                }}
            >
                Add Mode
            </button>
            <button
                className={mode === 'edit' ? 'active' : ''}
                onClick={() => setMode('edit')}
            >
                Edit Mode
            </button>
            <button
                className={mode === 'delete' ? 'active' : ''}
                onClick={() => {
                    setMode('delete');
                    setSelectedId(null);
                }}
            >
                Delete Mode
            </button>
            <button
                onClick={deleteObject}
                disabled={!selectedId}
                className={!selectedId ? 'disabled' : ''}
            >
                Delete Object
            </button>
            <button
                onClick={deleteOnwards}
                disabled={!selectedId}
                className={!selectedId ? 'disabled' : ''}
            >
                Delete Onwards
            </button>
            <button onClick={handleSave}>
                Save
            </button>
            <div className="frame-info-card" style={{ marginTop: 18 }}>
                <span style={{ fontWeight: 600, fontSize: 15, color: '#007aff' }}>
                    Current Frame:
                </span>
                <span style={{ fontWeight: 500, fontSize: 15, marginLeft: 8 }}>
                    {currentFrameTime}s
                </span>
            </div>
            <div className="track-filter">
                <div className="track-filter-header">
                    <span>Track Confidence Filter</span>
                    <span className="track-filter-value">≥ {confidenceThreshold.toFixed(1)}</span>
                </div>
                <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.1}
                    value={confidenceThreshold}
                    onChange={(event) => onConfidenceThresholdChange(parseFloat(event.target.value))}
                    aria-label="Track confidence filter"
                />
                <div className="track-filter-scale">
                    <span>0.0</span>
                    <span>0.5</span>
                    <span>1.0</span>
                </div>
            </div>
        </div>
    );
}

export default Toolbar;