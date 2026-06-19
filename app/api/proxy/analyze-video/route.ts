import { NextResponse } from 'next/server';
import { updateTaskCache } from '@/lib/taskStateCache';

export const runtime = 'nodejs';
export const maxDuration = 300; // 60 minutes for very large video uploads

export async function POST(req: Request) {
  try {
    const serverUrl = process.env.AI_SERVER_URL;
    console.log('AI_SERVER_URL:', serverUrl);
    
    if (!serverUrl) {
      return NextResponse.json(
        { error: 'AI_SERVER_URL environment variable not configured' },
        { status: 500 }
      );
    }

    const contentType = req.headers.get('content-type') ?? 'multipart/form-data';
    
    console.log('Forwarding request to Modal:', {
      contentType,
      url: `${serverUrl}/analyze-video`
    });

    // Stream the request body directly without buffering
    const aiRes = await fetch(`${serverUrl}/analyze-video`, {
      method: 'POST',
      body: req.body,
      headers: {
        'content-type': contentType,
      },
      // @ts-ignore - required for streaming in Node.js
      duplex: 'half',
      // No timeout - let it take as long as needed
    });

    console.log('AI Response status:', aiRes.status);

    if (aiRes.status >= 300 && aiRes.status < 400) {
      console.error('REDIRECT FROM AI SERVER:', aiRes.status, aiRes.headers.get('location'));
      return NextResponse.json(
        { error: `Unexpected redirect from AI server (${aiRes.status})` },
        { status: 502 }
      );
    }

    if (!aiRes.ok) {
      const errorText = await aiRes.text();
      console.error('AI Error response:', errorText);
      return NextResponse.json(
        { error: 'AI server error', details: errorText },
        { status: aiRes.status }
      );
    }

    const data = await aiRes.json();
    console.log('AI Response:', data);
    
    // Cache the initial task state
    if (data.task_id) {
      updateTaskCache(data.task_id, {
        status: 'processing',
        percent: 0,
        progress: 0,
        total_frames: 0,
        potholes_found: 0,
      });
      console.log(`Task cached: ${data.task_id}`);
    }
    
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('PROXY ERROR:', err);
    console.error('Error code:', err.code);
    return NextResponse.json(
      { 
        error: err.message,
        code: err.code,
      },
      { status: 500 }
    );
  }
}
