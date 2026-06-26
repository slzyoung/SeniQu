import React, { useState, useEffect } from 'react';
import { useUploadStore } from '../../stores/useUploadStore';
import { 
    CloudUpload, CheckCircle, XCircle, RotateCw, X, ChevronDown, ChevronUp, FileVideo, AlertCircle
} from 'lucide-react';

export const BackgroundUploadWidget: React.FC = () => {
    const { tasks, cancelUpload, retryUpload, clearCompleted, restoreUploads } = useUploadStore();
    const [isExpanded, setIsExpanded] = useState(true);

    // Restore pending uploads from IndexedDB on mount
    useEffect(() => {
        restoreUploads();
    }, []);

    const activeTasks = tasks.filter(t => t.status === 'uploading' || t.status === 'processing' || t.status === 'preparing');
    const failedTasks = tasks.filter(t => t.status === 'failed');
    const completedTasks = tasks.filter(t => t.status === 'completed');

    if (tasks.length === 0) return null;

    const formatBytes = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="fixed bottom-6 right-6 z-[100] w-full max-w-[360px] max-h-[480px] bg-theme-bg/85 backdrop-blur-md border border-theme-border/30 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ease-out select-none flex flex-col">
            {/* Header */}
            <div 
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center justify-between p-4 bg-theme-border/20 border-b border-theme-border/20 cursor-pointer hover:bg-theme-border/30 transition-all"
            >
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <CloudUpload className={`w-5 h-5 ${activeTasks.length > 0 ? 'text-amber-500 animate-bounce' : 'text-theme-muted'}`} />
                        {activeTasks.length > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-amber-500 rounded-full flex items-center justify-center text-[7px] font-bold text-black animate-pulse">
                                {activeTasks.length}
                            </span>
                        )}
                    </div>
                    <div>
                        <h4 className="text-xs font-bold text-theme-text uppercase tracking-wider">
                            Upload Manager
                        </h4>
                        <p className="text-[10px] text-theme-muted">
                            {activeTasks.length > 0 
                                ? `Uploading ${activeTasks.length} video${activeTasks.length > 1 ? 's' : ''}...`
                                : failedTasks.length > 0 
                                ? `${failedTasks.length} task${failedTasks.length > 1 ? 's' : ''} failed`
                                : 'All uploads completed'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    {completedTasks.length > 0 && (
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                clearCompleted();
                            }}
                            className="text-[9px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded-full hover:bg-emerald-500/20 transition-all font-medium"
                        >
                            Clear Done
                        </button>
                    )}
                    <button className="text-theme-muted hover:text-theme-text p-1">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* Tasks List */}
            {isExpanded && (
                <div className="flex-1 overflow-y-auto p-3 space-y-3 max-h-[360px] custom-scrollbar">
                    {tasks.map((task) => (
                        <div 
                            key={task.id} 
                            className={`p-3 rounded-xl border transition-all duration-300 ${
                                task.status === 'completed' 
                                    ? 'bg-emerald-500/5 border-emerald-500/20' 
                                    : task.status === 'failed'
                                    ? 'bg-rose-500/5 border-rose-500/20'
                                    : 'bg-theme-border/10 border-theme-border/20'
                            }`}
                        >
                            {/* Task details header */}
                            <div className="flex items-start gap-3">
                                {task.thumbnailUrl ? (
                                    <video src={task.thumbnailUrl} className="w-12 h-16 rounded-lg object-cover bg-black border border-theme-border/25" muted />
                                ) : (
                                    <div className="w-12 h-16 rounded-lg bg-theme-border/20 border border-theme-border/25 flex items-center justify-center text-theme-muted">
                                        <FileVideo className="w-6 h-6" />
                                    </div>
                                )}

                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start gap-1">
                                        <p className="text-xs font-bold text-theme-text truncate">
                                            {task.caption || task.fileName}
                                        </p>
                                        <button 
                                            onClick={() => cancelUpload(task.id)}
                                            className="text-theme-muted hover:text-rose-500 p-0.5 rounded-full hover:bg-theme-border/30 transition-all"
                                            title="Cancel upload"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                    <p className="text-[9px] text-theme-muted mt-0.5">
                                        {task.type === 'reel' ? 'Reel Video' : 'Forum Thread'} · {formatBytes(task.fileSize)}
                                    </p>

                                    {/* Status details */}
                                    <div className="mt-2 flex items-center gap-1.5">
                                        {task.status === 'preparing' && (
                                            <>
                                                <RotateCw className="w-3 h-3 text-amber-500 animate-spin" />
                                                <span className="text-[10px] text-amber-500 font-semibold">Preparing video...</span>
                                            </>
                                        )}
                                        {task.status === 'uploading' && (
                                            <>
                                                <CloudUpload className="w-3 h-3 text-amber-500 animate-pulse" />
                                                <span className="text-[10px] text-amber-500 font-semibold">Uploading ({task.progress}%)</span>
                                            </>
                                        )}
                                        {task.status === 'processing' && (
                                            <>
                                                <RotateCw className="w-3 h-3 text-amber-500 animate-spin" />
                                                <span className="text-[10px] text-amber-500 font-semibold animate-pulse">Processing & Compressing...</span>
                                            </>
                                        )}
                                        {task.status === 'completed' && (
                                            <>
                                                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                                                <span className="text-[10px] text-emerald-500 font-semibold">Successfully published!</span>
                                            </>
                                        )}
                                        {task.status === 'failed' && (
                                            <div className="flex flex-col gap-1.5 w-full">
                                                <div className="flex items-center gap-1">
                                                    <XCircle className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                                                    <span className="text-[9px] text-rose-500 font-semibold line-clamp-1">{task.error || 'Upload failed'}</span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button 
                                                        onClick={() => retryUpload(task.id)}
                                                        className="text-[9px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded hover:bg-amber-500/20 transition-all font-bold"
                                                    >
                                                        Retry
                                                    </button>
                                                    <button 
                                                        onClick={() => cancelUpload(task.id)}
                                                        className="text-[9px] bg-theme-border/30 text-theme-muted px-2 py-0.5 rounded hover:bg-theme-border/50 transition-all font-semibold"
                                                    >
                                                        Discard
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Progress bar */}
                            {task.status !== 'completed' && task.status !== 'failed' && (
                                <div className="mt-3 w-full bg-theme-border/20 rounded-full h-1.5 overflow-hidden">
                                    <div 
                                        className="bg-gradient-to-r from-amber-500 to-amber-600 h-1.5 rounded-full transition-all duration-300 ease-out"
                                        style={{ width: `${task.progress}%` }}
                                    />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
