/**
 * Image storage module for the Markdown Editor.
 *
 * Stores inserted images as Blobs in IndexedDB so that relative image
 * references (e.g. `![photo](photo.png)`) resolve correctly in the live
 * preview — even though the page is served from GitHub Pages and has no
 * access to the user's local filesystem.
 *
 * At render time, `resolveImages()` swaps relative `<img src>` values
 * with in-memory Object URLs created from the stored Blobs.
 */

const DB_NAME = 'markdownEditorImageStore';
const DB_VERSION = 1;
const STORE_NAME = 'images';

/** @type {Map<string, string>} filename → Object URL */
const imageURLs = new Map();

// ------------------------------------------------------------------ //
// IndexedDB helpers                                                    //
// ------------------------------------------------------------------ //

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ------------------------------------------------------------------ //
// Public API                                                           //
// ------------------------------------------------------------------ //

/**
 * Store an image Blob and create an Object URL for it.
 * @param {string} filename
 * @param {Blob}   blob
 * @returns {Promise<string>} The Object URL for immediate use
 */
export async function storeImage(filename, blob) {
  // Revoke any previous URL for the same filename
  if (imageURLs.has(filename)) {
    URL.revokeObjectURL(imageURLs.get(filename));
  }

  const url = URL.createObjectURL(blob);
  imageURLs.set(filename, url);

  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(blob, filename);
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (err) {
    console.error('Failed to persist image to IndexedDB:', err);
  }

  return url;
}

/**
 * Return the Object URL for a previously stored image, or null.
 * @param {string} filename
 * @returns {string|null}
 */
export function getImageURL(filename) {
  return imageURLs.get(filename) || null;
}

/**
 * Load every image from IndexedDB into memory (call once at startup).
 */
export async function loadAllImages() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.openCursor();

    await new Promise((resolve) => {
      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          const filename = cursor.key;
          const blob = cursor.value;
          if (!imageURLs.has(filename)) {
            imageURLs.set(filename, URL.createObjectURL(blob));
          }
          cursor.continue();
        } else {
          resolve();
        }
      };
      req.onerror = () => resolve();
    });
    db.close();
  } catch (err) {
    console.error('Failed to load images from IndexedDB:', err);
  }
}

/**
 * Walk all `<img>` elements inside `container` and replace relative `src`
 * attributes with the corresponding Object URL from the store.
 *
 * Must be called **after** DOMPurify sanitisation (which keeps relative
 * URLs intact) so that the resulting `blob:` URLs are never stripped.
 *
 * @param {HTMLElement} container
 */
export function resolveImages(container) {
  if (imageURLs.size === 0) return;

  const imgs = container.querySelectorAll('img');
  for (const img of imgs) {
    const src = img.getAttribute('src');
    if (!src) continue;
    // Skip absolute / data / blob URLs
    if (/^(?:https?:\/\/|data:|blob:)/i.test(src)) continue;
    const url = imageURLs.get(src);
    if (url) {
      img.src = url;
    }
  }
}

/**
 * Remove a single image from both memory and IndexedDB.
 * @param {string} filename
 */
export async function removeImage(filename) {
  if (imageURLs.has(filename)) {
    URL.revokeObjectURL(imageURLs.get(filename));
    imageURLs.delete(filename);
  }
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(filename);
    await new Promise((resolve) => {
      tx.oncomplete = resolve;
      tx.onerror = () => resolve();
    });
    db.close();
  } catch {
    // best-effort
  }
}

/**
 * Remove all stored images.
 */
export async function clearAllImages() {
  for (const url of imageURLs.values()) {
    URL.revokeObjectURL(url);
  }
  imageURLs.clear();
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    await new Promise((resolve) => {
      tx.oncomplete = resolve;
      tx.onerror = () => resolve();
    });
    db.close();
  } catch {
    // best-effort
  }
}
