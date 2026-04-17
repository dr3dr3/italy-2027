import { formatRelative } from "@/lib/dates";
import { extractYouTubeId } from "@/lib/youtube";
import type { VideoRow } from "@/lib/queries/videos";
import { DeleteVideoButton } from "./delete-video-button";

export function VideoEmbed({
  video,
  currentUserId,
  isEditor,
}: {
  video: VideoRow;
  currentUserId: number | null;
  isEditor: boolean;
}) {
  const videoId = extractYouTubeId(video.youtubeUrl);
  if (!videoId) return null;

  const canDelete =
    currentUserId !== null && (video.userId === currentUserId || isEditor);

  return (
    <div>
      <div className="max-w-[480px]">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}`}
          className="aspect-video w-full rounded-lg"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={video.note ?? "YouTube video"}
        />
      </div>
      <div className="mt-2 flex items-baseline justify-between gap-4">
        <span className="text-xs text-ink/50">
          {video.authorName ?? "Anon"} · {formatRelative(video.createdAt)}
        </span>
        {canDelete && <DeleteVideoButton videoId={video.id} />}
      </div>
      {video.note && (
        <p className="mt-1 text-sm text-ink">{video.note}</p>
      )}
    </div>
  );
}
