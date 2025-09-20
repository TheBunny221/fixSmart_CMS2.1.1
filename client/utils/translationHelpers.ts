export const mergeWithFallback = <T>(value: unknown, fallback: T): T => {
  if (Array.isArray(fallback)) {
    const valueArray = Array.isArray(value) ? value : [];
    return fallback.map((item, index) =>
      mergeWithFallback(valueArray[index], item),
    ) as T;
  }

  if (fallback && typeof fallback === "object") {
    const result: Record<string, unknown> = {};
    const valueObject =
      value && typeof value === "object" ? (value as Record<string, unknown>) : {};
    const keys = new Set([
      ...Object.keys(fallback as Record<string, unknown>),
      ...Object.keys(valueObject),
    ]);

    keys.forEach((key) => {
      result[key] = mergeWithFallback(
        valueObject[key],
        (fallback as Record<string, unknown>)[key],
      );
    });

    return result as T;
  }

  if (typeof value === "string") {
    return (value.trim().length > 0 ? value : fallback) as T;
  }

  return (value ?? fallback) as T;
};
