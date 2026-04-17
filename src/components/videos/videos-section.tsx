import type { VideoRow } from "@/lib/queries/videos";
import { VideoEmbed } from "./video-embed";
import { VideoForm } from "./video-form";

export function VideosSection({
  stopId,
  videos,
  currentUserId,
  isEditor,
}: {
  stopId: number;
  videos: VideoRow[];
  currentUserId: number | null;
  isEditor: boolean;
}) {
  return (
    <div className="mt-4 space-y-4">
      {videos.map((v) => (
        <VideoEmbed
          key={v.id}
          video={v}
          currentUserId={currentUserId}
          isEditor={isEditor}
        />
      ))}
      <VideoForm stopId={stopId} isEmpty={videos.length === 0} />
    </div>
  );
}
