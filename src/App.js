import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Rect, Transformer } from 'react-konva';
import './App.css';

function App() {
    const [mode, setMode] = useState('draw');
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

    // Handle video controls separately
    const handlePlayPause = () => {
        if (videoRef.current.paused) {
            videoRef.current.play();
        } else {
            videoRef.current.pause();
        }
    };

    const handleRewind = () => {
        videoRef.current.currentTime -= 5;
    };

    const handleForward = () => {
        videoRef.current.currentTime += 5;
    };

    // Mouse event handlers for the canvas
    const handleMouseDown = (e) => {
        // Prevent click from reaching video
        e.evt.preventDefault();
        e.evt.stopPropagation();

        if (mode === 'draw') {
            const pos = e.target.getStage().getPointerPosition();
            // Only start drawing if clicking on empty canvas
            if (e.target === e.target.getStage() || e.target === layerRef.current) {
                setIsDrawing(true);
                setCurrentBox({
                    x: pos.x,
                    y: pos.y,
                    width: 0,
                    height: 0,
                    id: `box-${Date.now()}`,
                    name: `Box ${Object.values(allBoxes).flat().length + 1}`,
                    startFrame: currentFrameTime,
                    endFrame: null // null means visible until the end of the video
                });
                setSelectedId(null);
            }
        }
    };

    const handleMouseMove = (e) => {
        // Prevent interaction with video during drawing
        e.evt.preventDefault();
        e.evt.stopPropagation();

        if (!isDrawing || mode !== 'draw') return;

        const stage = e.target.getStage();
        const point = stage.getPointerPosition();

        setCurrentBox(prev => ({
            ...prev,
            width: point.x - prev.x,
            height: point.y - prev.y
        }));
    };

    const handleMouseUp = (e) => {
        // Prevent interaction with video
        e.evt.preventDefault();
        e.evt.stopPropagation();

        if (isDrawing && currentBox) {
            if (Math.abs(currentBox.width) > 5 && Math.abs(currentBox.height) > 5) {
                // Ensure positive width/height by normalizing coordinates
                const normalizedBox = {
                    ...currentBox,
                    x: currentBox.width < 0 ? currentBox.x + currentBox.width : currentBox.x,
                    y: currentBox.height < 0 ? currentBox.y + currentBox.height : currentBox.y,
                    width: Math.abs(currentBox.width),
                    height: Math.abs(currentBox.height)
                };

                // Add box to the frame-specific collection
                setAllBoxes(prev => {
                    const newBoxes = { ...prev };
                    if (!newBoxes[currentFrameTime]) {
                        newBoxes[currentFrameTime] = [];
                    }
                    newBoxes[currentFrameTime] = [...newBoxes[currentFrameTime], normalizedBox];
                    return newBoxes;
                });
            }
            setIsDrawing(false);
            setCurrentBox(null);
        }
    };

    const handleBoxClick = (e, box) => {
        // Prevent video interaction
        e.evt.preventDefault();
        e.evt.stopPropagation();
        e.cancelBubble = true;

        if (mode === 'delete') {
            // In delete mode, just select the box for later deletion
            setSelectedId(box.id);
        } else {
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
        if (selectedId) {
            // Find the box across all frames
            let targetBox = null;
            Object.values(allBoxes).flat().forEach(box => {
                if (box.id === selectedId) {
                    targetBox = box;
                }
            });

            if (targetBox) {
                // Set the end frame for this box to the current frame
                setAllBoxes(prev => {
                    const newBoxes = { ...prev };
                    // For all frames containing this box, update its endFrame
                    Object.keys(newBoxes).forEach(frameTime => {
                        newBoxes[frameTime] = newBoxes[frameTime].map(box =>
                            box.id === selectedId
                                ? { ...box, endFrame: currentFrameTime }
                                : box
                        );
                    });
                    return newBoxes;
                });
            }
            setSelectedId(null);
        }
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
            // Round to nearest second for simplicity
            const timeInSeconds = Math.floor(video.currentTime);
            setCurrentFrameTime(timeInSeconds);
        };

        video.addEventListener('timeupdate', updateCurrentTime);
        return () => video.removeEventListener('timeupdate', updateCurrentTime);
    }, []);

    // Get boxes for the current frame - update to respect start and end frames
    const getCurrentBoxes = () => {
        // Collect all boxes from the start of the video up to the current frame
        const activeBoxes = [];
        const frameTimes = Object.keys(allBoxes)
            .map(Number)
            .filter(time => time <= currentFrameTime)
            .sort((a, b) => a - b);

        // Add boxes from each frame up to current
        frameTimes.forEach(time => {
            allBoxes[time].forEach(box => {
                // Check if the box is active in the current frame
                // (after its start frame and before or at its end frame, if set)
                if (
                    box.startFrame <= currentFrameTime &&
                    (box.endFrame === null || currentFrameTime <= box.endFrame)
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
        setSelectedId(boxId);
        setMode('select');
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
    const boxesToRender = getCurrentBoxes();

    return (
        <div className="app">
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

                {/* Replace the old delete button with two specific delete buttons */}
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

                {/* Boxes section in toolbar with lifecycle info */}
                <div className="boxes-section">
                    <h3>Objects</h3>
                    <div className="frame-info">Frame: {currentFrameTime}s</div>
                    <div className="boxes-list">
                        {getAllUniqueBoxes().length === 0 ? (
                            <div className="no-boxes">No objects created yet</div>
                        ) : (
                            getAllUniqueBoxes().map(box => (
                                <div
                                    key={box.id}
                                    className={`box-item ${selectedId === box.id ? 'selected' : ''}`}
                                    onClick={() => selectBoxFromToolbar(box.id)}
                                >
                                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                                        {box.name}
                                    </div>
                                    <div style={{ fontSize: '11px', opacity: '0.8' }}>
                                        {box.startFrame}s → {box.endFrame === null ? 'end' : `${box.endFrame}s`}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <div className="video-container" ref={videoContainerRef}>
                {/* Video without controls - we'll make our own */}
                <video
                    ref={videoRef}
                    src="/assets/sample.mp4"
                    width={videoDimensions.width}
                    height={videoDimensions.height}
                />

                {/* Konva canvas overlay */}
                <Stage
                    width={videoDimensions.width}
                    height={videoDimensions.height}
                    onMouseDown={handleMouseDown}
                    onMousemove={handleMouseMove}
                    onMouseup={handleMouseUp}
                    className="canvas-overlay"
                    style={{ pointerEvents: 'auto' }} // Ensure we can interact with the canvas
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
                                draggable={selectedId === box.id && mode !== 'delete'}
                                onClick={(e) => handleBoxClick(e, box)}
                                shadowColor="rgba(0, 0, 0, 0.1)"
                                shadowBlur={selectedId === box.id ? 8 : 4}
                                shadowOpacity={selectedId === box.id ? 0.3 : 0.2}
                                shadowOffsetY={2}
                                onDragEnd={(e) => {
                                    const node = e.target;
                                    // Update this box in the current frame
                                    setAllBoxes(prev => {
                                        const newBoxes = { ...prev };
                                        if (!newBoxes[currentFrameTime]) {
                                            newBoxes[currentFrameTime] = [];
                                        }

                                        // Update or add the box for this frame
                                        const updatedBox = {
                                            ...box,
                                            x: node.x(),
                                            y: node.y()
                                        };

                                        const boxIndex = newBoxes[currentFrameTime].findIndex(b => b.id === box.id);
                                        if (boxIndex >= 0) {
                                            newBoxes[currentFrameTime][boxIndex] = updatedBox;
                                        } else {
                                            newBoxes[currentFrameTime].push(updatedBox);
                                        }

                                        return newBoxes;
                                    });
                                }}
                                onTransformEnd={(e) => {
                                    const node = e.target;

                                    // Update this box in the current frame
                                    setAllBoxes(prev => {
                                        const newBoxes = { ...prev };
                                        if (!newBoxes[currentFrameTime]) {
                                            newBoxes[currentFrameTime] = [];
                                        }

                                        // Update or add the box for this frame
                                        const updatedBox = {
                                            ...box,
                                            x: node.x(),
                                            y: node.y(),
                                            width: node.width() * node.scaleX(),
                                            height: node.height() * node.scaleY()
                                        };

                                        const boxIndex = newBoxes[currentFrameTime].findIndex(b => b.id === box.id);
                                        if (boxIndex >= 0) {
                                            newBoxes[currentFrameTime][boxIndex] = updatedBox;
                                        } else {
                                            newBoxes[currentFrameTime].push(updatedBox);
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

                {/* Custom video controls */}
                <div className="video-controls">
                    <button onClick={handlePlayPause}>Play/Pause</button>
                    <button onClick={handleRewind}>-5s</button>
                    <button onClick={handleForward}>+5s</button>
                </div>
            </div>
        </div>
    );
}

export default App;
