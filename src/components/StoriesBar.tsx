import { useState } from 'react';
import { useReactToStoryMutation } from '../store/communityApi';
import type { MockStory } from '../data/mockData';
import './StoriesBar.css';

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

/** Reaction label map (replaces emojis with text labels) */
const reactionLabels: Record<string, string> = {
  hot: 'Hot',
  relatable: 'Same',
  thanks: 'Thanks',
  love: 'Love',
  nice: 'Nice',
  rush: 'Rush',
};

/**
 * Full-screen story viewer -- opened from PinStories
 */
function StoryViewer({ stories, startIndex, onClose }: {
  stories: MockStory[];
  startIndex: number;
  onClose: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const story = stories[currentIndex];
  const [reactToStory] = useReactToStoryMutation();

  const goNext = () => {
    if (currentIndex < stories.length - 1) setCurrentIndex(currentIndex + 1);
    else onClose();
  };

  const goPrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  if (!story) return null;

  return (
    <div className="storyViewerOverlay" id="story-viewer">
      {/* Progress bars */}
      <div className="storyProgress">
        {stories.map((_, i) => (
          <div key={i} className="storyProgressBar">
            <div className={`storyProgressFill ${
              i < currentIndex ? 'done' : i === currentIndex ? 'active' : ''
            }`} />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="storyHeader">
        <div className="storyHeaderAvatar">{story.postedByAvatar}</div>
        <div className="storyHeaderInfo">
          <div className="storyHeaderName">{story.postedBy}</div>
          <div className="storyHeaderTime">{getTimeAgo(story.createdAt)} -- {story.location}</div>
        </div>
        <button className="storyHeaderClose" onClick={onClose}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Image */}
      <div className="storyImage" style={{ backgroundImage: `url(${story.imageUrl})` }}>
        <div className="storyImageNav left" onClick={goPrev} />
        <div className="storyImageNav right" onClick={goNext} />

        <div className="storyCaption">
          {story.type === 'line-report' && 'LINE: '}
          {story.caption}
          <div className="storyCaptionLocation">{story.location}</div>
        </div>
      </div>

      {/* Footer with reactions */}
      <div className="storyFooter">
        {Object.entries(story.reactions).map(([key, count]) => (
          <button key={key} className="storyReactionBtn" onClick={() => {
            reactToStory({ id: story.id, emoji: key }).catch(() => {});
          }}>
            {reactionLabels[key] || key} <span className="storyReactionCount">{count as React.ReactNode}</span>
          </button>
        ))}
        <div className="storyCreditBadge">+5 pts</div>
      </div>
    </div>
  );
}

/**
 * PinStories -- embedded in BottomSheet when a pin has live stories.
 * Shows a horizontal row of story thumbnails + full-screen viewer on tap.
 */
export function PinStories({ stories }: { stories: MockStory[] }) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerStartIndex, setViewerStartIndex] = useState(0);

  if (stories.length === 0) return null;

  const openStory = (index: number) => {
    setViewerStartIndex(index);
    setViewerOpen(true);
  };

  const typeLabel = (type: string) => {
    if (type === 'line-report') return 'LINE';
    if (type === 'crowd-shot') return 'CROWD';
    return 'UPDATE';
  };

  return (
    <>
      <div className="pinStoriesSection" id="pin-stories">
        <div className="pinStoriesHeader">
          <span className="pinStoriesLiveDot" />
          Live from here -- {stories.length} update{stories.length !== 1 ? 's' : ''}
        </div>
        <div className="pinStoriesRow">
          {stories.map((story, i) => (
            <div
              key={story.id}
              className="pinStoryThumb"
              onClick={() => openStory(i)}
            >
              <div
                className="pinStoryThumbImg"
                style={{ backgroundImage: `url(${story.imageUrl})` }}
              />
              <div className="pinStoryThumbCaption">
                <span className="storyTypeTag">{typeLabel(story.type)}</span>{' '}
                {story.caption.slice(0, 30)}...
              </div>
              <div className="pinStoryThumbMeta">
                <span className="thumbAvatar">{story.postedByAvatar}</span> {story.postedBy} -- {getTimeAgo(story.createdAt)}
              </div>
              <div className="pinStoryThumbReactions">
                {Object.entries(story.reactions).slice(0, 3).map(([key, count]) => (
                  <span key={key}>{reactionLabels[key] || key} {count}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Full screen viewer */}
      {viewerOpen && (
        <StoryViewer
          stories={stories}
          startIndex={viewerStartIndex}
          onClose={() => setViewerOpen(false)}
        />
      )}
    </>
  );
}
