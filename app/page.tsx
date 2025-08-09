"use client";
import { useEffect, useMemo, useState } from 'react';
import { CastCard } from '@/app/components/CastCard';
import type { CompactCast } from '@/app/compact_cast_interface';

type Cast = CompactCast;

type ApiResponse = {
  results: Cast[];
  total: number;
  facets?: {
    topEmojis: { emoji: string; count: number }[];
    counts: { quotes: number; images: number; links: number };
  };
  suggestions?: { cast: Cast; score: number }[];
};

export default function Home() {
  const [query, setQuery] = useState('');
  const [casts, setCasts] = useState<Cast[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  // Removed quick filter buttons for quotes/images/links; keep state for URL compatibility if needed
  const [isQuote, setIsQuote] = useState<boolean | undefined>(undefined);
  const [hasImage, setHasImage] = useState<boolean | undefined>(undefined);
  const [hasLink, setHasLink] = useState<boolean | undefined>(undefined);
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [oneWord, setOneWord] = useState(false);
  const [longform, setLongform] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'likes' | 'replies'>('newest');
  const [minLikes, setMinLikes] = useState<number | null>(null);
  const [minReplies, setMinReplies] = useState<number | null>(null);
  const [topEmojis, setTopEmojis] = useState<{ emoji: string; count: number }[]>([]);
  const [suggestions, setSuggestions] = useState<{ cast: Cast; score: number }[]>([]);

  const params = useMemo(() => {
    const usp = new URLSearchParams();
    if (query) usp.set('q', query);
    // No more UI buttons for these. We still support querystring if present later.
    if (isQuote === true) usp.set('isQuote', '1');
    if (hasImage === true) usp.set('hasImage', '1');
    if (hasLink === true) usp.set('hasLink', '1');
    if (selectedEmoji) usp.append('emoji', selectedEmoji);
    if (oneWord) usp.set('oneWord', '1');
    if (longform) usp.set('longform', '1');
    if (sortBy && sortBy !== 'newest') usp.set('sortBy', sortBy);
    if (minLikes !== null) usp.set('minLikes', String(minLikes));
    if (minReplies !== null) usp.set('minReplies', String(minReplies));
    usp.set('limit', '50');
    return usp.toString();
  }, [query, isQuote, hasImage, hasLink, selectedEmoji, oneWord, longform, sortBy, minLikes, minReplies]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/casts?${params}`)
      .then((r) => r.json())
      .then((d: ApiResponse) => {
        if (cancelled) return;
        setCasts(d.results);
        setTotal(d.total);
        setTopEmojis(d.facets?.topEmojis ?? []);
        setSuggestions(d.suggestions ?? []);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [params]);

  // Quick filter chip handler removed

  const toggleEmoji = (emoji: string) => {
    setSelectedEmoji((curr) => (curr === emoji ? null : emoji));
  };

  const hasActiveFilters =
    !!query ||
    !!selectedEmoji ||
    oneWord ||
    longform ||
    sortBy !== 'newest' ||
    minLikes !== null ||
    minReplies !== null;

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-xl sm:text-2xl font-semibold mb-3">DWR Cast Gallery</h1>

        {/* Search bar */}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search…"
          className="w-full border rounded px-3 py-2 mb-3 bg-transparent"
        />

        {/* Opinionated suggestions (toggleable) */}
        <div className="flex flex-wrap gap-2 mb-3 text-sm">
          {(() => {
            const buttons = [
              {
                label: 'banger',
                active: query === 'banger',
                onClick: () => setQuery((q) => (q === 'banger' ? '' : 'banger')),
              },
              {
                label: 'lol',
                active: query === 'lol',
                onClick: () => setQuery((q) => (q === 'lol' ? '' : 'lol')),
              },
              {
                label: 'haha',
                active: query === 'haha',
                onClick: () => setQuery((q) => (q === 'haha' ? '' : 'haha')),
              },
              {
                label: 'wtf',
                active: query === 'wtf',
                onClick: () => setQuery((q) => (q === 'wtf' ? '' : 'wtf')),
              },
              {
                label: 'lmao',
                active: query === 'lmao',
                onClick: () => setQuery((q) => (q === 'lmao' ? '' : 'lmao')),
              },
              {
                label: 'congrats',
                active: query === 'congrats',
                onClick: () => setQuery((q) => (q === 'congrats' ? '' : 'congrats')),
              },
              {
                label: 'insane',
                active: query === 'insane',
                onClick: () => setQuery((q) => (q === 'insane' ? '' : 'insane')),
              },
            ];
            return buttons.map((b) => (
              <button
                key={b.label}
                onClick={b.onClick}
                className={`px-3 py-1 rounded-full border ${b.active ? 'bg-foreground text-background' : ''}`}
                aria-pressed={b.active}
              >
                {b.label}
              </button>
            ));
          })()}
        </div>

        {/* Viral vibe filters */}
        <div className="flex flex-wrap gap-2 mb-3 text-sm">
          <button
            onClick={() =>
              setOneWord((prev) => {
                const next = !prev;
                if (next) setLongform(false);
                return next;
              })
            }
            className={`px-3 py-1 rounded-full border ${oneWord ? 'bg-foreground text-background' : ''}`}
            aria-pressed={oneWord}
          >
            One-word
          </button>
          <button
            onClick={() =>
              setLongform((prev) => {
                const next = !prev;
                if (next) setOneWord(false);
                return next;
              })
            }
            className={`px-3 py-1 rounded-full border ${longform ? 'bg-foreground text-background' : ''}`}
            aria-pressed={longform}
          >
            Longform
          </button>
        </div>

        {/* Engagement sort (compact chips) */}
        <div className="flex flex-wrap gap-2 mb-3 text-sm">
          {(
            [
              { key: 'likes', label: 'Top Likes' },
              { key: 'replies', label: 'Top Replies' },
            ] as const
          ).map((o) => (
            <button
              key={o.key}
              onClick={() => setSortBy((curr) => (curr === o.key ? 'newest' : o.key))}
              className={`px-3 py-1 rounded-full border ${sortBy === o.key ? 'bg-foreground text-background' : ''}`}
              aria-pressed={sortBy === o.key}
            >
              {o.label}
            </button>
          ))}
        </div>

        {/* Quick picks for high engagement */}
        <div className="flex flex-wrap gap-2 mb-3 text-sm">
          <button
            className={`px-3 py-1 rounded-full border ${minLikes !== null ? 'bg-foreground text-background' : ''}`}
            onClick={() => setMinLikes((v) => (v === null ? 100 : null))}
            aria-pressed={minLikes !== null}
          >
            ❤ 100+
          </button>
          <button
            className={`px-3 py-1 rounded-full border ${minReplies !== null ? 'bg-foreground text-background' : ''}`}
            onClick={() => setMinReplies((v) => (v === null ? 10 : null))}
            aria-pressed={minReplies !== null}
          >
            💬 10+
          </button>
          {/* Removed Top Recasts quick pick */}
        </div>

        {/* Emoji suggestions */}
        <div className="mb-3">
          <div className="text-sm mb-1">Top emojis</div>
          <div className="flex flex-wrap gap-2">
            {topEmojis.map((e) => (
              <button
                key={e.emoji}
                className={`px-3 py-1 rounded-full border text-base ${
                  selectedEmoji === e.emoji ? 'bg-foreground text-background' : ''
                }`}
                onClick={() => toggleEmoji(e.emoji)}
                title={`${e.count} uses`}
              >
                {e.emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Active filters */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 mb-3 text-sm">
            {query && <span className="px-3 py-1 rounded-full border">q: “{query}”</span>}
            {/* Removed link/image/quote chips */}
            {selectedEmoji && (
              <button className="px-3 py-1 rounded-full border" onClick={() => setSelectedEmoji(null)}>
                {selectedEmoji} ✕
              </button>
            )}
            {oneWord && (
              <button className="px-3 py-1 rounded-full border" onClick={() => setOneWord(false)}>
                One-word ✕
              </button>
            )}
            {longform && (
              <button className="px-3 py-1 rounded-full border" onClick={() => setLongform(false)}>
                Longform ✕
              </button>
            )}
            {sortBy !== 'newest' && (
              <button className="px-3 py-1 rounded-full border" onClick={() => setSortBy('newest')}>
                Sort: {sortBy} ✕
              </button>
            )}
            {minLikes !== null && (
              <button className="px-3 py-1 rounded-full border" onClick={() => setMinLikes(null)}>
                ❤ ≥ {minLikes} ✕
              </button>
            )}
            {minReplies !== null && (
              <button className="px-3 py-1 rounded-full border" onClick={() => setMinReplies(null)}>
                💬 ≥ {minReplies} ✕
              </button>
            )}
            {/* Removed recasts chip */}
            <button
              className="px-3 py-1 rounded-full border"
              onClick={() => {
                setQuery('');
                setIsQuote(undefined);
                setHasImage(undefined);
                setHasLink(undefined);
                setSelectedEmoji(null);
                setOneWord(false);
                setLongform(false);
                setSortBy('newest');
                setMinLikes(null);
                setMinReplies(null);
                // none
              }}
            >
              Clear all
            </button>
          </div>
        )}

        <div className="text-sm mb-2">{loading ? 'Loading…' : `${total} results`}</div>

        {/* Results */}
        <ul className="space-y-3">
          {casts.map((c) => (
            <li key={c.hash}>
              <CastCard cast={c} />
            </li>
          ))}
        </ul>

        {/* Fuzzy suggestions when no exact results */}
        {!loading && total === 0 && suggestions.length > 0 && (
          <div className="mt-6">
            <div className="text-sm mb-2 opacity-80">Closest matches</div>
            <ul className="space-y-3">
              {suggestions.map((s, i) => (
                <li key={`${s.cast.hash}-${i}`}>
                  <CastCard cast={s.cast} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
