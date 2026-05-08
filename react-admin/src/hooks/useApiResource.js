import { useCallback, useEffect, useRef, useState } from "react";

const identity = (value) => value;

export function getApiErrorMessage(error, fallback = "Co loi xay ra.") {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
}

export default function useApiResource(request, options = {}) {
  const {
    immediate = true,
    initialData = null,
    mapData = identity,
  } = options;

  const mountedRef = useRef(false);
  const requestIdRef = useRef(0);
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState("");

  const reload = useCallback(async (...args) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);
    setError("");

    try {
      const result = await request(...args);
      const nextData = mapData(result);

      if (mountedRef.current && requestId === requestIdRef.current) {
        setData(nextData);
      }

      return nextData;
    } catch (err) {
      const message = getApiErrorMessage(err);

      if (mountedRef.current && requestId === requestIdRef.current) {
        setError(message);
      }

      throw err;
    } finally {
      if (mountedRef.current && requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [mapData, request]);

  useEffect(() => {
    mountedRef.current = true;

    if (immediate) {
      reload().catch(() => {});
    }

    return () => {
      mountedRef.current = false;
      requestIdRef.current += 1;
    };
  }, [immediate, reload]);

  return {
    data,
    setData,
    loading,
    error,
    setError,
    reload,
  };
}
