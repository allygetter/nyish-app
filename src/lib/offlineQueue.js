const DB_NAME = 'nyish_offline'
const DB_VERSION = 1
const STORE_NAME = 'queue'

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
      }
    }
  })
}

export async function queueWrite(table, payload, method = 'insert') {
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)
  await new Promise((resolve, reject) => {
    const req = store.add({ table, payload, method, createdAt: Date.now() })
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
  db.close()
  window.dispatchEvent(new CustomEvent('nyish:queueChanged'))
}

export async function getQueue() {
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, 'readonly')
  const store = tx.objectStore(STORE_NAME)
  const items = await new Promise((resolve, reject) => {
    const req = store.getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  db.close()
  return items
}

export async function clearQueueItem(id) {
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)
  await new Promise((resolve, reject) => {
    const req = store.delete(id)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
  db.close()
  window.dispatchEvent(new CustomEvent('nyish:queueChanged'))
}

export async function flushQueue(supabaseClient) {
  const items = await getQueue()
  if (!items.length) return
  for (const item of items) {
    try {
      let res
      if (item.method === 'insert') {
        res = await supabaseClient.from(item.table).insert(item.payload)
      } else if (item.method === 'update') {
        res = await supabaseClient.from(item.table).update(item.payload.data).eq('id', item.payload.id)
      } else if (item.method === 'delete') {
        res = await supabaseClient.from(item.table).delete().eq('id', item.payload.id)
      }
      if (res.error) throw res.error
      await clearQueueItem(item.id)
    } catch (e) {
      console.error('Flush failed for item', item.id, e)
      break
    }
  }
}

export function isOnline() {
  return navigator.onLine
}

export function setupOnlineListener(supabaseClient) {
  window.addEventListener('online', () => {
    flushQueue(supabaseClient)
  })
}
