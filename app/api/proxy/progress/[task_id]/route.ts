import { 
  updateTaskCache, 
  getTaskStateFromCache, 
  recordTaskFailure,
  shouldRetryAfterFailure 
} from '@/lib/taskStateCache';

export const runtime  = 'nodejs';
export const maxDuration = 30;

const decoder = new TextDecoder();

// Exponential backoff retry strategy
async function fetchProgressWithRetry(
  serverUrl: string,
  taskId: string,
  maxRetries: number = 3
): Promise<Response | null> {
  let lastError: any = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const aiRes = await fetch(
        `${serverUrl}/progress/${taskId}`,
        { signal: AbortSignal.timeout(30000) }
      );

      console.log(`[Attempt ${attempt + 1}/${maxRetries}] AI Server response status: ${aiRes.status}`);

      if (aiRes.ok) {
        return aiRes;
      }

      if (aiRes.status === 404) {
        recordTaskFailure(taskId);
        lastError = new Error(`Task not found (404)`);
        
        // Check if we should retry or fall back to cache
        if (!shouldRetryAfterFailure(taskId)) {
          console.warn(`Max retries reached for task ${taskId.substring(0, 8)}, using cached state`);
          return null; // Signal to use cache
        }

        // Exponential backoff: 500ms, 1000ms, 2000ms
        const waitTime = Math.min(500 * Math.pow(2, attempt), 5000);
        console.log(`Retrying after ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      // Other error status
      lastError = new Error(`AI server returned ${aiRes.status}`);
      if (!aiRes.ok) {
        const errorText = await aiRes.text();
        console.error(`AI Server error: ${aiRes.status} - ${errorText}`);
        return aiRes;
      }
    } catch (err: any) {
      lastError = err;
      console.error(`Fetch attempt ${attempt + 1} failed:`, err.message);
      
      if (attempt < maxRetries - 1) {
        const waitTime = Math.min(500 * Math.pow(2, attempt), 5000);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  console.error(`All retry attempts failed. Last error: ${lastError?.message}`);
  return null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ task_id: string }> }
) {
  const { task_id } = await params;

  try {
    const serverUrl = process.env.AI_SERVER_URL;
    console.log(`Polling progress for task: ${task_id} from ${serverUrl}`);
    
    const aiRes = await fetchProgressWithRetry(serverUrl!, task_id);

    // If aiRes is null, Modal is not responding - use cached state
    if (!aiRes) {
      const cachedState = getTaskStateFromCache(task_id);
      if (cachedState) {
        console.log(`Using cached state for task ${task_id.substring(0, 8)}`);
        return Response.json(cachedState);
      }
      
      return Response.json(
        { status: 'error', error: 'Task lost and cache expired' },
        { status: 503 } // Service Unavailable
      );
    }

    if (!aiRes.ok) {
      const errorText = await aiRes.text();
      console.error(`AI Server error: ${aiRes.status} - ${errorText}`);
      
      // Try to use cached state on error
      const cachedState = getTaskStateFromCache(task_id);
      if (cachedState) {
        console.log(`Using cached state due to server error`);
        return Response.json(cachedState);
      }
      
      return Response.json(
        { status: 'error', error: `AI server returned ${aiRes.status}` },
        { status: aiRes.status }
      );
    }

    const reader = aiRes.body!.getReader();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // SSE events are "data: {...}\n\n"
      const match = buffer.match(/data:\s*(.+)\n/);
      if (match) {
        reader.cancel(); // close upstream connection
        const payload = JSON.parse(match[1]);
        console.log('Progress data:', payload);
        
        // Cache successful response
        updateTaskCache(task_id, payload);
        
        return Response.json(payload);
      }
    }

    console.warn('No data from AI server in response');
    return Response.json({ status: 'error', error: 'No data from AI server' }, { status: 502 });
  } catch (err: any) {
    console.error('Progress endpoint error:', err);
    return Response.json({ status: 'error', error: err.message }, { status: 500 });
  }
}
