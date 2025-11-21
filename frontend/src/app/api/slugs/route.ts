import { NextResponse } from 'next/server';
import { getPostSlugs } from '@/lib/strapi';

export async function GET() {
  try {
    const slugs = await getPostSlugs();
    return NextResponse.json(slugs);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch slugs' }, { status: 500 });
  }
}