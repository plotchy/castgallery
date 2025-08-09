import { NextRequest } from 'next/server';
import { repository } from '@/lib/repository';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') ?? undefined;
  const offset = parseInt(searchParams.get('offset') ?? '0', 10);
  const limit = parseInt(searchParams.get('limit') ?? '50', 10);

  const isQuoteParam = searchParams.get('isQuote');
  const hasImageParam = searchParams.get('hasImage');
  const hasLinkParam = searchParams.get('hasLink');
  const oneWordParam = searchParams.get('oneWord');
  const longformParam = searchParams.get('longform');
  const dateFrom = searchParams.get('dateFrom') ?? undefined;
  const dateTo = searchParams.get('dateTo') ?? undefined;
  const emojis = searchParams.getAll('emoji');
  const minLikes = searchParams.get('minLikes');
  const minReplies = searchParams.get('minReplies');
  const sortBy = (searchParams.get('sortBy') ?? undefined) as
    | 'newest'
    | 'likes'
    | 'replies'
    | undefined;

  const isQuote = isQuoteParam !== null ? isQuoteParam === '1' : undefined;
  const hasImage = hasImageParam !== null ? hasImageParam === '1' : undefined;
  const hasLink = hasLinkParam !== null ? hasLinkParam === '1' : undefined;
  const oneWord = oneWordParam !== null ? oneWordParam === '1' : undefined;
  const longform = longformParam !== null ? longformParam === '1' : undefined;

  const data = await repository.search({
    q,
    offset,
    limit,
    isQuote,
    hasImage,
    hasLink,
    oneWord,
    longform,
    dateFrom,
    dateTo,
    emojis: emojis.length ? emojis : undefined,
    minLikes: minLikes ? Number(minLikes) : undefined,
    minReplies: minReplies ? Number(minReplies) : undefined,
    sortBy,
  });
  return Response.json(data, { status: 200 });
}



