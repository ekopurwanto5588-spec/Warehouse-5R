/**
 * 5R Warehouse Inspection App - Storage Engine
 * Uses IndexedDB for reliable offline storage of checklists and photo evidence,
 * with LocalStorage fallback and utility methods.
 */

const DB_NAME = 'Warehouse5R_DB';
const DB_VERSION = 1;
const STORE_INSPECTIONS = 'inspections';
const STORE_SETTINGS = 'settings';

class StorageEngine {
    constructor() {
        this.db = null;
        this.isReady = false;
        this.readyPromise = this.initDB();
    }

    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_INSPECTIONS)) {
                    const store = db.createObjectStore(STORE_INSPECTIONS, { keyPath: 'id' });
                    store.createIndex('date', 'date', { unique: false });
                    store.createIndex('shift', 'shift', { unique: false });
                    store.createIndex('area', 'area', { unique: false });
                    store.createIndex('monthYear', 'monthYear', { unique: false });
                }
                if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
                    db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
                }
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                this.isReady = true;
                resolve(this.db);
            };

            request.onerror = (event) => {
                console.error('IndexedDB error, falling back to LocalStorage:', event.target.error);
                this.isReady = true;
                resolve(null);
            };
        });
    }

    async ensureReady() {
        if (!this.isReady) {
            await this.readyPromise;
        }
    }

    // Save or update an inspection
    async saveInspection(inspection) {
        await this.ensureReady();
        if (!inspection.id) {
            inspection.id = 'INS_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        }
        inspection.updatedAt = new Date().toISOString();
        if (!inspection.createdAt) {
            inspection.createdAt = inspection.updatedAt;
        }

        // Derive monthYear 'YYYY-MM'
        if (inspection.date) {
            inspection.monthYear = inspection.date.substring(0, 7);
        }

        if (this.db) {
            return new Promise((resolve, reject) => {
                const tx = this.db.transaction([STORE_INSPECTIONS], 'readwrite');
                const store = tx.objectStore(STORE_INSPECTIONS);
                const req = store.put(inspection);
                req.onsuccess = () => resolve(inspection);
                req.onerror = () => reject(req.error);
            });
        } else {
            const list = this.getLocalStorageList();
            const idx = list.findIndex(i => i.id === inspection.id);
            if (idx >= 0) list[idx] = inspection;
            else list.push(inspection);
            localStorage.setItem('warehouse_5r_inspections', JSON.stringify(list));
            return inspection;
        }
    }

    // Get all inspections
    async getAllInspections() {
        await this.ensureReady();
        if (this.db) {
            return new Promise((resolve, reject) => {
                const tx = this.db.transaction([STORE_INSPECTIONS], 'readonly');
                const store = tx.objectStore(STORE_INSPECTIONS);
                const req = store.getAll();
                req.onsuccess = () => resolve(req.result || []);
                req.onerror = () => reject(req.error);
            });
        } else {
            return this.getLocalStorageList();
        }
    }

    // Get single inspection by ID
    async getInspectionById(id) {
        await this.ensureReady();
        if (this.db) {
            return new Promise((resolve, reject) => {
                const tx = this.db.transaction([STORE_INSPECTIONS], 'readonly');
                const store = tx.objectStore(STORE_INSPECTIONS);
                const req = store.get(id);
                req.onsuccess = () => resolve(req.result || null);
                req.onerror = () => reject(req.error);
            });
        } else {
            const list = this.getLocalStorageList();
            return list.find(i => i.id === id) || null;
        }
    }

    // Delete inspection
    async deleteInspection(id) {
        await this.ensureReady();
        if (this.db) {
            return new Promise((resolve, reject) => {
                const tx = this.db.transaction([STORE_INSPECTIONS], 'readwrite');
                const store = tx.objectStore(STORE_INSPECTIONS);
                const req = store.delete(id);
                req.onsuccess = () => resolve(true);
                req.onerror = () => reject(req.error);
            });
        } else {
            const list = this.getLocalStorageList().filter(i => i.id !== id);
            localStorage.setItem('warehouse_5r_inspections', JSON.stringify(list));
            return true;
        }
    }

    // LocalStorage fallback helper
    getLocalStorageList() {
        try {
            const data = localStorage.getItem('warehouse_5r_inspections');
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('LocalStorage parse error:', e);
            return [];
        }
    }

    // Settings helpers
    async getSetting(key, defaultVal = null) {
        try {
            const val = localStorage.getItem('wh5r_set_' + key);
            return val !== null ? JSON.parse(val) : defaultVal;
        } catch (e) {
            return defaultVal;
        }
    }

    async saveSetting(key, value) {
        try {
            localStorage.setItem('wh5r_set_' + key, JSON.stringify(value));
            return true;
        } catch (e) {
            return false;
        }
    }

    // Clear all data
    async clearAll() {
        await this.ensureReady();
        if (this.db) {
            const tx = this.db.transaction([STORE_INSPECTIONS], 'readwrite');
            tx.objectStore(STORE_INSPECTIONS).clear();
        }
        localStorage.removeItem('warehouse_5r_inspections');
    }
}

// Global instance
window.storageEngine = new StorageEngine();
