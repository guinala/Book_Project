import { useCallback, useEffect, useRef, useState } from "react";

export function useObjectUrl(initialUrl: string | null = null) {
  const [url, setUrl] = useState<string | null>(initialUrl);
  const urlRef = useRef(url);

  useEffect(() => {
    urlRef.current = url;
  }, [url]);

  useEffect(() => () => {
    if (urlRef.current?.startsWith("blob:")) {
      URL.revokeObjectURL(urlRef.current);
    }
  }, []);

  const setFile = useCallback((file: File | null) => {
    if (urlRef.current?.startsWith("blob:")) {
      URL.revokeObjectURL(urlRef.current);
    }

    setUrl(file ? URL.createObjectURL(file) : null);
  }, []);

  return { url, setUrl, setFile };
}
