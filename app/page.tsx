"use client";
import { useEffect, useMemo, useState } from 'react';
import { CastCard } from '@/app/components/CastCard';
import { HintBorder } from '@/app/components/HintBorder';
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
  const [timeBucket, setTimeBucket] = useState<'midnight' | 'morning' | 'lunch' | null>(null);
  const [timePattern, setTimePattern] = useState<'topOfHour' | 'buzzerBeater' | 'elevenEleven' | 'duplicities' | null>(
    null
  );
  const [topEmojis, setTopEmojis] = useState<{ emoji: string; count: number }[]>([]);
  const [suggestions, setSuggestions] = useState<{ cast: Cast; score: number }[]>([]);
  const [hintTarget, setHintTarget] = useState<{ group: 'suggestions' | 'vibe' | 'sort' | 'timeBucket' | 'timePattern'; index: number } | null>(null);

  const chipClass = (active: boolean) =>
    `relative px-3 py-1 rounded-full border transition-colors ${
      active ? 'bg-foreground text-background' : 'hover:bg-foreground/10'
    }`;

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
    if (timeBucket) usp.set('timeBucket', timeBucket);
    if (timePattern) usp.set('timePattern', timePattern);
    usp.set('limit', '50');
    return usp.toString();
  }, [query, isQuote, hasImage, hasLink, selectedEmoji, oneWord, longform, sortBy, minLikes, minReplies, timeBucket, timePattern]);

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

  // Idle hint scheduler: pick one random chip for 1s, 2s pause
  useEffect(() => {
    const noSelections =
      !query && !selectedEmoji && !oneWord && !longform && sortBy === 'newest' && minLikes === null && minReplies === null && !timeBucket && !timePattern;
    if (!noSelections) {
      setHintTarget(null);
      return;
    }
    let timeoutId: number | null = null;
    const cycle = () => {
      const suggestionCount = 13;
      const groups: Array<{ g: 'suggestions' | 'vibe' | 'sort' | 'timeBucket' | 'timePattern'; n: number }> = [
        { g: 'suggestions', n: suggestionCount },
        { g: 'vibe', n: 2 },
        { g: 'sort', n: 2 },
        { g: 'timeBucket', n: 3 },
        { g: 'timePattern', n: 4 },
      ];
      const total = groups.reduce((s, x) => s + x.n, 0);
      const r = Math.floor(Math.random() * total);
      let acc = 0;
      for (const g of groups) {
        if (r < acc + g.n) {
          setHintTarget({ group: g.g, index: r - acc });
          break;
        }
        acc += g.n;
      }
      timeoutId = window.setTimeout(() => {
        setHintTarget(null);
        timeoutId = window.setTimeout(cycle, 2000);
      }, 4000);
    };
    cycle();
    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [query, selectedEmoji, oneWord, longform, sortBy, minLikes, minReplies, timeBucket, timePattern]);

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
    minReplies !== null || timeBucket !== null || timePattern !== null;

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
              {
                label: 'wow',
                active: query === 'wow',
                onClick: () => setQuery((q) => (q === 'wow' ? '' : 'wow')),
              },
              {
                label: 'welcome',
                active: query === 'welcome',
                onClick: () => setQuery((q) => (q === 'welcome' ? '' : 'welcome')),
              },
              {
                label: 'gm',
                active: query === 'gm',
                onClick: () => setQuery((q) => (q === 'gm' ? '' : 'gm')),
              },
              {
                label: 'excited',
                active: query === 'excited',
                onClick: () => setQuery((q) => (q === 'excited' ? '' : 'excited')),
              },
              {
                label: '$',
                active: query === '$',
                onClick: () => setQuery((q) => (q === '$' ? '' : '$')),
              },
            ];
            return buttons.map((b, idx) => (
              <button
                key={b.label}
                onClick={b.onClick}
                className={chipClass(b.active)}
                aria-pressed={b.active}
              >
                <HintBorder active={!hasActiveFilters && hintTarget?.group === 'suggestions' && hintTarget.index === idx} />
                {b.label}
              </button>
            ));
          })()}
        </div>

        {/* stack separator */}
        <div className="my-3 border-t border-foreground/15" />

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
            className={chipClass(oneWord)}
            aria-pressed={oneWord}
          >
            <HintBorder active={!hasActiveFilters && hintTarget?.group === 'vibe' && hintTarget.index === 0} />
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
            className={chipClass(longform)}
            aria-pressed={longform}
          >
            <HintBorder active={!hasActiveFilters && hintTarget?.group === 'vibe' && hintTarget.index === 1} />
            Longform
          </button>
        </div>

        {/* Engagement sort (compact chips) */}
        <div className="flex flex-wrap gap-2 mb-3 text-sm">
          {(
            [
              { key: 'likes', label: 'Most Likes' },
              { key: 'replies', label: 'Most Replies' },
            ] as const
          ).map((o, idx) => (
            <button
              key={o.key}
              onClick={() => setSortBy((curr) => (curr === o.key ? 'newest' : o.key))}
                className={chipClass(sortBy === o.key)}
              aria-pressed={sortBy === o.key}
            >
              <HintBorder active={!hasActiveFilters && hintTarget?.group === 'sort' && hintTarget.index === idx} />
              {o.label}
            </button>
          ))}
        </div>

        {/* Quick picks for high engagement */}
        <div className="flex flex-wrap gap-2 mb-3 text-sm">
          <button
            className={chipClass(minLikes !== null)}
            onClick={() => setMinLikes((v) => (v === null ? 100 : null))}
            aria-pressed={minLikes !== null}
          >
            ❤ 100+
          </button>
          <button
            className={chipClass(minReplies !== null)}
            onClick={() => setMinReplies((v) => (v === null ? 10 : null))}
            aria-pressed={minReplies !== null}
          >
            💬 10+
          </button>
          {/* Removed Top Recasts quick pick */}
        </div>

        {/* stack separator */}
        <div className="my-3 border-t border-foreground/15" />

        {/* Time-based collections (Pacific Time) */}
        <div className="flex flex-wrap gap-2 mb-3 text-sm">
          {(
            [
              { key: 'midnight', label: 'Midnight hour' },
              { key: 'morning', label: 'Morning grind' },
              { key: 'lunch', label: 'Lunch casts' },
            ] as const
          ).map((b, idx) => (
            <button
              key={b.key}
              onClick={() => setTimeBucket((curr) => (curr === b.key ? null : b.key))}
                className={chipClass(timeBucket === b.key)}
              aria-pressed={timeBucket === b.key}
            >
              <HintBorder active={!hasActiveFilters && hintTarget?.group === 'timeBucket' && hintTarget.index === idx} />
              {b.label}
            </button>
          ))}
        </div>

        {/* Time patterns */}
        <div className="flex flex-wrap gap-2 mb-3 text-sm">
          {(
            [
              { key: 'topOfHour', label: 'Top of hour :00' },
              { key: 'buzzerBeater', label: 'Buzzer beater :59' },
              { key: 'elevenEleven', label: '11:11 club' },
              { key: 'duplicities', label: '2:22 • 3:33 • 4:44 • 5:55' },
            ] as const
          ).map((b, idx) => (
            <button
              key={b.key}
              onClick={() => setTimePattern((curr) => (curr === b.key ? null : b.key))}
                className={chipClass(timePattern === b.key)}
              aria-pressed={timePattern === b.key}
            >
              <HintBorder active={!hasActiveFilters && hintTarget?.group === 'timePattern' && hintTarget.index === idx} />
              {b.label}
            </button>
          ))}
        </div>

        {/* stack separator */}
        <div className="my-3 border-t border-foreground/15" />

        {/* Emoji suggestions */}
        <div className="mb-3">
          <div className="text-sm mb-1">Top emojis</div>
          <div className="flex flex-wrap gap-2">
            {topEmojis.map((e) => (
              <button
                key={e.emoji}
                className={`${chipClass(selectedEmoji === e.emoji)} text-base`}
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
            {timeBucket && (
              <button className="px-3 py-1 rounded-full border" onClick={() => setTimeBucket(null)}>
                Time: {timeBucket} ✕
              </button>
            )}
            {timePattern && (
              <button className="px-3 py-1 rounded-full border" onClick={() => setTimePattern(null)}>
                Pattern ✕
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
                setTimeBucket(null);
                setTimePattern(null);
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
