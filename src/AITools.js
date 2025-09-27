import { useEffect, useMemo, useState } from 'react';
import Select from 'react-select';

const ENVIRONMENTS = ['research', 'prod', 'dev005'];
const PIPELINES = ['head detection', 'eye detection'];
const OUTPUTS = ['video', 'annotations', 'video + annotations'];
const VIDEO_MASKING = ['pixellation', 'blur', 'blackout'];
const REDACTION_LEVELS = ['low', 'medium', 'high'];

const formatOptions = (items) => items.map(item => ({ value: item, label: item }));

function AITools({ }) {
    const [inputFolder, setInputFolder] = useState('');
    const [outputFolder, setOutputFolder] = useState('');
    const [environment, setEnvironment] = useState(ENVIRONMENTS[0]);
    const [pipeline, setPipeline] = useState(PIPELINES[0]);
    const [outputType, setOutputType] = useState(OUTPUTS[0]);
    const [videoMasking, setVideoMasking] = useState(VIDEO_MASKING[0]);
    const [redactionLevel, setRedactionLevel] = useState(REDACTION_LEVELS[0]);
    const [inputStats, setInputStats] = useState({ videos: 0, annotations: 0, error: null, loading: false });
    const [status, setStatus] = useState({ type: 'idle', message: '' });
    const [isRunning, setIsRunning] = useState(false);

    const environmentOptions = useMemo(() => formatOptions(ENVIRONMENTS), []);
    const pipelineOptions = useMemo(() => formatOptions(PIPELINES), []);
    const outputOptions = useMemo(() => formatOptions(OUTPUTS), []);
    const maskOptions = useMemo(() => formatOptions(VIDEO_MASKING), []);
    const redactionOptions = useMemo(() => formatOptions(REDACTION_LEVELS), []);

    useEffect(() => {
        let isMounted = true;
        const fetchStats = async () => {
            const trimmed = inputFolder.trim();
            if (!trimmed) {
                if (isMounted) {
                    setInputStats({ videos: 0, annotations: 0, error: null, loading: false });
                }
                return;
            }

            const getFolderStats = window.electronAPI?.getFolderStats;
            if (!getFolderStats) {
                if (isMounted) {
                    setInputStats({
                        videos: 0,
                        annotations: 0,
                        error: 'Folder statistics unavailable in this environment.',
                        loading: false
                    });
                }
                return;
            }

            if (isMounted) {
                setInputStats(prev => ({ ...prev, loading: true, error: null }));
            }

            try {
                const response = await getFolderStats(trimmed);
                if (!isMounted) return;

                if (!response?.ok) {
                    setInputStats({
                        videos: 0,
                        annotations: 0,
                        error: response?.error || 'Unable to read input folder.',
                        loading: false
                    });
                    return;
                }

                setInputStats({
                    videos: response.videos ?? 0,
                    annotations: response.annotations ?? 0,
                    error: null,
                    loading: false
                });
            } catch (error) {
                if (isMounted) {
                    setInputStats({
                        videos: 0,
                        annotations: 0,
                        error: error.message || 'Unable to read input folder.',
                        loading: false
                    });
                }
            }
        };

        fetchStats();
        return () => {
            isMounted = false;
        };
    }, [inputFolder]);

    const handleRunClick = async () => {
        const trimmedInput = inputFolder.trim();
        const trimmedOutput = outputFolder.trim();

        if (!trimmedInput || !trimmedOutput) {
            setStatus({ type: 'error', message: 'Please provide both input and output folders.' });
            return;
        }

        const runAIPipeline = window.electronAPI?.runAIPipeline;
        if (!runAIPipeline) {
            setStatus({ type: 'error', message: 'AI execution unavailable in this environment.' });
            return;
        }

        setIsRunning(true);
        setStatus({ type: 'pending', message: 'Opening PowerShell…' });

        try {
            const response = await runAIPipeline({
                inputFolder: trimmedInput,
                outputFolder: trimmedOutput,
                environment,
                pipeline,
                outputType,
                videoMasking,
                redactionLevel
            });

            if (!response?.ok) {
                throw new Error(response?.error || 'Unable to start PowerShell.');
            }

            setStatus({
                type: 'success',
                message: 'Aquarius runner launched.'
            });
        } catch (error) {
            setStatus({
                type: 'error',
                message: error.message || 'Failed to launch Aquarius runner.'
            });
        } finally {
            setIsRunning(false);
        }
    };

    const resetStatus = () => {
        setStatus(prev => (prev.type === 'idle' ? prev : { type: 'idle', message: '' }));
    };

    const browseForFolder = async (setter, label) => {
        resetStatus();
        const openFileDialog = window.electronAPI?.openFileDialog;
        if (!openFileDialog) {
            setStatus({ type: 'error', message: 'Desktop integration unavailable.' });
            return;
        }
        try {
            const result = await openFileDialog({
                title: label,
                properties: ['openDirectory', 'createDirectory']
            });
            if (!result?.canceled && result?.filePaths?.length) {
                setter(result.filePaths[0]);
            }
        } catch (error) {
            console.error('Directory picker error', error);
            setStatus({ type: 'error', message: error.message || 'Unable to open directory picker.' });
        }
    };

    const openDialog = async (options, onSuccess) => {
        const openFileDialog = window.electronAPI?.openFileDialog;
        if (!openFileDialog) {
            setStatus({ type: 'error', message: 'Desktop integration unavailable.' });
            return;
        }
        try {
            const result = await openFileDialog(options);
            if (!result?.canceled && result?.filePaths?.length) {
                onSuccess(result.filePaths[0]);
            }
        } catch (error) {
            console.error('AI Tools browse error', error);
            setStatus({ type: 'error', message: error.message || 'Unable to open file picker.' });
        }
    };

    const isRunDisabled = isRunning || !inputFolder.trim() || !outputFolder.trim();

    return (
        <div className="ai-tools">
            <div className="ai-tools-card">
                <div className="ai-tools-card-header">
                    <h3>Data Paths</h3>
                    <p>Specify the folders used for this run.</p>
                </div>
                <div className="ai-tools-grid">
                    <label className="ai-tools-field">
                        <span className="ai-tools-label">Input folder</span>
                        <div className="ai-tools-input-group">
                            <input
                                className="ai-tools-input"
                                placeholder="e.g. C:\projects\video-input"
                                value={inputFolder}
                                onChange={(event) => {
                                    setInputFolder(event.target.value);
                                    resetStatus();
                                }}
                            />
                            <button
                                type="button"
                                className="ai-tools-browse"
                                onClick={() => browseForFolder(setInputFolder, 'Select input folder')}
                                disabled={isRunning}
                            >
                                Browse
                            </button>
                        </div>
                    </label>
                    <label className="ai-tools-field">
                        <span className="ai-tools-label">Output folder</span>
                        <div className="ai-tools-input-group">
                            <input
                                className="ai-tools-input"
                                placeholder="e.g. C:\projects\video-output"
                                value={outputFolder}
                                onChange={(event) => {
                                    setOutputFolder(event.target.value);
                                    resetStatus();
                                }}
                            />
                            <button
                                type="button"
                                className="ai-tools-browse"
                                onClick={() => browseForFolder(setOutputFolder, 'Select output folder')}
                                disabled={isRunning}
                            >
                                Browse
                            </button>
                        </div>
                    </label>
                </div>
                <div className="ai-tools-stats">
                    {inputStats.loading ? (
                        <span className="ai-tools-pill ai-tools-pill--info">Scanning input folder…</span>
                    ) : inputStats.error ? (
                        <span className="ai-tools-pill ai-tools-pill--warning">{inputStats.error}</span>
                    ) : (
                        <>
                            <div className="ai-tools-metric">
                                <span className="ai-tools-metric__value">{inputStats.videos}</span>
                                <span className="ai-tools-metric__label">Videos</span>
                            </div>
                            <div className="ai-tools-metric">
                                <span className="ai-tools-metric__value">{inputStats.annotations}</span>
                                <span className="ai-tools-metric__label">JSON annotations</span>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div className="ai-tools-card">
                <div className="ai-tools-card-header">
                    <h3>Pipeline Configuration</h3>
                    <p>Choose environment, processing pipeline, and output options.</p>
                </div>
                <div className="ai-tools-grid ai-tools-grid--two">
                    <label className="ai-tools-field">
                        <span className="ai-tools-label">Environment</span>
                        <Select
                            className="ai-tools-select"
                            classNamePrefix="rs"
                            options={environmentOptions}
                            value={environmentOptions.find(option => option.value === environment)}
                            onChange={(option) => {
                                setEnvironment(option?.value || ENVIRONMENTS[0]);
                                resetStatus();
                            }}
                        />
                    </label>
                    <label className="ai-tools-field">
                        <span className="ai-tools-label">Pipeline</span>
                        <Select
                            className="ai-tools-select"
                            classNamePrefix="rs"
                            options={pipelineOptions}
                            value={pipelineOptions.find(option => option.value === pipeline)}
                            onChange={(option) => {
                                setPipeline(option?.value || PIPELINES[0]);
                                resetStatus();
                            }}
                        />
                    </label>
                    <label className="ai-tools-field">
                        <span className="ai-tools-label">Output</span>
                        <Select
                            className="ai-tools-select"
                            classNamePrefix="rs"
                            options={outputOptions}
                            value={outputOptions.find(option => option.value === outputType)}
                            onChange={(option) => {
                                setOutputType(option?.value || OUTPUTS[0]);
                                resetStatus();
                            }}
                        />
                    </label>
                    <label className="ai-tools-field">
                        <span className="ai-tools-label">Video masking</span>
                        <Select
                            className="ai-tools-select"
                            classNamePrefix="rs"
                            options={maskOptions}
                            value={maskOptions.find(option => option.value === videoMasking)}
                            onChange={(option) => {
                                setVideoMasking(option?.value || VIDEO_MASKING[0]);
                                resetStatus();
                            }}
                        />
                    </label>
                    <label className="ai-tools-field">
                        <span className="ai-tools-label">Redaction level</span>
                        <Select
                            className="ai-tools-select"
                            classNamePrefix="rs"
                            options={redactionOptions}
                            value={redactionOptions.find(option => option.value === redactionLevel)}
                            onChange={(option) => {
                                setRedactionLevel(option?.value || REDACTION_LEVELS[0]);
                                resetStatus();
                            }}
                        />
                    </label>
                </div>
                <div className="ai-tools-actions">
                    <button
                        type="button"
                        className={`run-ai-button${isRunning ? ' loading' : ''}`}
                        onClick={handleRunClick}
                        disabled={isRunDisabled}
                    >
                        {isRunning ? 'Running…' : 'Run AI'}
                    </button>
                    {status.message && (
                        <div className={`ai-tools-status ai-tools-status--${status.type}`}>
                            {status.message}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function handleRunAI(/* ...unused... */) {
    const warning = 'handleRunAI is handled via runAIPipeline bridge.';
    console.warn(warning);
    return Promise.resolve({ stdout: '', stderr: warning });
}
export default AITools;