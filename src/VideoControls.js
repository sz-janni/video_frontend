import React from 'react';

function VideoControls({
    handlePlayPause,
    handleRewind,
    handleForward,
    handleSliderChange,
    currentFrameTime,
    videoDuration
}) {
    return (
        <div className="video-controls">
            <button onClick={handlePlayPause}>Play/Pause</button>
            <button onClick={handleRewind}>-5s</button>
            <button onClick={handleForward}>+5s</button>
            <input
                type="range"
                min={0}
                max={videoDuration}
                value={currentFrameTime}
                onChange={handleSliderChange}
                style={{
                    marginLeft: 12,
                    marginRight: 12,
                    width: 180,
                    verticalAlign: 'middle'
                }}
            />
            <span style={{ fontSize: 13, color: '#86868b', minWidth: 60, textAlign: 'right' }}>
                {currentFrameTime}s / {videoDuration}s
            </span>
        </div>
    );
}

export default VideoControls;
