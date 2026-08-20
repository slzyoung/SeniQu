import React, { useState, useEffect, useRef } from 'react';
import { useUploadStore } from '../../stores/useUploadStore';
import { 
    CloudUpload, CheckCircle, XCircle, RotateCw, X, ChevronDown, ChevronUp, FileVideo, AlertCircle
} from 'lucide-react';

export const BackgroundUploadWidget: React.FC = () => {
    const { tasks, cancelUpload, retryUpload, clearCompleted, restoreUploads } = useUploadStore();
    const [isExpanded, setIsExpanded] = useState(true);
    const prevActiveCountRef = useRef(0);

    // Restore pending uploads from IndexedDB on mount
    useEffect(() => {
        restoreUploads();
    }, []);

    // Listen to custom window event to expand upload manager if triggered
    useEffect(() => {
        const handleOpenManager = () => setIsExpanded(true);
        window.addEventListener('open_upload_manager', handleOpenManager);
        return () => window.removeEventListener('open_upload_manager', handleOpenManager);
    }, []);

    const activeTasks = tasks.filter(t => t.status === 'uploading' || t.status === 'processing' || t.status === 'preparing');
    const failedTasks = tasks.filter(t => t.status === 'failed');
    const completedTasks = tasks.filter(t => t.status === 'completed');

    // Auto-expand whenever a new active upload starts
    useEffect(() => {
        if (activeTasks.length > prevActiveCountRef.current) {
            setIsExpanded(true);
        }
        prevActiveCountRef.current = activeTasks.length;
    }, [activeTasks.length]);

    if (tasks.length === 0) return null;

    const formatBytes = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // Calculate aggregate progress for active tasks
    const totalProgress = activeTasks.length > 0 
        ? Math.round(activeTasks.reduce((acc, curr) => acc + (curr.progress || 0), 0) / activeTasks.length)
        : 0;

    return (
        <div 
            className={`fixed z-[90] transition-all duration-300 ease-out select-none flex flex-col font-sans antialiased ${
                isExpanded 
                    ? 'bottom-[calc(5rem+env(safe-area-inset-bottom))] md:bottom-6 left-3 right-3 md:left-auto md:right-6 w-auto md:w-full md:max-w-[380px] max-h-[calc(100vh-140px)] md:max-h-[500px] bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border border-slate-200/90 dark:border-zinc-800/90 rounded-2xl shadow-2xl shadow-slate-900/10 dark:shadow-black/70 overflow-hidden'
                    : 'bottom-[calc(5rem+env(safe-area-inset-bottom))] md:bottom-6 right-3 md:right-6 w-auto cursor-pointer bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-slate-200/90 dark:border-zinc-800/90 rounded-full shadow-lg shadow-slate-900/10 dark:shadow-black/50 hover:shadow-xl active:scale-95 hover:scale-[1.02] p-1.5 sm:p-2 pr-3.5 sm:pr-4 flex items-center gap-2.5 sm:gap-3 transition-transform'
            }`}
        >
            {/* COMPACT MINI PILL STATE (Collapsed) */}
            {!isExpanded ? (
                <div 
                    onClick={() => setIsExpanded(true)}
                    className="flex items-center gap-2 sm:gap-2.5"
                    title="Click to view background upload manager"
                >
                    <div className="relative flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex-shrink-0">
                        {activeTasks.length > 0 ? (
                            <RotateCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin text-amber-500" />
                        ) : failedTasks.length > 0 ? (
                            <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-500" />
                        ) : (
                            <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500" />
                        )}
                        {activeTasks.length > 0 && (
                            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-amber-500 text-zinc-950 rounded-full flex items-center justify-center text-[8px] sm:text-[9px] font-bold shadow-xs">
                                {activeTasks.length}
                            </span>
                        )}
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-[11px] sm:text-xs font-semibold text-slate-900 dark:text-zinc-100 flex items-center gap-1 truncate tracking-tight">
                            {activeTasks.length > 0 ? `Uploading (${totalProgress}%)` : failedTasks.length > 0 ? 'Upload Warning' : 'Upload Complete'}
                            <ChevronUp className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 flex-shrink-0" />
                        </span>
                        <span className="text-[9px] sm:text-[10px] text-slate-500 dark:text-zinc-400 truncate">
                            {activeTasks.length > 0 
                                ? `${activeTasks.length} file${activeTasks.length > 1 ? 's' : ''} in background` 
                                : `${tasks.length} item${tasks.length > 1 ? 's' : ''}`}
                        </span>
                    </div>
                </div>
            ) : (
                /* EXPANDED MANAGER STATE */
                <>
                    {/* Header */}
                    <div 
                        onClick={() => setIsExpanded(false)}
                        className="flex items-center justify-between px-3.5 py-3 sm:px-4 sm:py-3.5 bg-slate-50/80 dark:bg-zinc-900/60 border-b border-slate-200/80 dark:border-zinc-800/80 cursor-pointer hover:bg-slate-100/80 dark:hover:bg-zinc-900/90 transition-colors touch-manipulation"
                    >
                        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                            <div className="relative flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-500 border border-amber-500/20 flex-shrink-0">
                                <CloudUpload className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${activeTasks.length > 0 ? 'text-amber-500 animate-bounce' : 'text-slate-400 dark:text-zinc-400'}`} />
                                {activeTasks.length > 0 && (
                                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-amber-500 rounded-full flex items-center justify-center text-[8px] sm:text-[9px] font-bold text-zinc-950 shadow-xs">
                                        {activeTasks.length}
                                    </span>
                                )}
                            </div>
                            <div className="min-w-0">
                                <h4 className="text-[11px] sm:text-xs font-semibold text-slate-900 dark:text-zinc-100 tracking-tight uppercase truncate">
                                    Upload Manager
                                </h4>
                                <p className="text-[9px] sm:text-[10px] text-slate-500 dark:text-zinc-400 font-normal truncate">
                                    {activeTasks.length > 0 
                                        ? `Uploading ${activeTasks.length} video${activeTasks.length > 1 ? 's' : ''} (${totalProgress}%)`
                                        : failedTasks.length > 0 
                                        ? `${failedTasks.length} task${failedTasks.length > 1 ? 's' : ''} failed`
                                        : 'All uploads completed'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                            {completedTasks.length > 0 && (
                                <button 
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        clearCompleted();
                                    }}
                                    className="text-[9px] sm:text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full hover:bg-emerald-500/20 transition-all font-semibold shadow-xs active:scale-95"
                                >
                                    Clear Done
                                </button>
                            )}
                            <button 
                                type="button"
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-slate-200/60 dark:hover:bg-zinc-800 transition-colors"
                                title="Minimize manager"
                            >
                                <ChevronDown className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Tasks List */}
                    <div className="flex-1 overflow-y-auto p-3 sm:p-3.5 space-y-2.5 sm:space-y-3 max-h-[260px] sm:max-h-[380px] custom-scrollbar">
                        {tasks.map((task) => (
                            <div 
                                key={task.id} 
                                className={`p-3 rounded-xl border transition-all duration-200 ${
                                    task.status === 'completed' 
                                        ? 'bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/20' 
                                        : task.status === 'failed'
                                        ? 'bg-rose-500/5 dark:bg-rose-500/10 border-rose-500/20'
                                        : 'bg-slate-50/80 dark:bg-zinc-900/50 border-slate-200/80 dark:border-zinc-800/80'
                                }`}
                            >
                                {/* Task details header */}
                                <div className="flex items-start gap-2.5 sm:gap-3">
                                    {task.thumbnailUrl ? (
                                        <video src={task.thumbnailUrl} className="w-10 h-14 sm:w-12 sm:h-16 rounded-xl object-cover bg-black border border-slate-200 dark:border-zinc-800 shadow-xs flex-shrink-0" muted />
                                    ) : (
                                        <div className="w-10 h-14 sm:w-12 sm:h-16 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-slate-400 dark:text-zinc-500 flex-shrink-0">
                                            <FileVideo className="w-5 h-5 sm:w-6 sm:h-6" />
                                        </div>
                                    )}

                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start gap-1">
                                            <p className="text-xs font-semibold text-slate-900 dark:text-zinc-100 truncate tracking-tight">
                                                {task.caption || task.fileName}
                                            </p>
                                            <button 
                                                type="button"
                                                onClick={() => cancelUpload(task.id)}
                                                className="text-slate-400 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400 p-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-zinc-800 transition-all flex-shrink-0"
                                                title="Cancel upload"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                        <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5 font-normal">
                                            {task.type === 'reel' ? 'Reel Video' : 'Forum Post'} · {formatBytes(task.fileSize)}
                                        </p>

                                        {/* Status details */}
                                        <div className="mt-2 flex items-center gap-1.5">
                                            {task.status === 'preparing' && (
                                                <>
                                                    <RotateCw className="w-3.5 h-3.5 text-amber-500 animate-spin flex-shrink-0" />
                                                    <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium truncate">Preparing video...</span>
                                                </>
                                            )}
                                            {task.status === 'uploading' && (
                                                <>
                                                    <CloudUpload className="w-3.5 h-3.5 text-amber-500 animate-pulse flex-shrink-0" />
                                                    <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium truncate">Uploading ({task.progress}%)</span>
                                                </>
                                            )}
                                            {task.status === 'processing' && (
                                                <>
                                                    <RotateCw className="w-3.5 h-3.5 text-amber-500 animate-spin flex-shrink-0" />
                                                    <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium animate-pulse truncate">Processing & Compressing...</span>
                                                </>
                                            )}
                                            {task.status === 'completed' && (
                                                <>
                                                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                                                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium truncate">Successfully published!</span>
                                                </>
                                            )}
                                            {task.status === 'failed' && (
                                                <div className="flex flex-col gap-1.5 w-full mt-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <XCircle className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                                                        <span className="text-[10px] text-rose-600 dark:text-rose-400 font-normal line-clamp-2 sm:line-clamp-1 break-words sm:break-normal">
                                                            {task.error || 'Upload failed'}
                                                        </span>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button 
                                                            type="button"
                                                            onClick={() => retryUpload(task.id)}
                                                            className="text-xs bg-amber-500 hover:bg-amber-400 active:scale-95 text-zinc-950 font-bold px-3 py-1 rounded-lg transition-all shadow-xs flex items-center gap-1"
                                                        >
                                                            <RotateCw className="w-3 h-3" /> Retry
                                                        </button>
                                                        <button 
                                                            type="button"
                                                            onClick={() => cancelUpload(task.id)}
                                                            className="text-xs bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700 active:scale-95 text-slate-800 dark:text-zinc-200 font-medium px-3 py-1 rounded-lg transition-all"
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
                                    <div className="mt-2.5 w-full bg-slate-200/80 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                                        <div 
                                            className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 h-1.5 rounded-full transition-all duration-300 ease-out"
                                            style={{ width: `${task.progress}%` }}
                                        />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

