import { useState, useEffect, useRef } from 'react';
import { useCreateStoryMutation, useUploadMediaMutation } from '../store/communityApi';
import type { StoryType } from '../types';
import './QuickPostModal.css'; // Reusing QuickPostModal CSS

interface QuickStoryModalProps {
  linkedPostId: string;
  pinLocation?: string;
  pinLat: number;
  pinLng: number;
  onClose: () => void;
}

export function QuickStoryModal({ linkedPostId, pinLocation, pinLat, pinLng, onClose }: QuickStoryModalProps) {
  const [selectedType, setSelectedType] = useState<StoryType | null>(null);
  const [caption, setCaption] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [createStory, { isLoading: isCreating, isSuccess, isError, error }] = useCreateStoryMutation();
  const [uploadMedia, { isLoading: isUploading }] = useUploadMediaMutation();

  const isLoading = isCreating || isUploading;

  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => onClose(), 1200);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, onClose]);

  const handleSubmit = async () => {
    if (!selectedType || !caption.trim() || !selectedFile) return;

    try {
      let imageUrl = undefined;
      let mediaId = undefined;

      const formData = new FormData();
      formData.append('files', selectedFile);
      const uploadRes = await uploadMedia(formData).unwrap();
      if (uploadRes && uploadRes.length > 0) {
        imageUrl = uploadRes[0].url;
        mediaId = uploadRes[0].id;
      }

      await createStory({
        type: selectedType,
        caption: caption.trim(),
        latitude: pinLat,
        longitude: pinLng,
        location: pinLocation,
        linkedPostId,
        imageUrl: imageUrl,
        photo: mediaId,
      }).unwrap();
    } catch {
      // Error is handled by RTK Query
    }
  };

  const storyTypes: { id: StoryType; name: string; desc: string; color: string }[] = [
    { id: 'line-report', name: 'Line Update', desc: 'How long is the wait?', color: '#ef4444' },
    { id: 'crowd-shot', name: 'Crowd Shot', desc: 'Show how busy it is', color: '#f59e0b' },
    { id: 'moment', name: 'Moment', desc: 'Just sharing a vibe', color: '#3b82f6' },
  ];

  return (
    <div className="postOverlay" id="quick-story-modal">
      <div className="postBackdrop" onClick={onClose} />
      <div className="postSheet">
        <div className="postHandle">
          <div className="postHandleBar" />
        </div>

        <div className="postHeader">
          <h2 className="postHeaderTitle">
            {isSuccess ? 'Posted!' : selectedType ? 'Add Update' : 'What kind of update?'}
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
            Your update is live!
          </div>
        )}

        {/* Type selector */}
        {!isSuccess && !selectedType && (
          <div className="postTypeSelector">
            {storyTypes.map((type) => (
              <button
                key={type.id}
                className={`postTypeCard ${selectedType === type.id ? 'selected' : ''}`}
                onClick={() => setSelectedType(type.id)}
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
                    <span className="photoUploadText">Tap to add a photo (required)</span>
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

            {/* Caption */}
            <div className="postFormGroup">
              <label className="postLabel">Update</label>
              <input
                className="postInput"
                placeholder={
                  selectedType === 'line-report' ? 'e.g., Line is around the block' :
                  selectedType === 'crowd-shot' ? 'e.g., Packed inside' :
                  'What is happening?'
                }
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
              />
            </div>

            {/* Error display */}
            {isError && (
              <div className="postErrorMsg">
                {(error as any)?.data?.error?.message || 'Could not post update.'}
              </div>
            )}

            {/* Submit */}
            <button
              className="postSubmit"
              onClick={handleSubmit}
              disabled={isLoading || !caption.trim() || !selectedFile}
              style={{ opacity: isLoading || !caption.trim() || !selectedFile ? 0.6 : 1 }}
            >
              {isLoading ? 'Posting...' : 'Share Update'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
