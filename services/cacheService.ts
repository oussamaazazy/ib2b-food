// ============== نظام التخزين المؤقت للصور والبيانات ==============

// فتح قاعدة البيانات IndexedDB
export const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ESB2BCache', 2);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains('images')) {
        const imageStore = db.createObjectStore('images', { keyPath: 'url' });
        imageStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
      
      if (!db.objectStoreNames.contains('data')) {
        const dataStore = db.createObjectStore('data', { keyPath: 'key' });
        dataStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
      
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };
  });
};

// حفظ صورة في الكاش
export const cacheImage = async (url: string, blob: Blob): Promise<void> => {
  try {
    const db = await openDB();
    const transaction = db.transaction(['images'], 'readwrite');
    const store = transaction.objectStore('images');
    
    store.put({
      url,
      data: blob,
      timestamp: Date.now()
    });
    
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.error('Error caching image:', error);
  }
};

// الحصول على صورة من الكاش
export const getCachedImage = async (url: string): Promise<Blob | null> => {
  try {
    const db = await openDB();
    const transaction = db.transaction(['images'], 'readonly');
    const store = transaction.objectStore('images');
    const request = store.get(url);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const result = request.result;
        if (result && Date.now() - result.timestamp < 7 * 24 * 60 * 60 * 1000) {
          resolve(result.data);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error getting cached image:', error);
    return null;
  }
};

// حفظ بيانات في الكاش
export const cacheData = async <T,>(key: string, data: T): Promise<void> => {
  try {
    const db = await openDB();
    const transaction = db.transaction(['data'], 'readwrite');
    const store = transaction.objectStore('data');
    
    store.put({
      key,
      data,
      timestamp: Date.now()
    });
    
    try {
      localStorage.setItem(`cache_${key}`, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (e) {
      // تجاهل أخطاء localStorage
    }
    
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.error('Error caching data:', error);
  }
};

// الحصول على بيانات من الكاش
export const getCachedData = async <T,>(key: string, maxAge: number = 3600000): Promise<T | null> => {
  try {
    const localData = localStorage.getItem(`cache_${key}`);
    if (localData) {
      const parsed = JSON.parse(localData);
      if (Date.now() - parsed.timestamp < maxAge) {
        return parsed.data as T;
      }
    }
    
    const db = await openDB();
    const transaction = db.transaction(['data'], 'readonly');
    const store = transaction.objectStore('data');
    const request = store.get(key);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const result = request.result;
        if (result && Date.now() - result.timestamp < maxAge) {
          resolve(result.data as T);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error getting cached data:', error);
    return null;
  }
};

// حفظ الإعدادات
export const saveSetting = async (key: string, value: any): Promise<void> => {
  try {
    const db = await openDB();
    const transaction = db.transaction(['settings'], 'readwrite');
    const store = transaction.objectStore('settings');
    store.put({ key, value });
    
    localStorage.setItem(`setting_${key}`, JSON.stringify(value));
  } catch (error) {
    console.error('Error saving setting:', error);
  }
};

// الحصول على الإعدادات
export const getSetting = async (key: string): Promise<any> => {
  try {
    const localSetting = localStorage.getItem(`setting_${key}`);
    if (localSetting) {
      return JSON.parse(localSetting);
    }
    
    const db = await openDB();
    const transaction = db.transaction(['settings'], 'readonly');
    const store = transaction.objectStore('settings');
    const request = store.get(key);
    
    return new Promise((resolve) => {
      request.onsuccess = () => {
        resolve(request.result?.value);
      };
      request.onerror = () => resolve(null);
    });
  } catch (error) {
    return null;
  }
};

// مسح الكاش القديم
export const clearOldCache = async (maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> => {
  try {
    const db = await openDB();
    const now = Date.now();
    
    const imageTransaction = db.transaction(['images'], 'readwrite');
    const imageStore = imageTransaction.objectStore('images');
    const imageIndex = imageStore.index('timestamp');
    const imageRange = IDBKeyRange.upperBound(now - maxAge);
    
    imageIndex.openCursor(imageRange).onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
    
    const dataTransaction = db.transaction(['data'], 'readwrite');
    const dataStore = dataTransaction.objectStore('data');
    const dataIndex = dataStore.index('timestamp');
    const dataRange = IDBKeyRange.upperBound(now - maxAge);
    
    dataIndex.openCursor(dataRange).onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
};