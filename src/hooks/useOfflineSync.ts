import { useEffect, useState } from 'react';
import { getOfflineQueue, removeFromOfflineQueue } from '../lib/offlineQueue';
import { api } from '../services/api';

export type SyncStatus = 'Sincronizado' | 'Pendiente de sincronizar' | 'Sin conexión';

export const useOfflineSync = () => {
    const [status, setStatus] = useState<SyncStatus>(navigator.onLine ? 'Sincronizado' : 'Sin conexión');

    useEffect(() => {
        let isSyncing = false;

        const syncOfflineQueue = async () => {
            if (!navigator.onLine || isSyncing) return;
            isSyncing = true;
            try {
                const queue = await getOfflineQueue();
                if (queue.length === 0) {
                    setStatus('Sincronizado');
                    return;
                }

                setStatus('Pendiente de sincronizar');

                for (const record of queue) {
                    try {
                        const existing = await api.getAttendance(record.classId, record.date);

                        if (existing && existing.length > 0) {
                            const isSame = record.records.every(r => {
                                const extRec = existing.find((e: any) => e.student_id === r.studentId);
                                return extRec && extRec.status === r.status;
                            });

                            if (isSame) {
                                await removeFromOfflineQueue(record.id);
                                continue;
                            }
                        }

                        // Attempt sending
                        await api.saveAttendance({
                            class_id: record.classId,
                            date: record.date,
                            records: record.records.map(r => ({ student_id: r.studentId, status: r.status }))
                        });

                        await removeFromOfflineQueue(record.id);
                    } catch (e) {
                        console.error('Error syncing record', record, e);
                    }
                }

                const pending = await getOfflineQueue();
                if (pending.length === 0) {
                    setStatus('Sincronizado');
                } else {
                    setStatus('Pendiente de sincronizar');
                }
            } finally {
                isSyncing = false;
            }
        };

        const handleOnline = () => {
            setStatus('Pendiente de sincronizar');
            syncOfflineQueue();
        };

        const handleOffline = () => setStatus('Sin conexión');

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        if (navigator.onLine) {
            syncOfflineQueue();
        } else {
            handleOffline();
        }

        // poll queue check sometimes? Not really necessary since any action that adds to it could trigger a sync when back online
        // Let's add a custom event to re-trigger check
        window.addEventListener('sync-offline-triggered', syncOfflineQueue);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('sync-offline-triggered', syncOfflineQueue);
        };
    }, []);

    return status;
};
