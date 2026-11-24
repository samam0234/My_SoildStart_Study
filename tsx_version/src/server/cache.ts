export function ttlCache<K, V>(ttl: number, capacity: number, clock = Date.now) {
  const entries = new Map<K, { expires: number; value: Promise<V> }>();

  function clear() {
    entries.clear();
  }

  function read(key: K, load: () => Promise<V>) {
    const hit = entries.get(key);
    if (hit && hit.expires > clock()) return hit.value;
    entries.delete(key);
    if (entries.size >= capacity) {
      const oldest = entries.keys().next();
      if (!oldest.done) entries.delete(oldest.value);
    }
    const value = Promise.resolve().then(load);
    entries.set(key, { expires: clock() + ttl, value });
    void value.catch(() => {
      if (entries.get(key)?.value === value) entries.delete(key);
    });
    return value;
  }

  return { clear, read };
}
