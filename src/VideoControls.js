import React from 'react';

function VideoControls({
    isPlaying,
    handlePlayPause,
    handleRewind,
    handleForward,
    handleSliderChange,
    currentFrameTime,
    videoDuration
}) {
    const disabled = !Number.isFinite(videoDuration) || videoDuration <= 0;
    const clampedTime = disabled ? 0 : Math.min(currentFrameTime, videoDuration);
    const formatTime = (value) => (Number.isFinite(value) ? value.toFixed(2) : '0.00');

    return (
        <div className="video-controls">
            <button onClick={handleRewind} disabled={disabled}>-5s</button>
            <button onClick={handlePlayPause} disabled={disabled}>
                {isPlaying ? 'Pause' : 'Play'}
            </button>
            <button onClick={handleForward} disabled={disabled}>+5s</button>
            <input
                type="range"
                min={0}
                max={disabled ? 1 : videoDuration}
                step={0.01}
                value={clampedTime}
                onChange={(e) => handleSliderChange(Number(e.target.value))}
                disabled={disabled}
                style={{
                    marginLeft: 12,
                    marginRight: 12,
                    width: 220,
                    verticalAlign: 'middle'
                }}
            />
            <span style={{ fontSize: 13, color: '#86868b', minWidth: 80, textAlign: 'right' }}>
                {formatTime(clampedTime)}s / {formatTime(videoDuration)}s
            </span>
        </div>
    );
}

export default VideoControls;
