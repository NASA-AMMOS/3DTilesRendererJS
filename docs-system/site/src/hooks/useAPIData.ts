import { useState, useEffect } from 'react';

interface ParsedClass {
  name: string;
  description: string;
  category?: string;
  extends?: string;
  examples: any[];
  constructor?: any;
  properties: any[];
  methods: any[];
  sourceFile: string;
  line: number;
}

interface APIDocumentation {
  version: string;
  generatedAt: string;
  classes: ParsedClass[];
}

let cachedData: APIDocumentation | null = null;

export function useAPIData(className?: string) {
  const [data, setData] = useState<APIDocumentation | null>(cachedData);
  const [loading, setLoading] = useState(!cachedData);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (cachedData) {
      setData(cachedData);
      setLoading(false);
      return;
    }

    fetch(`${import.meta.env.BASE_URL}api.json`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to load API data');
        return res.json();
      })
      .then((apiData: APIDocumentation) => {
        cachedData = apiData;
        setData(apiData);
        setLoading(false);
      })
      .catch(err => {
        setError(err);
        setLoading(false);
      });
  }, []);

  // If className is provided, return just that class
  const classData = className && data
    ? data.classes.find(c => c.name === className)
    : undefined;

  return {
    data,
    classData,
    loading,
    error,
  };
}
