import React from 'react';
import Select from 'react-select';

function DataSelection({
    subjects,
    cameras,
    selectedSubject,
    setSelectedSubject,
    selectedCamera,
    setSelectedCamera,
    handleLoadVideo
}) {
    return (
        <div className="data-selection-centered">
            <div className="data-selection-card">
                <h2 style={{ textAlign: 'center', marginBottom: 24 }}>Data Selection</h2>
                <div style={{ marginBottom: 24 }}>
                    <label className="data-label">
                        Subject/Visit
                    </label>
                    <Select
                        options={subjects}
                        value={subjects.find(s => s.value === selectedSubject)}
                        onChange={option => setSelectedSubject(option ? option.value : '')}
                        placeholder="Select subject/visit..."
                        isClearable
                        classNamePrefix="rs"
                    />
                </div>
                <div style={{ marginBottom: 24 }}>
                    <label className="data-label">
                        Camera
                    </label>
                    <Select
                        options={cameras}
                        value={cameras.find(c => c.value === selectedCamera)}
                        onChange={option => setSelectedCamera(option ? option.value : '')}
                        placeholder="Select camera..."
                        isClearable
                        classNamePrefix="rs"
                    />
                </div>
                <button
                    style={{
                        padding: '12px 24px',
                        borderRadius: 12,
                        background: '#007aff',
                        color: 'white',
                        fontWeight: 500,
                        fontSize: 15,
                        border: 'none',
                        cursor: selectedSubject && selectedCamera ? 'pointer' : 'not-allowed',
                        opacity: selectedSubject && selectedCamera ? 1 : 0.5,
                        width: '100%',
                        marginTop: 8,
                        boxShadow: '0 2px 8px rgba(0,122,255,0.08)'
                    }}
                    disabled={!selectedSubject || !selectedCamera}
                    onClick={handleLoadVideo}
                >
                    Load Video
                </button>
            </div>
        </div>
    );
}

export default DataSelection;
