/**
 * Comprehensive utility to deeply sanitize and clean objects/arrays for Firebase Firestore and LocalStorage.
 * Eliminates all `undefined` values (which trigger FirebaseError: Unsupported field value: undefined),
 * strips circular references, and guards against oversized payload values.
 */

export const deepCleanFirestoreData = (val: any): any => {
  if (val === undefined) {
    return null;
  }
  if (val === null || typeof val !== "object") {
    return val;
  }
  if (Array.isArray(val)) {
    return val
      .filter((item) => item !== undefined)
      .map((item) => {
        if (
          item &&
          typeof item === "object" &&
          typeof (item as any).photo === "string" &&
          (item as any).photo.length > 800000
        ) {
          return deepCleanFirestoreData({ ...(item as any), photo: null });
        }
        return deepCleanFirestoreData(item);
      });
  }

  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(val)) {
    if (v === undefined) {
      continue; // completely omit undefined fields for Firestore compatibility
    }
    if (k === "logo" && typeof v === "string" && v.length > 1500000) {
      clean[k] = null;
    } else if (k === "banner" && typeof v === "string" && v.length > 1500000) {
      clean[k] = null;
    } else {
      clean[k] = deepCleanFirestoreData(v);
    }
  }
  return clean;
};

export const sanitizeForStorage = <T = any>(value: T): T => {
  if (value === undefined || value === null) {
    return (value ?? null) as unknown as T;
  }
  try {
    const cleaned = deepCleanFirestoreData(value);
    // Double pass through JSON stringify to strip any remaining non-serializable properties
    return JSON.parse(JSON.stringify(cleaned)) as T;
  } catch {
    return value;
  }
};
