import React from 'react';

function Toolbar({
    mode,
    setMode,
    setSelectedId,
    selectedId,
    deleteObject,
    deleteOnwards,
    handleSave,
    getAllUniqueBoxes,
    selectBoxFromToolbar,
    currentFrameTime
}) {
    return (
        <div className="toolbar">
            <button
                className={mode === 'draw' ? 'active' : ''}
                onClick={() => {
                    setMode('draw');
                    setSelectedId(null);
                }}
            >
                Add Box
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
            <div className="boxes-section">
                <div className="frame-info-card">
                    <span style={{ fontWeight: 600, fontSize: 15, color: '#007aff' }}>
                        Current Frame:
                    </span>
                    <span style={{ fontWeight: 500, fontSize: 15, marginLeft: 8 }}>
                        {currentFrameTime}s
                    </span>
                </div>
                <h3 style={{ margin: '18px 0 10px 0', fontSize: '16px', fontWeight: 600, color: '#1d1d1f' }}>
                    Objects
                </h3>
                <div className="boxes-list">
                    {getAllUniqueBoxes().length === 0 ? (
                        <div className="no-boxes">No objects created yet</div>
                    ) : (
                        getAllUniqueBoxes().map(box => (
                            <div
                                key={box.id}
                                className={`box-item-card${selectedId === box.id ? ' selected' : ''}`}
                                onClick={() => selectBoxFromToolbar(box.id)}
                            >
                                <div className="box-item-title">
                                    {box.name}
                                </div>
                                <div className="box-item-lifecycle">
                                    <span style={{ color: '#86868b' }}>
                                        {box.startFrame}s
                                    </span>
                                    <span style={{ margin: '0 6px', color: '#bdbdbd' }}>→</span>
                                    <span style={{ color: box.endFrame === null ? '#007aff' : '#86868b' }}>
                                        {box.endFrame === null ? 'end' : `${box.endFrame}s`}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

export default Toolbar;
