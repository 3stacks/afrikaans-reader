import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.INTERNAL_API_URL || 'http://localhost:3457';

function forwardHeaders(request: NextRequest): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const evalToken = request.headers.get('X-Eval-Token');
  if (evalToken) headers['X-Eval-Token'] = evalToken;
  return headers;
}

// POST /api/translate-compare — proxy to compare endpoint
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action;
    delete body.action;

    const endpoint = action === 'evaluate' ? 'evaluate'
      : action === 'auto-evaluate' ? 'auto-evaluate'
      : 'compare';

    const response = await fetch(`${API_URL}/api/translate-compare/${endpoint}`, {
      method: 'POST',
      headers: forwardHeaders(request),
      body: JSON.stringify(body),
    });

    // Stream SSE responses through for auto-evaluate
    if (action === 'auto-evaluate' && response.body) {
      return new Response(response.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error('Translate compare error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Request failed' },
      { status: 500 }
    );
  }
}

// GET /api/translate-compare — proxy to evaluations or random-sentence
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    const endpoint = type === 'random' ? 'random-sentence' : 'evaluations';
    const params = new URLSearchParams();
    const format = searchParams.get('format');
    if (format) params.set('format', format);

    const evalToken = request.headers.get('X-Eval-Token') || searchParams.get('token');
    const headers: Record<string, string> = {};
    if (evalToken) headers['X-Eval-Token'] = evalToken;

    const url = `${API_URL}/api/translate-compare/${endpoint}${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url, { headers });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error('Translate compare GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Request failed' },
      { status: 500 }
    );
  }
}
