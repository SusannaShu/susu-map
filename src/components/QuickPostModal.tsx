import { useState, useEffect, useRef } from 'react';
import { useCreatePostMutation, useUploadMediaMutation } from '../store/communityApi';
import { useAppSelector } from '../store/store';
import type { CreatePostParams, LayerType, FreeCategory } from '../types';
import { AccessScopeSelector } from './AccessScopeSelector';
import type { AccessScope } from './AccessScopeSelector';
import './QuickPostModal.css';

interface QuickPostModalProps {
  onClose: () => void;
}

type PostType = 'free' | 'event' | 'sell' | 'hangout' | null;

function mapPostTypeToLayer(type: PostType): LayerType {
  if (type === 'event') return 'event';
  if (type === 'sell') return 'marketplace';
  if (type === 'hangout') return 'hangout';
  return 'free';
}

export function QuickPostModal({ onClose }: QuickPostModalProps) {
  const [selectedType, setSelectedType] = useState<PostType>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState<string>('');
  const [accessScope, setAccessScope] = useState<AccessScope>('public');
  const [hangoutActivity, setHangoutActivity] = useState('');
  const [hangoutMaxJoiners, setHangoutMaxJoiners] = useState('5');
  const [startTime, setStartTime] = useState('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState('');
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [createPost, { isLoading: isCreating, isSuccess, isError, error }] = useCreatePostMutation();
  const [uploadMedia, { isLoading: isUploading }] = useUploadMediaMutation();
  
  const { user, schoolEmailVerified, schoolDomain } = useAppSelector(state => state.auth);
  
  const isLoading = isCreating || isUploading;

  // Get user's location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {
          // Fallback to NYU area if location denied
          setUserLocation({ lat: 40.7320, lng: -73.9960 });
          setLocationError('Using default location (NYU area)');
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      setUserLocation({ lat: 40.7320, lng: -73.9960 });
    }
  }, []);

  // Auto-close on success
  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => onClose(), 1200);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, onClose]);

  const handleSubmit = async () => {
    if (!selectedType || !title.trim() || !userLocation) return;

    const postData: CreatePostParams = {
      layer: mapPostTypeToLayer(selectedType),
      title: title.trim(),
      description: description.trim() || undefined,
      latitude: userLocation.lat,
      longitude: userLocation.lng,
      location: location.trim() || undefined,
    };

    // Layer-specific fields
    if (selectedType === 'free' && category) {
      postData.category = category;
    }
    if (selectedType === 'sell' && price) {
      postData.price = parseFloat(price);
    }

    try {
      let imageUrl = undefined;
      let mediaId = undefined;

      if (selectedFile) {
        const formData = new FormData();
        formData.append('files', selectedFile);
        const uploadRes = await uploadMedia(formData).unwrap();
        if (uploadRes && uploadRes.length > 0) {
          imageUrl = uploadRes[0].url;
          mediaId = uploadRes[0].id;
        }
      }

      if (imageUrl) {
        postData.imageUrl = imageUrl;
      }

      await createPost({ ...postData, photo: mediaId }).unwrap();
    } catch {
      // Error state is handled by RTK Query
    }
  };

  const postTypes = [
    { id: 'free' as const, name: 'Free Stuff', desc: 'Food, items, curb finds', color: 'var(--color-layer-free)' },
    { id: 'event' as const, name: 'Event', desc: 'Popups, shows, meetups', color: 'var(--color-layer-events)' },
    { id: 'sell' as const, name: 'Sell / Trade', desc: 'List for sale or trade', color: 'var(--color-layer-market)' },
    { id: 'hangout' as const, name: 'Hangout', desc: 'Walk, study, coffee', color: 'var(--color-layer-hangout)' },
  ];

  const categories: [FreeCategory, string][] = [
    ['food', 'Food'],
    ['furniture', 'Furniture'],
    ['books', 'Books'],
    ['art-supplies', 'Art Supplies'],
    ['clothing', 'Clothing'],
    ['other', 'Other'],
  ];

  return (
    <div className="postOverlay" id="quick-post-modal">
      <div className="postBackdrop" onClick={onClose} />
      <div className="postSheet">
        <div className="postHandle">
          <div className="postHandleBar" />
        </div>

        <div className="postHeader">
          <h2 className="postHeaderTitle">
            {isSuccess ? 'Posted!' : selectedType ? 'New Post' : 'What are you sharing?'}
          </h2>
          <button className="postCloseBtn" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Success state */}
        {isSuccess && (
          <div className="postSuccessState">
            <div className="postSuccessIcon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            Your post is now live on the map!
          </div>
        )}

        {/* Type selector */}
        {!isSuccess && (
          <div className="postTypeSelector">
            {postTypes.map((type) => (
              <button
                key={type.id}
                className={`postTypeCard ${selectedType === type.id ? 'selected' : ''}`}
                onClick={() => setSelectedType(type.id)}
                id={`post-type-${type.id}`}
              >
                <div className="postTypeDot" style={{ background: type.color }} />
                <div className="postTypeName">{type.name}</div>
                <div className="postTypeDesc">{type.desc}</div>
              </button>
            ))}
          </div>
        )}

        {/* Form appears after selecting type */}
        {selectedType && !isSuccess && (
          <div className="postForm">
            {/* Photo upload */}
            <div className="postFormGroup">
              <label className="postLabel">Photo</label>
              <div 
                className={`photoUpload ${previewUrl ? 'hasImage' : ''}`}
                id="photo-upload"
                onClick={() => fileInputRef.current?.click()}
                style={{ 
                  cursor: 'pointer',
                  backgroundImage: previewUrl ? `url(${previewUrl})` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              >
                {!previewUrl && (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                    <span className="photoUploadText">Tap to add a photo</span>
                  </>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  style={{ display: 'none' }} 
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setSelectedFile(file);
                      setPreviewUrl(URL.createObjectURL(file));
                    }
                  }}
                />
              </div>
            </div>

            {/* Title */}
            <div className="postFormGroup">
              <label className="postLabel">Title</label>
              <input
                className="postInput"
                placeholder={
                  selectedType === 'free' ? 'e.g., Free pizza in the lobby' :
                  selectedType === 'event' ? 'e.g., Sustainable Fashion Popup' :
                  'e.g., Vintage Levi\'s 501'
                }
                type="text"
                id="post-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="postFormGroup">
              <label className="postLabel">Description</label>
              <textarea
                className="postInput postTextarea"
                placeholder="Tell people what you're sharing..."
                id="post-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Location */}
            <div className="postFormGroup">
              <label className="postLabel">
                Location
                {locationError && (
                  <span className="postLabelHint">{locationError}</span>
                )}
              </label>
              <input
                className="postInput"
                placeholder="Building name or address..."
                type="text"
                id="post-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            {/* Price (marketplace only) */}
            {selectedType === 'sell' && (
              <div className="postFormGroup">
                <label className="postLabel">Price</label>
                <input
                  className="postInput"
                  placeholder="$0.00 (or leave blank for 'Make an offer')"
                  type="number"
                  id="post-price"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
            )}

            {/* Category tags (free stuff) */}
            {selectedType === 'free' && (
              <div className="postFormGroup">
                <label className="postLabel">Category</label>
                <div className="postCategoryGrid">
                  {categories.map(([catId, catLabel]) => (
                    <button
                      key={catId}
                      className={`postCategoryPill ${category === catId ? 'selected' : ''}`}
                      onClick={() => setCategory(catId)}
                      type="button"
                    >
                      {catLabel}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Hangout-specific fields */}
            {selectedType === 'hangout' && (
              <>
                <div className="postFormGroup">
                  <label className="postLabel">Activity</label>
                  <input
                    className="postInput"
                    placeholder="e.g., Walking, Studying, Coffee..."
                    type="text"
                    value={hangoutActivity}
                    onChange={(e) => setHangoutActivity(e.target.value)}
                  />
                </div>
                <div className="postFormGroup">
                  <label className="postLabel">Max people who can join</label>
                  <input
                    className="postInput"
                    type="number"
                    min="2"
                    max="20"
                    value={hangoutMaxJoiners}
                    onChange={(e) => setHangoutMaxJoiners(e.target.value)}
                  />
                </div>
                <div className="postFormGroup">
                  <label className="postLabel">Start time</label>
                  <input
                    className="postInput"
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
              </>
            )}

            {/* Access Scope -- applies to all post types */}
            <AccessScopeSelector
              value={accessScope}
              onChange={setAccessScope}
              isSchoolVerified={!!(schoolEmailVerified || user?.schoolEmailVerified)}
              schoolDomain={schoolDomain || undefined}
            />

            {/* Error display */}
            {isError && (
              <div className="postErrorMsg">
                {(error as any)?.data?.error?.message || 'Could not create post. Is Strapi running?'}
              </div>
            )}

            {/* Submit */}
            <button
              className="postSubmit"
              id="post-submit"
              onClick={handleSubmit}
              disabled={isLoading || !title.trim()}
              style={{ opacity: isLoading || !title.trim() ? 0.6 : 1 }}
            >
              {isLoading ? 'Posting...' :
               selectedType === 'free' ? 'Share with your community' :
               selectedType === 'event' ? 'Publish event' :
               selectedType === 'hangout' ? 'Start hangout' :
               'List item'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
