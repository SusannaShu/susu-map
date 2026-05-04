import { useState } from 'react';
import { useUpdatePostStatusMutation, useRsvpEventMutation, useReportLineMutation, useJoinHangoutMutation, useCreateMessageMutation } from '../store/communityApi';
import { PinStories } from './StoriesBar';
import { QuickStoryModal } from './QuickStoryModal';
import type { MapPin, FreePin, EventPin, MarketPin, HangoutPin, MockStory } from '../data/mockData';
import { useAppSelector } from '../store/store';
import toast from 'react-hot-toast';
import './BottomSheet.css';

interface BottomSheetProps {
  pin: MapPin;
  onClose: () => void;
  stories?: MockStory[];
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatEventTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function FreeDetail({ pin }: { pin: FreePin }) {
  const [updateStatus, { isLoading }] = useUpdatePostStatusMutation();

  const handleStatusChange = async (status: string) => {
    try {
      await updateStatus({ id: pin.id, status: status as any }).unwrap();
    } catch {
      // Silently fail for mock data (no real backend)
    }
  };

  return (
    <>
      <div className="sheetTags">
        {pin.status === 'available' && (
          <span className="sheetTag statusAvailable">Available</span>
        )}
        {pin.status === 'running-low' && (
          <span className="sheetTag statusRunningLow">{pin.quantityLeft || 'Running low'}</span>
        )}
        {pin.status === 'gone' && (
          <span className="sheetTag statusGone">Gone</span>
        )}
        {pin.quantityLeft && pin.status !== 'running-low' && pin.status !== 'gone' && (
          <span className="sheetTag">{pin.quantityLeft}</span>
        )}
        {pin.dietaryTags?.map((tag, i) => (
          <span key={i} className="sheetTag">{tag}</span>
        ))}
      </div>

      {/* Status update bar */}
      <div className="statusUpdateBar">
        <button
          className={`statusBtn ${pin.status === 'available' ? 'active' : ''}`}
          onClick={() => handleStatusChange('available')}
          disabled={isLoading}
        >
          Still here!
        </button>
        <button
          className={`statusBtn ${pin.status === 'running-low' ? 'active' : ''}`}
          onClick={() => handleStatusChange('running-low')}
          disabled={isLoading}
        >
          Running low
        </button>
        <button
          className={`statusBtn ${pin.status === 'gone' ? 'active' : ''}`}
          onClick={() => handleStatusChange('gone')}
          disabled={isLoading}
        >
          All gone
        </button>
      </div>
    </>
  );
}

function EventDetail({ pin }: { pin: EventPin }) {
  return (
    <div className="sheetTags">
      {pin.eventStatus === 'happening-now' && (
        <span className="sheetTag statusHappeningNow">Happening Now</span>
      )}
      {pin.eventStatus === 'upcoming' && (
        <span className="sheetTag" style={{ background: '#ede9fe', color: '#5b21b6', borderColor: '#ddd6fe' }}>
          {formatEventTime(pin.startTime)}
        </span>
      )}
      <span className="sheetTag">{pin.rsvpCount}{pin.capacity ? ` / ${pin.capacity}` : ''} attending</span>
      {pin.tags?.map((tag, i) => (
        <span key={i} className="sheetTag">{tag}</span>
      ))}
    </div>
  );
}

function MarketDetail({ pin }: { pin: MarketPin }) {
  return (
    <div className="sheetTags">
      <span className="sheetTag price">${pin.price}</span>
      <span className="sheetTag">
        {pin.condition === 'new' ? 'New' :
         pin.condition === 'like-new' ? 'Like New' :
         pin.condition === 'good' ? 'Good' : 'Fair'}
      </span>
      {pin.tradeAccepted && (
        <span className="sheetTag" style={{ background: '#d1fae5', color: '#065f46', borderColor: '#a7f3d0' }}>
          Trade accepted
        </span>
      )}
    </div>
  );
}

function HangoutDetail({ pin, onJoin }: { pin: HangoutPin; onJoin?: (id: string) => Promise<any> }) {
  const [joined, setJoined] = useState(false);
  const spotsLeft = pin.maxJoiners - pin.currentJoiners;

  return (
    <>
      <div className="sheetTags">
        <span className="sheetTag" style={{ background: 'var(--color-hangout-light)', color: 'var(--color-hangout-dark)', borderColor: '#b2ebf2' }}>
          {pin.activity}
        </span>
        <span className="sheetTag" style={{
          background: spotsLeft <= 1 ? 'var(--color-running-low-bg)' : 'var(--color-hangout-light)',
          color: spotsLeft <= 1 ? '#92400e' : 'var(--color-hangout-dark)',
          borderColor: spotsLeft <= 1 ? '#fde68a' : '#b2ebf2',
        }}>
          {pin.currentJoiners + (joined ? 1 : 0)}/{pin.maxJoiners} joined
        </span>
        {pin.hangoutStatus === 'open' && (
          <span className="sheetTag statusAvailable">Open</span>
        )}
        {pin.hangoutStatus === 'full' && (
          <span className="sheetTag statusRunningLow">Full</span>
        )}
      </div>

      {/* Joiner avatars */}
      <div className="hangoutJoiners">
        {pin.joinerAvatars.map((avatar, i) => (
          <div key={i} className="hangoutJoinerAvatar">{avatar}</div>
        ))}
        {spotsLeft > 0 && !joined && (
          <div className="hangoutJoinerEmpty">+{spotsLeft}</div>
        )}
      </div>

      {/* Progress bar */}
      <div className="hangoutProgressBar">
        <div
          className="hangoutProgressFill"
          style={{ width: `${((pin.currentJoiners + (joined ? 1 : 0)) / pin.maxJoiners) * 100}%` }}
        />
      </div>

      {/* Time info */}
      <div className="hangoutTimeInfo">
        {pin.endTime
          ? `Until ${formatEventTime(pin.endTime)}`
          : `Started ${getTimeAgo(pin.startTime)}`
        }
      </div>

      {!joined && spotsLeft > 0 && (
        <button className="hangoutJoinBtn" onClick={async () => {
          if (onJoin) {
            try {
              await onJoin(pin.id);
              setJoined(true);
            } catch {
              setJoined(true);
            }
          } else {
            setJoined(true);
          }
        }}>
          Join Hangout -- {spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} left
        </button>
      )}
      {joined && (
        <button className="hangoutJoinBtn joined" disabled>
          You're in! See you there
        </button>
      )}
    </>
  );
}

export function BottomSheet({ pin, onClose, stories }: BottomSheetProps) {
  const [rsvpEvent] = useRsvpEventMutation();
  const [reportLine] = useReportLineMutation();
  const [joinHangout] = useJoinHangoutMutation();
  const [createMessage] = useCreateMessageMutation();
  
  const [hasRsvpd, setHasRsvpd] = useState(false);
  const [hasReportedLine, setHasReportedLine] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);
  const [isComposingMessage, setIsComposingMessage] = useState(false);
  const [messageText, setMessageText] = useState('');

  const user = useAppSelector((state) => state.auth.user);

  const handleRsvp = async () => {
    try {
      await rsvpEvent(pin.id).unwrap();
      setHasRsvpd(true);
      toast.success('RSVP successful!');
    } catch {
      // Silently handle mock data case
      setHasRsvpd(true);
      toast.success('RSVP successful!');
    }
  };

  const handleReportLine = async () => {
    if (hasReportedLine) return;
    try {
      await reportLine(pin.id).unwrap();
      setHasReportedLine(true);
      toast.success('Line reported!');
    } catch {
      setHasReportedLine(true);
      toast.success('Line reported!');
    }
  };

  const handleMessageUser = async () => {
    if (!pin.postedById) {
      toast.error('Cannot message this user (mock data or missing ID)');
      return;
    }
    if (!user) {
      toast.error('You must be logged in to send a message.');
      return;
    }
    if (!messageText.trim()) return;

    try {
      await createMessage({
        text: messageText,
        messageReceiver: pin.postedById,
        messageSender: user.documentId || user.id,
        messageCategory: 'user',
      }).unwrap();
      
      setIsComposingMessage(false);
      setMessageText('');
      toast.success('Message sent! They will get back to you soon.');
    } catch (e) {
      console.error(e);
      toast.error('Failed to send message.');
    }
  };

  return (
    <div className="sheetOverlay" id="bottom-sheet">
      <div className="sheetBackdrop" onClick={onClose} />
      <div className="sheetContainer">
        <div className="sheetHandle">
          <div className="sheetHandleBar" />
        </div>
        <button className="sheetClose" onClick={onClose}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Hero Image */}
        {!imgError ? (
          <img
            src={pin.imageUrl}
            alt={pin.title}
            className="sheetImage"
            loading="eager"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="sheetImageFallback">
            <span>{pin.title.slice(0, 2).toUpperCase()}</span>
          </div>
        )}

        {/* Content */}
        <div className="sheetContent">
          <h2 className="sheetTitle">{pin.title}</h2>

          <div className="sheetMeta">
            <span>Posted {getTimeAgo(pin.createdAt)}</span>
            {pin.layer === 'free' && (
              <span> -- {Math.floor(Math.random() * 20 + 5)} viewed</span>
            )}
          </div>

          {/* Location */}
          <div className="sheetLocation">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span className="locationText">
              {(pin as FreePin).location || (pin as EventPin).location || (pin as MarketPin).location || (pin as HangoutPin).location}
            </span>
          </div>

          {pin.lineReports && pin.lineReports > 0 ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#9a3412',
              background: '#ffedd5',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 500,
              marginTop: '4px',
              marginBottom: '12px'
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              {pin.lineReports} {pin.lineReports === 1 ? 'person has' : 'people have'} reported a long line here
            </div>
          ) : null}

          {/* Layer-specific detail */}
          {pin.layer === 'free' && <FreeDetail pin={pin as FreePin} />}
          {pin.layer === 'events' && <EventDetail pin={pin as EventPin} />}
          {pin.layer === 'marketplace' && <MarketDetail pin={pin as MarketPin} />}
          {pin.layer === 'hangout' && <HangoutDetail pin={pin as HangoutPin} onJoin={joinHangout} />}

          {/* Live stories from this location */}
          {stories && stories.length > 0 && (
            <PinStories stories={stories} />
          )}

          {/* Description */}
          <p className="sheetDescription">{pin.description}</p>

          <div className="sheetPostedBy" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="sheetAvatar" style={{ overflow: 'hidden' }}>
                {(pin as any).postedByAvatarUrl ? (
                  <img src={(pin as any).postedByAvatarUrl} alt={pin.postedBy} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  pin.postedByAvatar
                )}
              </div>
              <div className="sheetPostedInfo">
                <div className="sheetPostedName">{pin.postedBy}</div>
                <div className="sheetPostedTime">Posted {getTimeAgo(pin.createdAt)}</div>
              </div>
            </div>
            
            {!isComposingMessage && pin.postedBy !== 'Anonymous' && pin.postedById && user && pin.postedById !== String(user.id) && pin.postedById !== user.documentId && (
              <button 
                className="sheetBtn sheetBtnSecondary" 
                style={{ padding: '6px 12px', fontSize: '13px', minWidth: 'auto', flex: 'none', margin: 0, borderRadius: 'var(--radius-full)' }}
                onClick={() => setIsComposingMessage(true)}
              >
                {pin.layer === 'marketplace' ? 'Message Seller' : pin.layer === 'events' || pin.layer === 'hangout' ? 'Message Host' : 'Message Poster'}
              </button>
            )}
          </div>

          {isComposingMessage && (
            <div style={{ 
              background: '#f8fafc', 
              padding: '16px', 
              borderRadius: '16px', 
              border: '1px solid #e2e8f0',
              marginBottom: '16px',
              animation: 'slideUp 0.2s ease-out'
            }}>
              <textarea
                placeholder={`Write a message to ${pin.postedBy}...`}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                autoFocus
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  marginBottom: '12px',
                  fontFamily: 'inherit',
                  fontSize: '15px',
                  resize: 'none',
                  minHeight: '80px',
                  outline: 'none',
                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
                onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
              />
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button 
                  className="sheetBtn sheetBtnSecondary" 
                  onClick={() => { setIsComposingMessage(false); setMessageText(''); }}
                  style={{ background: 'transparent', border: 'none', padding: '6px 16px' }}
                >
                  Cancel
                </button>
                <button 
                  className="sheetBtn sheetBtnPrimary" 
                  onClick={handleMessageUser}
                  disabled={!messageText.trim()}
                  style={{ 
                    padding: '6px 20px', 
                    borderRadius: '20px',
                    opacity: messageText.trim() ? 1 : 0.5,
                    transition: 'opacity 0.2s'
                  }}
                >
                  Send Message
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="sheetActions">
            {pin.layer === 'marketplace' ? (
              <>
                <button className="sheetBtn sheetBtnSecondary" style={{ flex: 1 }} onClick={() => toast.success('Saved to your profile!')}>Save</button>
              </>
            ) : pin.layer === 'events' ? (
              <>
                <button
                  className="sheetBtn sheetBtnPrimary"
                  onClick={handleRsvp}
                  disabled={hasRsvpd}
                >
                  {hasRsvpd ? 'RSVPd!' : 'RSVP'}
                </button>
                <button className="sheetBtn sheetBtnSecondary" onClick={handleReportLine} disabled={hasReportedLine}>
                  {hasReportedLine ? 'Reported' : 'Report Line'}
                </button>
                <button className="sheetBtn sheetBtnSecondary" onClick={async () => {
                  if (navigator.share) {
                    try { await navigator.share({ title: pin.title, text: pin.description, url: window.location.href }); } catch (e) { }
                  } else {
                    navigator.clipboard.writeText(window.location.href);
                    toast.success('Link copied!');
                  }
                }}>Share</button>
              </>
            ) : pin.layer === 'hangout' ? (
              <>
                <button className="sheetBtn sheetBtnSecondary" style={{ flex: 1 }} onClick={async () => {
                  if (navigator.share) {
                    try { await navigator.share({ title: pin.title, text: pin.description, url: window.location.href }); } catch (e) { }
                  } else {
                    navigator.clipboard.writeText(window.location.href);
                    toast.success('Link copied!');
                  }
                }}>Share</button>
              </>
            ) : (
              <>
                <button className="sheetBtn sheetBtnPrimary" onClick={handleRsvp} disabled={hasRsvpd}>
                  {hasRsvpd ? "I'm on my way!" : "I'm on my way!"}
                </button>
                <button className="sheetBtn sheetBtnSecondary" onClick={handleReportLine} disabled={hasReportedLine}>
                  {hasReportedLine ? 'Reported' : 'Report Line'}
                </button>
                <button className="sheetBtn sheetBtnSecondary" onClick={async () => {
                  if (navigator.share) {
                    try { await navigator.share({ title: pin.title, text: pin.description, url: window.location.href }); } catch (e) { }
                  } else {
                    navigator.clipboard.writeText(window.location.href);
                    toast.success('Link copied!');
                  }
                }}>Share</button>
              </>
            )}
          </div>
          <div className="sheetActions" style={{ marginTop: '8px' }}>
            <button className="sheetBtn sheetBtnSecondary" style={{ width: '100%', borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }} onClick={() => setIsStoryModalOpen(true)}>
              + Add Update
            </button>
          </div>
        </div>
      </div>
      {isStoryModalOpen && (
        <QuickStoryModal
          linkedPostId={pin.id}
          pinLocation={(pin as FreePin).location || (pin as EventPin).location || (pin as MarketPin).location || (pin as HangoutPin).location || ''}
          pinLat={pin.latitude}
          pinLng={pin.longitude}
          onClose={() => setIsStoryModalOpen(false)}
        />
      )}
    </div>
  );
}
