<script>
import { onMount } from 'svelte';
import { Stage, Layer, Rect, Transformer } from 'svelte-konva';
import './App.css';

let mode = 'draw';
let selectedId = null;
let isDrawing = false;
let currentBox = null;
let transformerRef;
let layerRef;
let videoRef;
let videoContainerRef;
let videoDimensions = { width: 800, height: 450 };

let allBoxes = {}; // { frameTime: [boxes] }
let currentFrameTime = 0;

function handlePlayPause() {
    if (videoRef.paused) {
        videoRef.play();
    } else {
        videoRef.pause();
    }
}

function handleRewind() {
    videoRef.currentTime -= 5;
}

function handleForward() {
    videoRef.currentTime += 5;
}

function handleMouseDown(e) {
    e.evt.preventDefault();
    e.evt.stopPropagation();

    if (mode === 'draw') {
        const pos = e.target.getStage().getPointerPosition();
        if (e.target === e.target.getStage() || e.target === layerRef) {
            isDrawing = true;
            currentBox = {
                x: pos.x,
                y: pos.y,
                width: 0,
                height: 0,
                id: `box-${Date.now()}`,
                name: `Box ${Object.values(allBoxes).flat().length + 1}`,
                startFrame: currentFrameTime,
                endFrame: null
            };
            selectedId = null;
        }
    }
}

function handleMouseMove(e) {
    e.evt.preventDefault();
    e.evt.stopPropagation();

    if (!isDrawing || mode !== 'draw') return;

    const stage = e.target.getStage();
    const point = stage.getPointerPosition();

    currentBox = {
        ...currentBox,
        width: point.x - currentBox.x,
        height: point.y - currentBox.y
    };
}

function handleMouseUp(e) {
    e.evt.preventDefault();
    e.evt.stopPropagation();

    if (isDrawing && currentBox) {
        if (Math.abs(currentBox.width) > 5 && Math.abs(currentBox.height) > 5) {
            const normalized = {
                ...currentBox,
                x: currentBox.width < 0 ? currentBox.x + currentBox.width : currentBox.x,
                y: currentBox.height < 0 ? currentBox.y + currentBox.height : currentBox.y,
                width: Math.abs(currentBox.width),
                height: Math.abs(currentBox.height)
            };

            if (!allBoxes[currentFrameTime]) {
                allBoxes = { ...allBoxes, [currentFrameTime]: [] };
            }
            allBoxes = {
                ...allBoxes,
                [currentFrameTime]: [...(allBoxes[currentFrameTime] || []), normalized]
            };
        }
        isDrawing = false;
        currentBox = null;
    }
}

function handleBoxClick(e, box) {
    e.evt.preventDefault();
    e.evt.stopPropagation();
    e.cancelBubble = true;

    if (mode === 'delete') {
        selectedId = box.id;
    } else {
        selectedId = box.id;
    }
}

function deleteObject() {
    if (selectedId) {
        const newBoxes = { ...allBoxes };
        Object.keys(newBoxes).forEach(frame => {
            newBoxes[frame] = newBoxes[frame].filter(b => b.id !== selectedId);
        });
        allBoxes = newBoxes;
        selectedId = null;
    }
}

function deleteOnwards() {
    if (selectedId) {
        const newBoxes = { ...allBoxes };
        Object.keys(newBoxes).forEach(frame => {
            newBoxes[frame] = newBoxes[frame].map(b =>
                b.id === selectedId ? { ...b, endFrame: currentFrameTime } : b
            );
        });
        allBoxes = newBoxes;
        selectedId = null;
    }
}

function handleSave() {
    const exportData = {};
    Object.keys(allBoxes).forEach(frame => {
        exportData[frame] = allBoxes[frame].map(box => ({
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
    console.log('Saved boxes data:', exportData);
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportData));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', 'video_boxes.json');
    document.body.appendChild(link);
    link.click();
    link.remove();
}

function selectBoxFromToolbar(id) {
    selectedId = id;
    mode = 'select';
}

function getCurrentBoxes() {
    const active = [];
    const frameTimes = Object.keys(allBoxes)
        .map(Number)
        .filter(t => t <= currentFrameTime)
        .sort((a, b) => a - b);

    frameTimes.forEach(time => {
        (allBoxes[time] || []).forEach(box => {
            if (
                box.startFrame <= currentFrameTime &&
                (box.endFrame === null || currentFrameTime <= box.endFrame)
            ) {
                const idx = active.findIndex(b => b.id === box.id);
                if (idx >= 0) active[idx] = box;
                else active.push(box);
            }
        });
    });
    return active;
}

function getAllUniqueBoxes() {
    const unique = {};
    Object.values(allBoxes).flat().forEach(box => {
        if (!unique[box.id]) unique[box.id] = box;
    });
    return Object.values(unique);
}

$: boxesToRender = getCurrentBoxes();

$: if (selectedId && transformerRef && layerRef) {
    const node = layerRef.findOne(`#box-${selectedId}`);
    if (node) {
        transformerRef.nodes([node]);
        transformerRef.getLayer().batchDraw();
    }
} else if (transformerRef) {
    transformerRef.nodes([]);
    transformerRef.getLayer().batchDraw();
}

onMount(() => {
    function updateDimensions() {
        if (videoRef && videoContainerRef) {
            const container = videoContainerRef;
            videoDimensions = {
                width: container.clientWidth,
                height: container.clientHeight - 40
            };
        }
    }
    updateDimensions();
    window.addEventListener('resize', updateDimensions);

    const updateCurrentTime = () => {
        const time = Math.floor(videoRef.currentTime);
        currentFrameTime = time;
    };
    videoRef.addEventListener('timeupdate', updateCurrentTime);

    return () => {
        window.removeEventListener('resize', updateDimensions);
        videoRef.removeEventListener('timeupdate', updateCurrentTime);
    };
});
</script>

<div class="app">
    <div class="toolbar">
        <button class={mode === 'draw' ? 'active' : ''} on:click={() => { mode = 'draw'; selectedId = null; }}>
            Add Box
        </button>
        <button class={mode === 'delete' ? 'active' : ''} on:click={() => { mode = 'delete'; selectedId = null; }}>
            Delete Mode
        </button>
        <button on:click={deleteObject} disabled={!selectedId} class={!selectedId ? 'disabled' : ''}>
            Delete Object
        </button>
        <button on:click={deleteOnwards} disabled={!selectedId} class={!selectedId ? 'disabled' : ''}>
            Delete Onwards
        </button>
        <button on:click={handleSave}>Save</button>

        <div class="boxes-section">
            <h3>Objects</h3>
            <div class="frame-info">Frame: {currentFrameTime}s</div>
            <div class="boxes-list">
                {#if getAllUniqueBoxes().length === 0}
                    <div class="no-boxes">No objects created yet</div>
                {:else}
                    {#each getAllUniqueBoxes() as box}
                        <div
                            class="box-item {selectedId === box.id ? 'selected' : ''}"
                            on:click={() => selectBoxFromToolbar(box.id)}
                        >
                            <div style="font-weight:600;margin-bottom:4px">{box.name}</div>
                            <div style="font-size:11px;opacity:0.8">
                                {box.startFrame}s → {box.endFrame === null ? 'end' : `${box.endFrame}s`}
                            </div>
                        </div>
                    {/each}
                {/if}
            </div>
        </div>
    </div>

    <div class="video-container" bind:this={videoContainerRef}>
        <video bind:this={videoRef} src="/assets/sample.mp4" width={videoDimensions.width} height={videoDimensions.height} />

        <Stage
            width={videoDimensions.width}
            height={videoDimensions.height}
            on:mousedown={handleMouseDown}
            on:mousemove={handleMouseMove}
            on:mouseup={handleMouseUp}
            class="canvas-overlay"
            style="pointer-events:auto"
        >
            <Layer bind:this={layerRef}>
                {#each boxesToRender as box (box.id)}
                    <Rect
                        id={`box-${box.id}`}
                        x={box.x}
                        y={box.y}
                        width={box.width}
                        height={box.height}
                        stroke={selectedId === box.id ? '#007AFF' : '#FF3B30'}
                        strokeWidth={selectedId === box.id ? 2.5 : 2}
                        fill="transparent"
                        draggable={selectedId === box.id && mode !== 'delete'}
                        on:click={(e) => handleBoxClick(e, box)}
                        shadowColor="rgba(0,0,0,0.1)"
                        shadowBlur={selectedId === box.id ? 8 : 4}
                        shadowOpacity={selectedId === box.id ? 0.3 : 0.2}
                        shadowOffsetY={2}
                        on:dragend={(e) => {
                            const node = e.target;
                            const updated = {
                                ...box,
                                x: node.x(),
                                y: node.y()
                            };
                            const newBoxes = { ...allBoxes };
                            if (!newBoxes[currentFrameTime]) newBoxes[currentFrameTime] = [];
                            const idx = newBoxes[currentFrameTime].findIndex(b => b.id === box.id);
                            if (idx >= 0) newBoxes[currentFrameTime][idx] = updated;
                            else newBoxes[currentFrameTime].push(updated);
                            allBoxes = newBoxes;
                        }}
                        on:transformend={(e) => {
                            const node = e.target;
                            const updated = {
                                ...box,
                                x: node.x(),
                                y: node.y(),
                                width: node.width() * node.scaleX(),
                                height: node.height() * node.scaleY()
                            };
                            const newBoxes = { ...allBoxes };
                            if (!newBoxes[currentFrameTime]) newBoxes[currentFrameTime] = [];
                            const idx = newBoxes[currentFrameTime].findIndex(b => b.id === box.id);
                            if (idx >= 0) newBoxes[currentFrameTime][idx] = updated;
                            else newBoxes[currentFrameTime].push(updated);
                            allBoxes = newBoxes;
                            node.scaleX(1);
                            node.scaleY(1);
                        }}
                    />
                {/each}

                {#if currentBox}
                    <Rect
                        x={currentBox.x}
                        y={currentBox.y}
                        width={currentBox.width}
                        height={currentBox.height}
                        stroke="#007AFF"
                        strokeWidth={2}
                        fill="transparent"
                        dash={[6, 3]}
                        shadowColor="rgba(0,122,255,0.2)"
                        shadowBlur={6}
                        shadowOpacity={0.4}
                        shadowOffsetY={1}
                    />
                {/if}

                {#if selectedId && mode !== 'delete'}
                    <Transformer bind:this={transformerRef} boundBoxFunc={(oldBox, newBox) => {
                        if (newBox.width < 10 || newBox.height < 10) return oldBox;
                        return newBox;
                    }} />
                {/if}
            </Layer>
        </Stage>

        <div class="video-controls">
            <button on:click={handlePlayPause}>Play/Pause</button>
            <button on:click={handleRewind}>-5s</button>
            <button on:click={handleForward}>+5s</button>
        </div>
    </div>
</div>
