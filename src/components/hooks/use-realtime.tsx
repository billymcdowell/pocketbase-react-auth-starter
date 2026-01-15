import { useState, useEffect, useRef, useCallback } from 'react';
import type { RecordModel } from 'pocketbase';
import {pb} from '@/services/pocketbase';

interface UseRealtimeOptions {
  filter?: string;
  sort?: string;
  expand?: string;
  realtime?: boolean;
}

interface UseRealtimeResult<T extends RecordModel> {
  data: T[];
  loading: boolean;
  error: Error | null;
  refresh: () => void;
}

export const useRealtime = <T extends RecordModel>(
  collectionName: string,
  options: UseRealtimeOptions = {}
): UseRealtimeResult<T> => {
  const {
    filter = '',
    sort = '-created',
    expand = '',
    realtime = true
  } = options;

  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Fetch initial data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const records = await pb.collection(collectionName).getFullList<T>({
        filter,
        sort,
        expand
      });

      setData(records);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
    } finally {
      setLoading(false);
    }
  }, [collectionName, filter, sort, expand]);

  // Subscribe to real-time updates
  const subscribe = useCallback(async () => {
    if (!realtime) return;

    try {
      const unsubscribe = await pb.collection(collectionName).subscribe<T>('*', async (e) => {
        setData(prevData => {
          switch (e.action) {
            case 'create':
              // For create, we need to fetch the full record with expand
              if (expand) {
                pb.collection(collectionName).getOne<T>(e.record.id, { expand })
                  .then(fullRecord => {
                    setData(currentData => [fullRecord, ...currentData]);
                  })
                  .catch(err => {
                    console.error('Failed to fetch expanded record:', err);
                    // Fallback to the record without expand
                    setData(currentData => [e.record, ...currentData]);
                  });
                return prevData; // Return current data while fetching
              }
              return [e.record, ...prevData];
            case 'update':
              // For update, we need to fetch the full record with expand
              if (expand) {
                pb.collection(collectionName).getOne<T>(e.record.id, { expand })
                  .then(fullRecord => {
                    setData(currentData => 
                      currentData.map(item => 
                        item.id === e.record.id ? fullRecord : item
                      )
                    );
                  })
                  .catch(err => {
                    console.error('Failed to fetch expanded record:', err);
                    // Fallback to the record without expand
                    setData(currentData => 
                      currentData.map(item => 
                        item.id === e.record.id ? e.record : item
                      )
                    );
                  });
                return prevData; // Return current data while fetching
              }
              return prevData.map(item => 
                item.id === e.record.id ? e.record : item
              );
            case 'delete':
              return prevData.filter(item => item.id !== e.record.id);
            default:
              return prevData;
          }
        });
      });

      unsubscribeRef.current = unsubscribe;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Subscription failed');
      setError(error);
    }
  }, [collectionName, realtime, expand]);

  // Cleanup subscription
  const cleanup = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
  }, []);

  // Refresh data manually
  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Setup real-time subscription
  useEffect(() => {
    if (realtime && data.length > 0) {
      subscribe();
    }
    return cleanup;
  }, [subscribe, cleanup, realtime, data.length]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    data,
    loading,
    error,
    refresh
  };
};

// Example usage:
/*
import { useRealtime } from './useRealtime';

interface Todo {
  id: string;
  title: string;
  completed: boolean;
  created: string;
}

function TodoList() {
  const { data: todos, loading, error, refresh } = useRealtime<Todo>(
    'todos',
    {
      filter: 'completed = false',
      sort: '-created',
      expand: 'user'
    }
  );

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <button onClick={refresh}>Refresh</button>
      {todos.map(todo => (
        <div key={todo.id}>{todo.title}</div>
      ))}
    </div>
  );
}

// utils/pocketbase.ts
import PocketBase from 'pocketbase';

export const pb = new PocketBase('http://127.0.0.1:8090');
*/

interface UseRealtimeSingleOptions {
  expand?: string;
  realtime?: boolean;
}

interface UseRealtimeSingleResult<T extends RecordModel> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refresh: () => void;
}

export const useRealtimeSingle = <T extends RecordModel>(
  collectionName: string,
  recordId: string,
  options: UseRealtimeSingleOptions = {}
): UseRealtimeSingleResult<T> => {
  const {
    expand = '',
    realtime = true
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Fetch initial data
  const fetchData = useCallback(async () => {
    if (!recordId) {
      setData(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const record = await pb.collection(collectionName).getOne<T>(recordId, {
        expand
      });

      setData(record);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [collectionName, recordId, expand]);

  // Subscribe to real-time updates
  const subscribe = useCallback(async () => {
    if (!realtime || !recordId) return;

    try {
      const unsubscribe = await pb.collection(collectionName).subscribe<T>(recordId, async (e) => {
        switch (e.action) {
          case 'update':
            // For update, we need to fetch the full record with expand
            if (expand) {
              try {
                const fullRecord = await pb.collection(collectionName).getOne<T>(e.record.id, { expand });
                setData(fullRecord);
              } catch (err) {
                console.error('Failed to fetch expanded record:', err);
                // Fallback to the record without expand
                setData(e.record);
              }
            } else {
              setData(e.record);
            }
            break;
          case 'delete':
            setData(null);
            break;
          default:
            // For create action, we don't need to do anything since we're watching a specific record
            break;
        }
      });

      unsubscribeRef.current = unsubscribe;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Subscription failed');
      setError(error);
    }
  }, [collectionName, recordId, realtime, expand]);

  // Cleanup subscription
  const cleanup = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
  }, []);

  // Refresh data manually
  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Setup real-time subscription
  useEffect(() => {
    if (realtime && recordId) {
      subscribe();
    }
    return cleanup;
  }, [subscribe, cleanup, realtime, recordId]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    data,
    loading,
    error,
    refresh
  };
};

// Example usage for useRealtimeSingle:
/*
import { useRealtimeSingle } from './useRealtime';

interface Todo {
  id: string;
  title: string;
  completed: boolean;
  created: string;
}

function TodoDetail({ todoId }: { todoId: string }) {
  const { data: todo, loading, error, refresh } = useRealtimeSingle<Todo>(
    'todos',
    todoId,
    {
      expand: 'user'
    }
  );

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!todo) return <div>Todo not found</div>;

  return (
    <div>
      <button onClick={refresh}>Refresh</button>
      <h2>{todo.title}</h2>
      <p>Completed: {todo.completed ? 'Yes' : 'No'}</p>
    </div>
  );
}
*/