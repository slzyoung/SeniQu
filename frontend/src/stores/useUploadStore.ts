/**
 * Global Background Upload Store
 * Manages Reels and Forum video uploads in the background.
 * Persists tasks and files using IndexedDB to withstand page refreshes.
 */

import { create } from 'zustand';
import { reelsService } from '../services/reelsService';
import { forumService } from '../services/forumService';
import { useNotificationStore } from './useNotificationStore';

export interface UploadTask {
    id: string;
    type: 'reel' | 'forum';
    fileName: string;
    fileSize: number;
    file: File;
    thumbnailUrl?: string;
    caption?: string;
    hashtags?: string[];
    audioMetadata?: any;
    locationName?: string;
    locationLat?: number;
    locationLng?: number;
    forumOptions?: {
        threadId?: string;
        postId?: string;
        parentId?: string;
        title?: string;
        content?: string;
        categoryId?: string;
        selectedAspect?: string;
        selectedSize?: string;
        tags?: string[];
    };
    progress: number;
    status: 'preparing' | 'uploading' | 'processing' | 'completed' | 'failed';
    error?: string;
    xhr?: XMLHttpRequest | null;
}

interface UploadStore {
    tasks: UploadTask[];
    addUpload: (task: Omit<UploadTask, 'progress' | 'status'>) => void;
    cancelUpload: (id: string) => void;
    retryUpload: (id: string) => void;
    clearCompleted: () => void;
    restoreUploads: () => Promise<void>;
}

// ── IndexedDB Helpers ──
const DB_NAME = 'seniqu_uploads_db';
const STORE_NAME = 'pending_uploads';

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function saveToDB(id: string, file: File, metadata: any) {
    try {
        const db = await openDB();
        return new Promise<void>((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            store.put({ id, file, metadata, timestamp: Date.now() });
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    } catch (err) {
        console.error('IndexedDB save failed:', err);
    }
}

async function removeFromDB(id: string) {
    try {
        const db = await openDB();
        return new Promise<void>((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            store.delete(id);
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    } catch (err) {
        console.error('IndexedDB delete failed:', err);
    }
}

async function getAllFromDB(): Promise<any[]> {
    try {
        const db = await openDB();
        return new Promise<any[]>((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    } catch (err) {
        console.error('IndexedDB get failed:', err);
        return [];
    }
}

// Global active XHR instances mapping to abort them dynamically
const activeXHRs = new Map<string, XMLHttpRequest>();

export const useUploadStore = create<UploadStore>((set, get) => ({
    tasks: [],

    addUpload: async (task) => {
        const newTask: UploadTask = {
            ...task,
            progress: 0,
            status: 'preparing',
            xhr: null,
        };

        // Add to state
        set((state) => ({
            tasks: [newTask, ...state.tasks],
        }));

        // Persist file & metadata in IndexedDB in case of refresh/close
        const metadata = {
            type: task.type,
            fileName: task.fileName,
            fileSize: task.fileSize,
            caption: task.caption,
            hashtags: task.hashtags,
            audioMetadata: task.audioMetadata,
            locationName: task.locationName,
            locationLat: task.locationLat,
            locationLng: task.locationLng,
            forumOptions: task.forumOptions,
        };
        await saveToDB(task.id, task.file, metadata);

        // Start processing the task
        get().retryUpload(task.id);
    },

    cancelUpload: async (id) => {
        const xhr = activeXHRs.get(id);
        if (xhr) {
            xhr.abort();
            activeXHRs.delete(id);
        }

        set((state) => ({
            tasks: state.tasks.map((t) =>
                t.id === id ? { ...t, status: 'failed', error: 'Upload canceled by user' } : t
            ),
        }));

        await removeFromDB(id);
    },

    retryUpload: async (id) => {
        const task = get().tasks.find((t) => t.id === id);
        if (!task) return;

        set((state) => ({
            tasks: state.tasks.map((t) =>
                t.id === id ? { ...t, status: 'preparing', progress: 0, error: undefined } : t
            ),
        }));

        const xhrRef = { current: null as XMLHttpRequest | null };

        const onProgress = (prog: number) => {
            set((state) => ({
                tasks: state.tasks.map((t) =>
                    t.id === id
                        ? {
                              ...t,
                              progress: prog,
                              status: prog >= 80 ? 'processing' : 'uploading',
                          }
                        : t
                ),
            }));
            if (xhrRef.current) {
                activeXHRs.set(id, xhrRef.current);
            }
        };

        const onStatus = (statusMsg: string) => {
            console.log(`[Upload Background ${id}]: ${statusMsg}`);
        };

        try {
            if (task.type === 'reel') {
                await reelsService.uploadReel(task.file, {
                    caption: task.caption,
                    hashtags: task.hashtags,
                    audioMetadata: task.audioMetadata,
                    locationName: task.locationName,
                    locationLat: task.locationLat,
                    locationLng: task.locationLng,
                    onProgress,
                    onStatus,
                    xhrRef,
                });
            } else {
                const videoResult = await forumService.uploadVideo(task.file, {
                    threadId: task.forumOptions?.threadId,
                    postId: task.forumOptions?.postId,
                    caption: task.caption,
                    onProgress,
                    onStatus,
                    xhrRef,
                });

                // Post-upload action: create thread or create reply
                if (task.forumOptions?.title) {
                    let mediaUrl = videoResult.url;
                    if (
                        task.forumOptions.selectedAspect &&
                        task.forumOptions.selectedAspect !== 'original'
                    ) {
                        mediaUrl = JSON.stringify({
                            videoUrl: videoResult.url,
                            aspectRatio: task.forumOptions.selectedAspect,
                            sizePreset: task.forumOptions.selectedSize,
                            thumbnailUrl: videoResult.thumbnailUrl || undefined,
                        });
                    }
                    await forumService.createThread({
                        title: task.forumOptions.title,
                        content: task.forumOptions.content || '',
                        categoryId: task.forumOptions.categoryId || '',
                        tags: task.forumOptions.tags || [],
                        mediaUrl,
                        mediaType: 'video',
                    });
                } else if (task.forumOptions?.threadId) {
                    await forumService.createPost({
                        threadId: task.forumOptions.threadId,
                        content: task.forumOptions.content || '',
                        mediaUrl: videoResult.url,
                        mediaType: 'video',
                        parentId: task.forumOptions.parentId,
                    });
                }
            }

            // Successfully finished
            set((state) => ({
                tasks: state.tasks.map((t) => (t.id === id ? { ...t, status: 'completed', progress: 100 } : t)),
            }));

            // Remove from IndexedDB persistent list
            await removeFromDB(id);
            activeXHRs.delete(id);

            // Notify user with success
            useNotificationStore.getState().success(
                `${task.type === 'reel' ? 'Reel' : 'Forum Video'} Berhasil!`,
                `Konten video "${task.caption || task.fileName}" telah selesai dipublikasikan.`
            );
        } catch (err: any) {
            // Ignore aborts
            if (err.message === 'XMLHttpRequest aborted' || err.name === 'AbortError') {
                return;
            }
            console.error(`Upload error for task ${id}:`, err);
            set((state) => ({
                tasks: state.tasks.map((t) =>
                    t.id === id ? { ...t, status: 'failed', error: err.message || 'Network/Server Error' } : t
                ),
            }));
            activeXHRs.delete(id);

            useNotificationStore.getState().error(
                'Upload Gagal',
                `Gagal mengunggah video "${task.caption || task.fileName}". Silakan coba lagi.`
            );
        }
    },

    clearCompleted: () => {
        set((state) => ({
            tasks: state.tasks.filter((t) => t.status !== 'completed'),
        }));
    },

    restoreUploads: async () => {
        const saved = await getAllFromDB();
        if (!saved || saved.length === 0) return;

        const restoredTasks: UploadTask[] = saved.map((item) => {
            let thumb: string | undefined = undefined;
            if (item.file.type.startsWith('video/')) {
                thumb = URL.createObjectURL(item.file);
            }
            return {
                id: item.id,
                type: item.metadata.type,
                fileName: item.metadata.fileName,
                fileSize: item.metadata.fileSize,
                file: item.file,
                thumbnailUrl: thumb,
                caption: item.metadata.caption,
                hashtags: item.metadata.hashtags,
                audioMetadata: item.metadata.audioMetadata,
                locationName: item.metadata.locationName,
                locationLat: item.metadata.locationLat,
                locationLng: item.metadata.locationLng,
                forumOptions: item.metadata.forumOptions,
                progress: 0,
                status: 'failed', // Mark as failed on restore so user can manually resume/retry
                error: 'Page was refreshed/closed during upload. Click retry to resume.',
            };
        });

        set((state) => {
            // Avoid duplicates
            const existingIds = new Set(state.tasks.map((t) => t.id));
            const filtered = restoredTasks.filter((t) => !existingIds.has(t.id));
            return { tasks: [...state.tasks, ...filtered] };
        });
    },
}));

// Auto-register beforeunload listener to warn user about losing active uploads
if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', (e) => {
        const activeTasks = useUploadStore.getState().tasks.some(
            (t) => t.status === 'uploading' || t.status === 'preparing' || t.status === 'processing'
        );
        if (activeTasks) {
            const message = 'Unggahan video Anda sedang berjalan di latar belakang. Jika Anda keluar sekarang, unggahan akan dibatalkan.';
            e.returnValue = message;
            return message;
        }
    });
}
