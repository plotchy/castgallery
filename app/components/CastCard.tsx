"use client";
import type { CompactCast, Embed, CompactEmbeddedCast, MinimalAuthor } from '@/app/compact_cast_interface';
import { PRIMARY_AUTHOR } from '@/lib/constants';

function tryFormatTime(iso?: string) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    // Display in Pacific Time to match time-based filters
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    return `${fmt.format(d)} PT`;
  } catch {
    return iso ?? '';
  }
}

function Avatar({ url, size = 28, alt }: { url?: string; size?: number; alt: string }) {
  const src = url ?? PRIMARY_AUTHOR.pfp_url ?? '';
  const a = alt || 'avatar';
  return (
    <div className="rounded-full overflow-hidden shrink-0" style={{ width: size, height: size }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={a} width={size} height={size} className="object-cover w-full h-full" />
    </div>
  );
}

function RenderImage({ url }: { url: string }) {
  return (
    <div className="rounded border overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="embed" className="w-full h-auto" loading="lazy" />
    </div>
  );
}

function isLikelyImageUrl(url: string): boolean {
  return /(\.png$|\.jpg$|\.jpeg$|\.gif$|\.webp$|imagedelivery\.net)/i.test(url);
}

function EmbeddedCast({ cast }: { cast: CompactEmbeddedCast }) {
  const author = cast.author ?? PRIMARY_AUTHOR;
  const handle = author.username ?? 'dwr.eth';
  const castUrl = cast.hash ? `https://farcaster.xyz/${handle}/${String(cast.hash).slice(0, 10)}` : null;
  const profileUrl = author.username
    ? `https://farcaster.xyz/${author.username}`
    : author.fid
    ? `https://farcaster.xyz/users/${author.fid}`
    : null;
  return (
    <div
      className="border rounded p-3 bg-black/5 dark:bg-white/5 overflow-hidden max-w-full cursor-pointer"
      onClick={(e) => {
        e.stopPropagation();
        if (castUrl) window.open(castUrl, '_blank');
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            if (profileUrl) window.open(profileUrl, '_blank');
          }}
        >
          <Avatar url={author.pfp_url} alt={author.display_name ?? author.username ?? 'author'} size={20} />
          <div className="text-xs">
            <div className="font-medium">{author.display_name ?? author.username ?? 'Unknown'}</div>
            {author.username && <div className="opacity-70">@{author.username}</div>}
          </div>
        </div>
      </div>
      {cast.text && <div className="whitespace-pre-wrap break-words text-sm mb-2">{cast.text}</div>}
      {/* nested embeds (images only for now) */}
      {cast.embeds && cast.embeds.length > 0 && (
        <div className="flex flex-col gap-2 max-w-full overflow-hidden">
          {cast.embeds.map((e, i) =>
            'url' in e && isLikelyImageUrl(e.url) ? <RenderImage key={i} url={e.url} /> : null
          )}
        </div>
      )}
    </div>
  );
}

function RenderEmbed({ embed }: { embed: Embed }) {
  if ('url' in embed) {
    const url = embed.url;
    return isLikelyImageUrl(url) ? (
      <RenderImage url={url} />
    ) : (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:underline break-all"
        onClick={(e) => e.stopPropagation()}
      >
        {url}
      </a>
    );
  }
  if ('cast' in embed) {
    return <EmbeddedCast cast={embed.cast} />;
  }
  if ('cast_id_hash' in embed) {
    return <div className="text-xs opacity-70 break-all">Quoted cast: {embed.cast_id_hash}</div>;
  }
  return null;
}

export function CastCard({ cast }: { cast: CompactCast }) {
  const author = PRIMARY_AUTHOR; // dataset is Dan's top-level casts
  const buildCastUrl = (hash?: string | null, byAuthor?: MinimalAuthor): string | null => {
    if (!hash) return null;
    const slug = String(hash).slice(0, 10);
    const handle = byAuthor?.username ?? author.username ?? 'dwr.eth';
    return `https://farcaster.xyz/${handle}/${slug}`;
  };
  const castUrl = buildCastUrl(cast.hash);
  const profileUrl = author.username ? `https://farcaster.xyz/${author.username}` : 'https://farcaster.xyz/dwr.eth';

  return (
    <article
      className="border rounded p-3 overflow-hidden max-w-full cursor-pointer"
      onClick={() => {
        if (castUrl) window.open(castUrl, '_blank');
      }}
    >
      <header className="flex items-center gap-2 mb-2">
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            if (profileUrl) window.open(profileUrl, '_blank');
          }}
        >
          <Avatar url={author.pfp_url} alt={author.display_name ?? author.username ?? 'author'} />
          <div className="text-sm">
            <div className="font-medium">{author.display_name ?? author.username}</div>
            {author.username && <div className="opacity-70">@{author.username}</div>}
          </div>
        </div>
        <div className="ml-auto text-xs opacity-70">{tryFormatTime(cast.timestamp)}</div>
      </header>

      {cast.text && <div className="whitespace-pre-wrap break-words mb-2">{cast.text}</div>}

      {cast.embeds && cast.embeds.length > 0 && (
        <div className="flex flex-col gap-2 mt-2 max-w-full overflow-hidden">
          {cast.embeds.map((e, i) => (
            <RenderEmbed key={i} embed={e} />
          ))}
        </div>
      )}

      <footer className="mt-3 text-xs opacity-80 flex gap-4 items-center">
        {typeof cast.reactions?.likes_count === 'number' && <span>❤ {cast.reactions?.likes_count}</span>}
        {typeof cast.reactions?.recasts_count === 'number' && <span>🔁 {cast.reactions?.recasts_count}</span>}
        {typeof cast.replies?.count === 'number' && <span>💬 {cast.replies?.count}</span>}
      </footer>
    </article>
  );
}


