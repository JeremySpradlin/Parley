import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.API_URL || 'http://localhost:8000';

export async function GET(req: Request, context: any) {
  const { id } = context.params;
  try {
    const res = await fetch(`${BACKEND_URL}/conversation/${id}`, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 0 }
    });

    const data = await res.arrayBuffer();
    const resHeaders = new Headers();
    res.headers.forEach((value, key) => resHeaders.set(key, value));

    return new NextResponse(data, {
      status: res.status,
      headers: resHeaders
    });
  } catch (error: any) {
    return NextResponse.json({ detail: error.message || 'Proxy error' }, { status: 500 });
  }
} 