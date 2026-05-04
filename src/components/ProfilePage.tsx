import { useState } from 'react';
import './ProfilePage.css';
import { 
  useVerifyEduEmailMutation, 
  useConfirmEduEmailMutation,
  useUpdateProfileMutation,
  useGetLaunchConfigQuery,
  useGetMyPostsQuery
} from '../store/communityApi';
import { setAuth, logout } from '../store/authSlice';
import { useAppDispatch } from '../store/store';
import type { StrapiUser } from '../types';
import { STRAPI_BASE_URL, communityApi } from '../store/communityApi';
import toast from 'react-hot-toast';

interface ProfilePageProps {
  isAuthenticated: boolean;
  user: StrapiUser | null;
  onSignIn: () => void;
}

export function ProfilePage({ isAuthenticated, user, onSignIn }: ProfilePageProps) {
  const dispatch = useAppDispatch();
  const { data: configData } = useGetLaunchConfigQuery();
  const { data: myPostsData } = useGetMyPostsQuery(undefined, { skip: !isAuthenticated });
  
  const rawMapDemo = (configData as any)?.mapDemo ?? (configData as any)?.data?.mapDemo;
  const showDemoData = rawMapDemo !== false;

  const displayName = user?.firstname || user?.lastname 
    ? `${user?.firstname || ''} ${user?.lastname || ''}`.trim() 
    : user?.username || (showDemoData ? 'Susanna Shu' : 'Anonymous User');
  const displayEmail = user?.email || (showDemoData ? 'shux453@newschool.edu' : 'No email');
  const displayBio = user?.bio || (showDemoData ? "When in doubt, I'm always building :D" : 'No bio added yet.');
  const displaySchool = user?.school || (showDemoData ? 'The New School -- Senior' : 'No school verified');

  const posts = myPostsData?.data || [];
  const itemsSharedCount = posts.filter((p: any) => (p.layer === 'free' || p.layer === 'marketplace') && (p.postedBy?.id === user?.id || p.postedBy?.documentId === user?.documentId)).length;
  const eventsCount = posts.filter((p: any) => p.layer === 'event').length;

  const stats = [
    { value: itemsSharedCount.toString(), label: 'Items Shared' },
    { value: '0', label: 'Items Grabbed' },
    { value: eventsCount.toString(), label: 'Events' },
    { value: 'N/A', label: 'Trust Score', isStar: true },
  ];

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editProfilePicUrl, setEditProfilePicUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [updateProfile, { isLoading: isUpdatingProfile }] = useUpdateProfileMutation();

  // Edu Verification State
  const [isVerifyingEdu, setIsVerifyingEdu] = useState(false);
  const [verificationStep, setVerificationStep] = useState<'email' | 'code'>('email');
  const [eduEmailInput, setEduEmailInput] = useState('');
  const [eduCodeInput, setEduCodeInput] = useState('');
  const [testCodeMessage, setTestCodeMessage] = useState('');

  const [verifyEdu, { isLoading: isVerifying }] = useVerifyEduEmailMutation();
  const [confirmEdu, { isLoading: isConfirming }] = useConfirmEduEmailMutation();


  const handleEditProfileClick = () => {
    if (!isAuthenticated) return onSignIn();
    setEditUsername(displayName);
    setEditBio(displayBio);
    setEditProfilePicUrl(user?.avatar || null);
    setIsEditingProfile(true);
  };

  const handleSaveProfile = async () => {
    try {
      const payload: any = { username: editUsername, bio: editBio };
      if (editProfilePicUrl) {
        payload.profilePicUrl = editProfilePicUrl;
      }
      await updateProfile(payload).unwrap();
      // Optimistically update the auth state user
      if (user) {
        dispatch(setAuth({
          jwt: localStorage.getItem('community_jwt'), // keep existing jwt
          user: { ...user, username: editUsername, bio: editBio, avatar: editProfilePicUrl }
        }));
      }
      setIsEditingProfile(false);
    } catch (err) {
      toast.error('Failed to update profile');
    }
  };

  const handleShareProfile = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${displayName}'s Profile`,
          text: `Check out my profile on SUSU Map!`,
          url: window.location.href,
        });
      } catch (err) {
        console.error('Share failed', err);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Profile link copied to clipboard!');
    }
  };

  const handleLogOut = () => {
    dispatch(logout());
    dispatch(communityApi.util.resetApiState());
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('files', file);

    try {
      const res = await fetch(`${STRAPI_BASE_URL}/api/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('community_jwt')}`
        },
        body: formData,
      });

      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      if (data && data.length > 0) {
        // Set the uploaded image URL
        setEditProfilePicUrl(data[0].url.startsWith('http') ? data[0].url : `${STRAPI_BASE_URL}${data[0].url}`);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleVerifyEduEmail = async () => {
    if (!isAuthenticated) return onSignIn();
    try {
      const res = await verifyEdu({ email: eduEmailInput }).unwrap();
      setVerificationStep('code');
      if (res.testCode) {
        setTestCodeMessage(`Check console or use test code: ${res.testCode}`);
      }
    } catch (err: any) {
      toast.error(err?.data?.error?.message || 'Failed to send verification code');
    }
  };

  const handleConfirmEduCode = async () => {
    try {
      const res = await confirmEdu({ code: eduCodeInput }).unwrap();
      if (res.success && user) {
        dispatch(setAuth({
          jwt: localStorage.getItem('community_jwt'),
          user: { 
            ...user, 
            school: res.school, 
            schoolEmail: res.schoolEmail, 
            schoolEmailVerified: res.schoolEmailVerified 
          }
        }));
        setIsVerifyingEdu(false);
        setVerificationStep('email');
      }
    } catch (err: any) {
      toast.error(err?.data?.error?.message || 'Invalid code');
    }
  };

  if (!isAuthenticated && !showDemoData) {
    return (
      <div className="profilePage" id="profile-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: '32px' }}>
          <div className="profileAvatar" style={{ margin: '0 auto 24px', background: 'var(--color-bg-secondary)', color: 'var(--color-text-tertiary)' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <h2 style={{ marginBottom: '8px' }}>Welcome!</h2>
          <p style={{ margin: '0 0 24px', color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>
            Sign in to view your profile, manage your posts, and earn community credit.
          </p>
          <button className="profileActionBtn primary" onClick={onSignIn} style={{ margin: '0 auto' }}>
            Sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="profilePage" id="profile-page">
      <div className="profileScrollContainer">
        <div className="profileTopRow">
          <h1 className="profileHeading">Profile</h1>
          <button className="profileSettingsBtn" id="profile-settings">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>

        {/* Demo mode badge */}
        {!isAuthenticated && showDemoData && (
          <div className="profileDemoBadge" style={{ textAlign: 'center', width: '100%', marginBottom: '16px' }}>
            Demo mode -- 
            <button className="signInLink" onClick={onSignIn} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', textDecoration: 'underline', cursor: 'pointer', fontSize: '1rem', marginLeft: '4px' }}>
              Sign in
            </button>
          </div>
        )}

        {/* Avatar */}
        <div className="profileAvatarSection">
          {user?.avatar ? (
            <img 
              src={user.avatar} 
              className="profileAvatar" 
              alt={displayName} 
              referrerPolicy="no-referrer" 
              style={{ objectFit: 'cover' }} 
            />
          ) : (
            <div className="profileAvatar">
              {displayName.split(' ').map(n => n[0]).join('').toUpperCase()}
            </div>
          )}
          <h2 className="profileName">{displayName}</h2>
          <div className="profileEmail">{displayEmail}</div>
          <div className="profileSchool">{displaySchool}</div>
        </div>

        {/* Action buttons */}
        <div className="profileActions">
          <button className="profileActionBtn primary" id="edit-profile" onClick={handleEditProfileClick}>Edit profile</button>
          <button className="profileActionBtn secondary" id="share-profile" onClick={handleShareProfile}>Share profile</button>
          <button className="profileActionBtn secondary" id="log-out" onClick={handleLogOut}>Log out</button>
        </div>

        {/* Edit Profile Modal */}
        {isEditingProfile && (
          <div className="postOverlay" style={{ zIndex: 1000 }} id="edit-profile-modal">
            <div className="postBackdrop" onClick={() => setIsEditingProfile(false)} />
            <div className="postSheet" style={{ padding: '24px' }}>
              <div className="postHeader">
                <h2 className="postHeaderTitle">Edit Profile</h2>
                <button className="postCloseBtn" onClick={() => setIsEditingProfile(false)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', marginTop: '16px', width: '100%' }}>
                {editProfilePicUrl ? (
                  <img 
                    src={editProfilePicUrl} 
                    className="profileAvatar" 
                    alt="Edit profile avatar" 
                    referrerPolicy="no-referrer" 
                    style={{ width: '80px', height: '80px', objectFit: 'cover' }} 
                  />
                ) : (
                  <div className="profileAvatar" style={{ width: '80px', height: '80px' }}>
                    {displayName.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </div>
                )}
                
                <div className="photoUpload" style={{ margin: '0', padding: '8px 16px', width: 'auto' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                    <span>{isUploading ? 'Uploading...' : 'Change Photo'}</span>
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileUpload} disabled={isUploading} />
                  </label>
                </div>

                <div style={{ width: '100%', textAlign: 'left', marginTop: '12px' }}>
                  <label className="postLabel">Username</label>
                  <input 
                    type="text" 
                    className="postInput"
                    value={editUsername} 
                    onChange={(e) => setEditUsername(e.target.value)} 
                    placeholder="Username"
                  />
                </div>
                
                <div style={{ width: '100%', textAlign: 'left' }}>
                  <label className="postLabel">Bio</label>
                  <textarea 
                    className="postInput postTextarea"
                    value={editBio} 
                    onChange={(e) => setEditBio(e.target.value)} 
                    placeholder="Bio"
                    style={{ minHeight: '80px' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '8px', width: '100%', marginTop: '12px' }}>
                  <button className="postSubmit" onClick={handleSaveProfile} disabled={isUpdatingProfile || isUploading}>
                    {isUpdatingProfile ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="profileStats">
          {(showDemoData ? stats : [
            { value: '0', label: 'Items Shared' },
            { value: '0', label: 'Items Grabbed' },
            { value: '0', label: 'Events' },
            { value: 'N/A', label: 'Trust Score', isStar: true },
          ]).map((stat, i) => (
            <div key={i} className="profileStatCard">
              <div className="profileStatValue">
                {stat.isStar && <span className="profileStatStar">*</span>}
                {stat.value}
              </div>
              <div className="profileStatLabel">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Bio */}
        {!isEditingProfile && (
          <div className="profileSection">
            <h3 className="profileSectionTitle">About</h3>
            <p className="profileBio">{displayBio}</p>
          </div>
        )}

        {/* School verification */}
        <div className="profileSection">
          <h3 className="profileSectionTitle">School Verification</h3>
          
          {user?.schoolEmailVerified ? (
            <div className="profileVerifyCard" style={{ background: '#ecfdf5', borderColor: '#a7f3d0' }}>
              <div className="verifyIcon" style={{ background: '#d1fae5' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
              <div className="verifyInfo">
                <div className="verifyTitle" style={{ color: '#065f46' }}>Verified Student</div>
                <div className="verifyDesc" style={{ color: '#047857' }}>
                  Your {user.schoolEmail} address is verified. You have access to campus-specific features.
                </div>
              </div>
            </div>
          ) : isVerifyingEdu ? (
            <div className="profileVerifyCard" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '16px' }}>
              <div className="verifyInfo">
                <div className="verifyTitle">{verificationStep === 'email' ? 'Enter .edu Email' : 'Enter Verification Code'}</div>
                <div className="verifyDesc">
                  {verificationStep === 'email' 
                    ? 'We will send a 6-digit code to verify your student status.' 
                    : 'Enter the 6-digit code sent to your email.'}
                </div>
              </div>
              
              {verificationStep === 'email' ? (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="email" 
                    value={eduEmailInput} 
                    onChange={e => setEduEmailInput(e.target.value)}
                    placeholder="student@university.edu"
                    style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                  />
                  <button className="verifyBtn" onClick={handleVerifyEduEmail} disabled={isVerifying}>
                    {isVerifying ? 'Sending...' : 'Send'}
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      type="text" 
                      value={eduCodeInput} 
                      onChange={e => setEduCodeInput(e.target.value)}
                      placeholder="123456"
                      style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ddd', letterSpacing: '4px', textAlign: 'center', fontSize: '18px' }}
                      maxLength={6}
                    />
                    <button className="verifyBtn" onClick={handleConfirmEduCode} disabled={isConfirming}>
                      {isConfirming ? 'Verifying...' : 'Verify'}
                    </button>
                  </div>
                  {testCodeMessage && <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>{testCodeMessage}</div>}
                </div>
              )}
              <button 
                onClick={() => setIsVerifyingEdu(false)} 
                style={{ alignSelf: 'center', background: 'none', border: 'none', color: '#888', fontSize: '14px', marginTop: '4px' }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="profileVerifyCard">
              <div className="verifyIcon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                  <path d="M6 12v5c3 3 9 3 12 0v-5" />
                </svg>
              </div>
              <div className="verifyInfo">
                <div className="verifyTitle">Verify your .edu email</div>
                <div className="verifyDesc">
                  Unlock school-only posts and campus-specific features. Only verified students can see restricted content.
                </div>
              </div>
              <button className="verifyBtn" onClick={() => {
                if (!isAuthenticated) return onSignIn();
                setIsVerifyingEdu(true);
              }}>Verify</button>
            </div>
          )}
        </div>

        {/* Community credit */}
        <div className="profileSection">
          <h3 className="profileSectionTitle">Community Credit</h3>
          <div className="creditCard">
            <div className="creditScore">
              <div className="creditScoreValue">{showDemoData ? '142' : '0'}</div>
              <div className="creditScoreLabel">points</div>
            </div>
            <div className="creditDesc">
              Earn credit by sharing items, posting accurate updates, and reporting lines. Use credit for priority access to popular events and items.
            </div>
            <div className="creditActions">
              <div className="creditAction">
                <span className="creditActionLabel">Share an item</span>
                <span className="creditActionPoints">+10 pts</span>
              </div>
              <div className="creditAction">
                <span className="creditActionLabel">Post a story</span>
                <span className="creditActionPoints">+5 pts</span>
              </div>
              <div className="creditAction">
                <span className="creditActionLabel">Verify a status</span>
                <span className="creditActionPoints">+3 pts</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
