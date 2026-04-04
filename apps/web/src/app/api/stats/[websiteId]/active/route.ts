import { NextRequest, NextResponse } from 'next/server';
import { getAnalyticsRepository } from '@/lib/analytics';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ websiteId: string }> },
) {
  const { websiteId } = await params;

  try {
    const repo = await getAnalyticsRepository();
    const count = await repo.getActiveVisitors(websiteId);

    return NextResponse.json({ active: count }, {
      headers: { 'Cache-Control': 'private, max-age=30' },
    });
  } catch (error) {
    console.error('[stats/active] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch active visitors' }, { status: 500 });
  }
}
