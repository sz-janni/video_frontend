import React from 'react';

function DataSelection({
    selectedVideo,
    onBrowseVideo,
    onChangeVideoInput,
    handleLoadVideo,
    status,
    tracks = []
}) {
    const isLoading = status?.type === 'pending';

    return (
        <div className="data-selection-centered">
            <div className="data-selection-card">
                <h2 style={{ textAlign: 'center', marginBottom: 24 }}>Data Selection</h2>
                <div style={{ marginBottom: 24 }}>
                    <label className="data-label">
                        Video file (.mp4)
                    </label>
                    <div className="ai-tools-input-group">
                        <input
                            className="ai-tools-input"
                            placeholder="Browse to an .mp4 video"
                            value={selectedVideo}
                            onChange={(event) => onChangeVideoInput(event.target.value)}
                        />
                        <button
                            type="button"
                            className="ai-tools-browse"
                            onClick={onBrowseVideo}
                            disabled={isLoading}
                        >
                            Browse
                        </button>
                    </div>
                </div>
                {status?.text && status.type !== 'idle' && (
                    <div className={`ai-tools-status ai-tools-status--${status.type}`} style={{ width: '100%' }}>
                        {status.text}
                    </div>
                )}
                {tracks.length > 0 && (
                    <div className="track-summary" style={{ width: '100%', marginTop: 16 }}>
                        <h3 style={{ marginBottom: 12, fontSize: 15, fontWeight: 600 }}>Detected Tracks</h3>
                        <ul style={{ paddingLeft: 18, margin: 0, maxHeight: 160, overflowY: 'auto' }}>
                            {tracks.map((track) => (
                                <li key={track.id} style={{ marginBottom: 6, fontSize: 14 }}>
                                    <span style={{ fontWeight: 500 }}>{track.name}</span>
                                    <span style={{ color: '#86868b' }}>{` — ${track.startFrame}s → ${track.endFrame}s`}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                <button
                    style={{
                        padding: '12px 24px',
                        borderRadius: 12,
                        background: '#007aff',
                        color: 'white',
                        fontWeight: 500,
                        fontSize: 15,
                        border: 'none',
                        cursor: (!selectedVideo || isLoading) ? 'not-allowed' : 'pointer',
                        opacity: (!selectedVideo || isLoading) ? 0.5 : 1,
                        width: '100%',
                        marginTop: 16,
                        boxShadow: '0 2px 8px rgba(0,122,255,0.08)'
                    }}
                    disabled={!selectedVideo || isLoading}
                    onClick={handleLoadVideo}
                >
                    {isLoading ? 'Loading…' : 'Load Video'}
                </button>
            </div>
        </div>
    );
}

export default DataSelection;
