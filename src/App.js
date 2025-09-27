import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Rect, Transformer } from 'react-konva';
import VideoControls from './VideoControls';
import AITools from './AITools';
import './App.css';
import Toolbar from './Toolbar';
import DataSelection from './DataSelection';

const transformModelAnnotations = (frames = {}) => {
    const formatted = {};
    Object.entries(frames).forEach(([frameKey, frameBoxes]) => {
        const frameTime = Number(frameKey);
        if (Number.isNaN(frameTime) || !Array.isArray(frameBoxes)) {
            return;
        }
        formatted[frameTime] = frameBoxes.map((box, index) => {
            const rawEnd = box.endFrame;
            const endFrame = rawEnd === undefined || rawEnd === null ? null : Number(rawEnd);
            return {
                id: box.id || `model-${frameTime}-${index}`,
                name: box.class ? `${box.class}${box.id ? ` (${box.id})` : ''}` : (box.id || `Box ${index + 1}`),
                x: box.x,
                y: box.y,
                width: box.width,
                height: box.height,
                startFrame: box.startFrame !== undefined ? Number(box.startFrame) : frameTime,
                endFrame
            };
        });
    });
    return formatted;
};

function App() {
    const [mode, setMode] = useState('add');
    const [boxes, setBoxes] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentBox, setCurrentBox] = useState(null);
    const transformerRef = useRef();
    const layerRef = useRef();
    const videoRef = useRef();
    const [videoDimensions, setVideoDimensions] = useState({ width: 800, height: 450 });
    const videoContainerRef = useRef();

    // New state for frame-specific boxes
    const [allBoxes, setAllBoxes] = useState({}); // Format: { frameTime: [boxes] }
    const [currentFrameTime, setCurrentFrameTime] = useState(0);

    // Add tab state
    const [activeTab, setActiveTab] = useState('annotation');

    // Data selection state
    const [selectedVideo, setSelectedVideo] = useState('');
    const [dataSelectionStatus, setDataSelectionStatus] = useState({ type: 'idle', text: '' });
    const [videoLoaded, setVideoLoaded] = useState(false);
    const [videoDuration, setVideoDuration] = useState(0);
    const [videoSource, setVideoSource] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);

    const handleVideoInputChange = (value) => {
        setSelectedVideo(value);
        setDataSelectionStatus({ type: 'idle', text: '' });
    };

    const browseForVideo = async () => {
        setDataSelectionStatus({ type: 'idle', text: '' });
        if (!(typeof window !== 'undefined' && window.require)) {
            setDataSelectionStatus({ type: 'error', text: 'Video browsing requires the desktop application.' });
            return;
        }
        try {
            const electron = window.require('electron');
            const dialog = electron?.remote?.dialog || electron?.dialog;
            const filters = [{ name: 'MP4 video', extensions: ['mp4'] }];
            if (dialog?.showOpenDialog) {
                const result = await dialog.showOpenDialog({
                    title: 'Select video',
                    properties: ['openFile'],
                    filters
                });
                if (!result?.canceled && result?.filePaths?.length) {
                    setSelectedVideo(result.filePaths[0]);
                }
                return;
            }
            if (electron?.ipcRenderer?.invoke) {
                const response = await electron.ipcRenderer.invoke('select-video-file', { filters });
                const filePath = typeof response === 'string'
                    ? response
                    : response?.filePaths?.[0];
                if (filePath) {
                    setSelectedVideo(filePath);
                    return;
                }
            }
            setDataSelectionStatus({ type: 'error', text: 'Video picker unavailable. Enter the path manually.' });
        } catch (error) {
            console.error('Video picker error', error);
            setDataSelectionStatus({ type: 'error', text: error.message || 'Unable to open video picker.' });
        }
    };

    const resolveVideoSource = (filePath) => {
        if (!filePath) return '';
        try {
            if (typeof window !== 'undefined' && window.require) {
                const { pathToFileURL } = window.require('url');
                if (typeof pathToFileURL === 'function') {
                    return pathToFileURL(filePath).href;
                }
            }
        } catch (error) {
            console.warn('Unable to convert path to file URL', error);
        }
        const normalized = filePath.replace(/\\/g, '/');
        return normalized.startsWith('file://')
            ? normalized
            : `file://${normalized.startsWith('/') ? normalized : `/${normalized}`}`;
    };

    // Handle video load button
    const handleLoadVideo = async () => {
        const videoPath = selectedVideo.trim();
        if (!videoPath) {
            setDataSelectionStatus({ type: 'error', text: 'Select a video first.' });
            return;
        }
        if (!(typeof window !== 'undefined' && window.require)) {
            setDataSelectionStatus({ type: 'error', text: 'Local file access requires the desktop application.' });
            return;
        }

        const fs = window.require('fs');
        const pathModule = window.require('path');

        if (!fs?.existsSync || !pathModule) {
            setDataSelectionStatus({ type: 'error', text: 'File system bridge unavailable in this environment.' });
            return;
        }
        if (!fs.existsSync(videoPath)) {
            setDataSelectionStatus({ type: 'error', text: 'Selected video not found on disk.' });
            return;
        }

        setDataSelectionStatus({ type: 'pending', text: 'Loading video and annotations…' });
        if (videoRef.current) {
            videoRef.current.pause();
        }
        setVideoLoaded(false);
        setIsPlaying(false);
        setVideoSource(null);
        setAllBoxes({});
        setSelectedId(null);
        setCurrentFrameTime(0);

        const jsonPath = pathModule.join(
            pathModule.dirname(videoPath),
            `${pathModule.basename(videoPath, pathModule.extname(videoPath))}.json`
        );

        let annotationsLoaded = false;
        let framesPayload = {};

        if (fs.promises) {
            try {
                const rawJson = await fs.promises.readFile(jsonPath, 'utf8');
                const parsed = JSON.parse(rawJson);
                const frames = parsed?.frames && typeof parsed.frames === 'object' ? parsed.frames : parsed;
                if (frames && typeof frames === 'object') {
                    framesPayload = frames;
                    annotationsLoaded = Object.keys(framesPayload).length > 0;
                }
            } catch (error) {
                if (error.code !== 'ENOENT') {
                    console.error('Unable to load annotation JSON', error);
                    setVideoSource(resolveVideoSource(videoPath));
                    setActiveTab('annotation');
                    setDataSelectionStatus({ type: 'error', text: error.message || 'Failed to load annotations.' });
                    return;
                }
            }
        }

        setAllBoxes(annotationsLoaded ? transformModelAnnotations(framesPayload) : {});
        setVideoSource(resolveVideoSource(videoPath));
        setActiveTab('annotation');
        setDataSelectionStatus({
            type: 'success',
            text: annotationsLoaded ? 'Video and annotations loaded.' : 'Video loaded without annotations.'
        });
    };

    // Handle video controls separately
    const handlePlayPause = () => {
        const video = videoRef.current;
        if (!video) return;
        if (video.paused) {
            video.play();
        } else {
            video.pause();
        }
    };

    const handleRewind = () => {
        const video = videoRef.current;
        if (!video) return;
        video.currentTime = Math.max(0, video.currentTime - 5);
    };

    const handleForward = () => {
        const video = videoRef.current;
        if (!video) return;
        const duration = Number.isFinite(video.duration) ? video.duration : video.currentTime;
        video.currentTime = Math.min(duration, video.currentTime + 5);
    };

    // Mouse event handlers for the canvas
    const handleMouseDown = (e) => {
        e.evt.preventDefault();
        e.evt.stopPropagation();

        if (mode === 'add') {
            const pos = e.target.getStage().getPointerPosition();
            // Only start drawing if clicking on empty canvas
            if (e.target === e.target.getStage() || e.target === layerRef.current) {
                const uniqueCount = new Set(Object.values(allBoxes).flat().map(b => b.id)).size;
                setIsDrawing(true);
                setCurrentBox({
                    x: pos.x,
                    y: pos.y,
                    width: 0,
                    height: 0,
                    id: `box-${Date.now()}`,
                    name: `Box ${uniqueCount + 1}`,
                    startFrame: Math.floor(currentFrameTime),
                    endFrame: null
                });
                setSelectedId(null);
            }
        } else if (mode === 'edit' && (e.target === e.target.getStage() || e.target === layerRef.current)) {
            setSelectedId(null);
        }
    };

    const handleMouseMove = (e) => {
        if (!isDrawing || mode !== 'add') return;
        e.evt.preventDefault();
        e.evt.stopPropagation();

        const stage = e.target.getStage();
        const point = stage.getPointerPosition();

        setCurrentBox(prev => ({
            ...prev,
            width: point.x - prev.x,
            height: point.y - prev.y
        }));
    };

    const handleMouseUp = (e) => {
        if (!isDrawing || mode !== 'add' || !currentBox) {
            setIsDrawing(false);
            setCurrentBox(null);
            return;
        }
        e.evt.preventDefault();
        e.evt.stopPropagation();

        if (Math.abs(currentBox.width) > 5 && Math.abs(currentBox.height) > 5) {
            const normalizedBox = {
                ...currentBox,
                x: currentBox.width < 0 ? currentBox.x + currentBox.width : currentBox.x,
                y: currentBox.height < 0 ? currentBox.y + currentBox.height : currentBox.y,
                width: Math.abs(currentBox.width),
                height: Math.abs(currentBox.height)
            };

            setAllBoxes(prev => {
                const newBoxes = { ...prev };
                const frameKey = Math.floor(currentFrameTime);
                if (!newBoxes[frameKey]) {
                    newBoxes[frameKey] = [];
                }
                newBoxes[frameKey] = [...newBoxes[frameKey], normalizedBox];
                return newBoxes;
            });
            setSelectedId(normalizedBox.id);
        }

        setIsDrawing(false);
        setCurrentBox(null);
    };

    const handleBoxPointerDown = (e, box) => {
        e.evt.preventDefault();
        e.evt.stopPropagation();
        e.cancelBubble = true;

        if (mode === 'delete') {
            setSelectedId(box.id);
        } else if (mode === 'edit') {
            setSelectedId(box.id);
        }
    };

    // New function to delete the object completely
    const deleteObject = () => {
        if (selectedId) {
            // Delete the box from all frames
            setAllBoxes(prev => {
                const newBoxes = { ...prev };
                Object.keys(newBoxes).forEach(frameTime => {
                    newBoxes[frameTime] = newBoxes[frameTime].filter(b => b.id !== selectedId);
                });
                return newBoxes;
            });
            setSelectedId(null);
        }
    };

    // New function to set end frame (delete onwards)
    const deleteOnwards = () => {
        if (!selectedId) return;
        let targetBox = null;
        Object.values(allBoxes).flat().forEach(box => {
            if (box.id === selectedId) {
                targetBox = box;
            }
        });

        if (targetBox) {
            const endAt = Math.floor(currentFrameTime);
            setAllBoxes(prev => {
                const newBoxes = { ...prev };
                Object.keys(newBoxes).forEach(frameTime => {
                    newBoxes[frameTime] = newBoxes[frameTime].map(box =>
                        box.id === selectedId ? { ...box, endFrame: endAt } : box
                    );
                });
                return newBoxes;
            });
        }
        setSelectedId(null);
    };

    // Replace the old deleteSelected function
    const deleteSelected = () => {
        // This is now a placeholder - we use the specific delete functions
        console.log("Please use Delete Object or Delete Onwards buttons");
    };

    // Update transformer when selection changes
    useEffect(() => {
        if (selectedId && transformerRef.current) {
            const selectedNode = layerRef.current.findOne(`#box-${selectedId}`);
            if (selectedNode) {
                transformerRef.current.nodes([selectedNode]);
                transformerRef.current.getLayer().batchDraw();
            }
        } else if (transformerRef.current) {
            transformerRef.current.nodes([]);
            transformerRef.current.getLayer().batchDraw();
        }
    }, [selectedId]);

    // Set up video dimensions and ensure canvas matches
    useEffect(() => {
        const updateDimensions = () => {
            if (videoRef.current && videoContainerRef.current) {
                const container = videoContainerRef.current;
                setVideoDimensions({
                    width: container.clientWidth,
                    height: container.clientHeight - 40 // Account for controls
                });
            }
        };

        updateDimensions();
        window.addEventListener('resize', updateDimensions);

        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    // Update current frame time when video plays
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const updateCurrentTime = () => {
            setCurrentFrameTime(Number(video.currentTime.toFixed(2)));
        };

        video.addEventListener('timeupdate', updateCurrentTime);
        return () => video.removeEventListener('timeupdate', updateCurrentTime);
    }, [videoSource]);

    // Update video duration on load
    useEffect(() => {
        const video = videoRef.current;
        if (!video || !videoSource) return;

        const handleLoadedMetadata = () => {
            setVideoDuration(Number(video.duration.toFixed(2)));
            setVideoLoaded(true);
        };

        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        if (video.readyState >= 1) {
            handleLoadedMetadata();
        }
        return () => video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    }, [videoSource]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video || !videoSource) return;

        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);
        const handleEnded = () => setIsPlaying(false);

        video.addEventListener('play', handlePlay);
        video.addEventListener('pause', handlePause);
        video.addEventListener('ended', handleEnded);

        return () => {
            video.removeEventListener('play', handlePlay);
            video.removeEventListener('pause', handlePause);
            video.removeEventListener('ended', handleEnded);
        };
    }, [videoSource]);

    const handleSliderChange = (value) => {
        const video = videoRef.current;
        if (!video) return;
        video.currentTime = value;
        setCurrentFrameTime(value);
    };

    const getCurrentBoxes = (currentSecond) => {
        const activeBoxes = [];
        const frameTimes = Object.keys(allBoxes)
            .map(Number)
            .filter(time => time <= currentSecond)
            .sort((a, b) => a - b);

        // Add boxes from each frame up to current
        frameTimes.forEach(time => {
            allBoxes[time].forEach(box => {
                // Check if the box is active in the current frame
                // (after its start frame and before or at its end frame, if set)
                if (
                    box.startFrame <= currentSecond &&
                    (box.endFrame === null || currentSecond <= box.endFrame)
                ) {
                    // If this box ID is already in activeBoxes, update it
                    const existingIndex = activeBoxes.findIndex(b => b.id === box.id);
                    if (existingIndex >= 0) {
                        activeBoxes[existingIndex] = box;
                    } else {
                        activeBoxes.push(box);
                    }
                }
            });
        });

        return activeBoxes;
    };

    // Get all unique boxes across all frames
    const getAllUniqueBoxes = () => {
        const uniqueBoxes = {};
        Object.values(allBoxes).flat().forEach(box => {
            if (!uniqueBoxes[box.id]) {
                uniqueBoxes[box.id] = box;
            }
        });
        return Object.values(uniqueBoxes);
    };

    const selectBoxFromToolbar = (boxId) => {
        if (mode !== 'edit') return;
        setSelectedId(boxId);
    };

    // Add the missing handleSave function
    const handleSave = () => {
        // Format the data for export
        const exportData = {};

        // Process each frame's boxes
        Object.keys(allBoxes).forEach(frameTime => {
            exportData[frameTime] = allBoxes[frameTime].map(box => ({
                id: box.id,
                name: box.name,
                x: box.x,
                y: box.y,
                width: box.width,
                height: box.height,
                startFrame: box.startFrame,
                endFrame: box.endFrame
            }));
        });

        // Log to console
        console.log('Saved boxes data:', exportData);

        // Optional: Create downloadable JSON
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "video_boxes.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    // Current boxes for rendering in the canvas
    const currentFrameSecond = Math.floor(currentFrameTime);
    const boxesToRender = getCurrentBoxes(currentFrameSecond);

    return (
        <div className="app">
            {/* Tabs navigation */}
            <div className="tab-nav">
                <button
                    className={`tab-button${activeTab === 'ai' ? ' active' : ''}`}
                    onClick={() => setActiveTab('ai')}
                >
                    AI Tools
                </button>
                <button
                    className={`tab-button${activeTab === 'data' ? ' active' : ''}`}
                    onClick={() => setActiveTab('data')}
                >
                    Data Selection
                </button>
                <button
                    className={`tab-button${activeTab === 'annotation' ? ' active' : ''}`}
                    onClick={() => setActiveTab('annotation')}
                >
                    Annotation
                </button>
            </div>
            <div className="tab-content">
                {activeTab === 'ai' ? (
                    <AITools />
                ) : activeTab === 'data' ? (
                    <DataSelection
                        selectedVideo={selectedVideo}
                        onBrowseVideo={browseForVideo}
                        onChangeVideoInput={handleVideoInputChange}
                        handleLoadVideo={handleLoadVideo}
                        status={dataSelectionStatus}
                    />
                ) : (
                    <div style={{ display: 'flex', height: '100%' }}>
                        <Toolbar
                            mode={mode}
                            setMode={setMode}
                            setSelectedId={setSelectedId}
                            selectedId={selectedId}
                            deleteObject={deleteObject}
                            deleteOnwards={deleteOnwards}
                            handleSave={handleSave}
                            getAllUniqueBoxes={getAllUniqueBoxes}
                            selectBoxFromToolbar={selectBoxFromToolbar}
                            currentFrameTime={currentFrameSecond}
                        />
                        <div className="video-container" ref={videoContainerRef}>
                            {!videoSource ? (
                                <div style={{ textAlign: 'center', color: '#86868b', padding: '40px' }}>
                                    Load a video to start annotating.
                                </div>
                            ) : (
                                <>
                                    <video
                                        ref={videoRef}
                                        src={videoSource}
                                        width={videoDimensions.width}
                                        height={videoDimensions.height}
                                    />
                                    {videoLoaded ? (
                                        <>
                                            <Stage
                                                width={videoDimensions.width}
                                                height={videoDimensions.height}
                                                onMouseDown={handleMouseDown}
                                                onMouseMove={handleMouseMove}
                                                onMouseUp={handleMouseUp}
                                                className="canvas-overlay"
                                                style={{ pointerEvents: 'auto' }}
                                            >
                                                <Layer ref={layerRef}>
                                                    {boxesToRender.map(box => (
                                                        <Rect
                                                            key={box.id}
                                                            id={`box-${box.id}`}
                                                            x={box.x}
                                                            y={box.y}
                                                            width={box.width}
                                                            height={box.height}
                                                            stroke={selectedId === box.id ? '#007AFF' : '#FF3B30'}
                                                            strokeWidth={selectedId === box.id ? 2.5 : 2}
                                                            fill="transparent"
                                                            draggable={mode === 'edit'}
                                                            onMouseDown={(e) => handleBoxPointerDown(e, box)}
                                                            onTouchStart={(e) => handleBoxPointerDown(e, box)}
                                                            shadowColor="rgba(0, 0, 0, 0.1)"
                                                            shadowBlur={selectedId === box.id ? 8 : 4}
                                                            shadowOpacity={selectedId === box.id ? 0.3 : 0.2}
                                                            shadowOffsetY={2}
                                                            onDragEnd={(e) => {
                                                                const node = e.target;
                                                                setAllBoxes(prev => {
                                                                    const newBoxes = { ...prev };
                                                                    const frameKey = currentFrameSecond;
                                                                    if (!newBoxes[frameKey]) {
                                                                        newBoxes[frameKey] = [];
                                                                    }
                                                                    const updatedBox = {
                                                                        ...box,
                                                                        x: node.x(),
                                                                        y: node.y()
                                                                    };
                                                                    const boxIndex = newBoxes[frameKey].findIndex(b => b.id === box.id);
                                                                    if (boxIndex >= 0) {
                                                                        newBoxes[frameKey][boxIndex] = updatedBox;
                                                                    } else {
                                                                        newBoxes[frameKey].push(updatedBox);
                                                                    }
                                                                    return newBoxes;
                                                                });
                                                            }}
                                                            onTransformEnd={(e) => {
                                                                const node = e.target;
                                                                setAllBoxes(prev => {
                                                                    const newBoxes = { ...prev };
                                                                    const frameKey = currentFrameSecond;
                                                                    if (!newBoxes[frameKey]) {
                                                                        newBoxes[frameKey] = [];
                                                                    }
                                                                    const updatedBox = {
                                                                        ...box,
                                                                        x: node.x(),
                                                                        y: node.y(),
                                                                        width: node.width() * node.scaleX(),
                                                                        height: node.height() * node.scaleY()
                                                                    };
                                                                    const boxIndex = newBoxes[frameKey].findIndex(b => b.id === box.id);
                                                                    if (boxIndex >= 0) {
                                                                        newBoxes[frameKey][boxIndex] = updatedBox;
                                                                    } else {
                                                                        newBoxes[frameKey].push(updatedBox);
                                                                    }
                                                                    return newBoxes;
                                                                });
                                                                node.scaleX(1);
                                                                node.scaleY(1);
                                                            }}
                                                        />
                                                    ))}

                                                    {currentBox && (
                                                        <Rect
                                                            x={currentBox.x}
                                                            y={currentBox.y}
                                                            width={currentBox.width}
                                                            height={currentBox.height}
                                                            stroke="#007AFF"
                                                            strokeWidth={2}
                                                            fill="transparent"
                                                            dash={[6, 3]}
                                                            shadowColor="rgba(0, 122, 255, 0.2)"
                                                            shadowBlur={6}
                                                            shadowOpacity={0.4}
                                                            shadowOffsetY={1}
                                                        />
                                                    )}

                                                    {selectedId && mode !== 'delete' && (
                                                        <Transformer
                                                            ref={transformerRef}
                                                            boundBoxFunc={(oldBox, newBox) => {
                                                                if (newBox.width < 10 || newBox.height < 10) {
                                                                    return oldBox;
                                                                }
                                                                return newBox;
                                                            }}
                                                        />
                                                    )}
                                                </Layer>
                                            </Stage>

                                            <VideoControls
                                                isPlaying={isPlaying}
                                                handlePlayPause={handlePlayPause}
                                                handleRewind={handleRewind}
                                                handleForward={handleForward}
                                                handleSliderChange={handleSliderChange}
                                                currentFrameTime={currentFrameTime}
                                                videoDuration={videoDuration}
                                            />
                                        </>
                                    ) : (
                                        <div style={{ position: 'absolute', bottom: 40, color: '#86868b', background: 'rgba(255,255,255,0.9)', padding: '8px 16px', borderRadius: '12px' }}>
                                            Loading video...
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default App;
