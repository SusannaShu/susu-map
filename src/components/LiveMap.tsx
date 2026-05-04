import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { LayerToggle } from './LayerToggle';
import { BottomSheet } from './BottomSheet';
import { TimeFilter } from './TimeFilter';
import type { TimeFilterValue } from './TimeFilter';
import { useGetPostsQuery } from '../store/communityApi';
import { STRAPI_BASE_URL } from '../store/communityApi';
import type { CommunityPost } from '../types';
import { getPostImageUrl } from '../types';
import { mockPins, mockStories } from '../data/mockData';
import type { MapPin, HangoutPin, MockStory } from '../data/mockData';
import { useGetLaunchConfigQuery, useGetStoriesQuery } from '../store/communityApi';
import { useAppSelector } from '../store/store';
import './LiveMap.css';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

// Manhattan / NYU area center
const DEFAULT_CENTER: [number, number] = [-73.9960, 40.7320];
const DEFAULT_ZOOM = 14.5;

/**
 * Convert a CommunityPost from the API into the MapPin shape
 * the existing UI components expect, for a smooth migration.
 */
function apiPostToMapPin(post: CommunityPost): MapPin {
  const imageUrl = getPostImageUrl(post, STRAPI_BASE_URL);
  
  // Extract user info
  const user = post.postedBy;
  const displayName = (user?.firstname && user?.lastname) 
    ? `${user.firstname} ${user.lastname}` 
    : user?.firstname 
      ? user.firstname
      : user?.username || 'Anonymous';
  const profilePic = user?.profilePicUrl;
  
  const base = {
    id: post.documentId || String(post.id),
    title: post.title,
    description: post.description || '',
    postedBy: displayName,
    postedById: user?.documentId || String(user?.id || ''),
    postedByAvatar: displayName !== 'Anonymous' ? displayName.slice(0, 2).toUpperCase() : 'AN',
    postedByAvatarUrl: profilePic, // Note: We might need to add this to MapPin type, but we can duck type it for now or add it later.
    imageUrl,
    createdAt: post.createdAt,
    latitude: post.latitude,
    longitude: post.longitude,
    lineReports: post.lineReports || 0,
  };

  if (post.layer === 'free') {
    return {
      ...base,
      layer: 'free',
      category: (post.category as any) || 'other',
      status: (post.status as 'available' | 'running-low' | 'gone') || 'available',
      quantityLeft: post.quantityLeft || undefined,
      dietaryTags: post.dietaryTags || undefined,
      location: post.location || '',
    };
  } else if (post.layer === 'event') {
    return {
      ...base,
      layer: 'events',
      eventStatus: (post.status as 'upcoming' | 'happening-now' | 'ended') || 'upcoming',
      startTime: post.eventStartTime || post.createdAt,
      endTime: post.eventEndTime || undefined,
      location: post.location || '',
      rsvpCount: post.rsvpCount || 0,
      capacity: post.capacity || undefined,
      tags: post.tags || undefined,
    };
  } else if (post.layer === 'hangout') {
    return {
      ...base,
      layer: 'hangout',
      activity: post.hangoutActivity || 'Hanging out',
      maxJoiners: post.hangoutMaxJoiners || 5,
      currentJoiners: post.hangoutJoiners?.length || 0,
      joinerAvatars: [],
      startTime: post.eventStartTime || post.createdAt,
      endTime: post.eventEndTime || undefined,
      location: post.location || '',
      hangoutStatus: 'open' as const,
    };
  } else {
    return {
      ...base,
      layer: 'marketplace',
      price: post.price || 0,
      condition: (post.condition as 'new' | 'like-new' | 'good' | 'fair') || 'good',
      category: (post.category as any) || 'other',
      tradeAccepted: post.tradeAccepted || false,
      location: post.location || '',
    };
  }
}

/**
 * Apply time filter to a list of pins.
 */
function applyTimeFilter(pins: MapPin[], filter: TimeFilterValue): MapPin[] {
  if (filter.mode === 'all') return pins;

  const now = Date.now();
  const twoHoursMs = 2 * 60 * 60 * 1000;
  const oneDayMs = 24 * 60 * 60 * 1000;
  const oneWeekMs = 7 * oneDayMs;

  return pins.filter((pin) => {
    const created = new Date(pin.createdAt).getTime();

    if (filter.mode === 'now') {
      if (pin.layer === 'free') {
        return (now - created < twoHoursMs) && (pin as any).status !== 'gone';
      }
      if (pin.layer === 'events') {
        return (pin as any).eventStatus === 'happening-now';
      }
      if (pin.layer === 'hangout') {
        return (pin as any).hangoutStatus === 'open' || (pin as any).hangoutStatus === 'started';
      }
      return now - created < twoHoursMs;
    }

    if (filter.mode === 'today') {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      return created >= startOfDay.getTime() || (pin.layer === 'events' && (pin as any).startTime && new Date((pin as any).startTime).getTime() >= startOfDay.getTime());
    }

    if (filter.mode === 'this-week') {
      return now - created < oneWeekMs;
    }

    if (filter.mode === 'custom' && filter.startTime && filter.endTime) {
      const start = new Date(filter.startTime).getTime();
      const end = new Date(filter.endTime).getTime();
      return created >= start && created <= end;
    }

    return true;
  });
}

interface LiveMapProps {
  onSignIn?: () => void;
}

export function LiveMap({ onSignIn }: LiveMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const isInitialized = useRef(false);

  const [activeLayer, setActiveLayer] = useState<string>('all');
  const [selectedPin, setSelectedPin] = useState<MapPin | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [timeFilter, setTimeFilter] = useState<TimeFilterValue>({ mode: 'all' });
  const [searchQuery, setSearchQuery] = useState('');
  
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);

  // Fetch launch config
  const { data: configData } = useGetLaunchConfigQuery();
  const rawMapDemo = (configData as any)?.mapDemo ?? (configData as any)?.data?.mapDemo;
  const showDemoData = rawMapDemo !== false;

  // Fetch posts from API
  const apiLayerMap: Record<string, string | undefined> = { all: undefined, events: 'event', free: 'free', marketplace: 'marketplace', hangout: 'hangout' };
  const apiLayer = apiLayerMap[activeLayer] ?? activeLayer;
  const { data: apiResponse, isLoading, isError } = useGetPostsQuery(
    apiLayer ? { layer: apiLayer as any } : undefined,
    { pollingInterval: 30000 }
  );

  // Fetch stories
  const { data: storiesResponse } = useGetStoriesQuery(undefined, { pollingInterval: 30000 });

  // Convert API posts to MapPin format, fall back to mock data
  const rawPins: MapPin[] = (() => {
    let basePins: MapPin[] = [];
    if (showDemoData) {
      if (activeLayer === 'all') {
        basePins = mockPins;
      } else {
        basePins = mockPins.filter((p) => p.layer === activeLayer);
      }
    }
    if (apiResponse?.data && apiResponse.data.length > 0) {
      const livePins = apiResponse.data.map(apiPostToMapPin);
      // Replace mock pins with live pins of same ID if any, or just concat
      // But typically mock data has different IDs.
      return [...livePins, ...basePins];
    }
    return basePins;
  })();

  // Apply time filter
  let pins = applyTimeFilter(rawPins, timeFilter);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    pins = pins.filter(p => 
      p.title.toLowerCase().includes(q) || 
      p.description.toLowerCase().includes(q) || 
      (p as any).location?.toLowerCase().includes(q) || 
      p.postedBy?.toLowerCase().includes(q)
    );
  }

  // Count "happening now" items
  const happeningNowCount = pins.filter(
    (p) =>
      (p.layer === 'free' && (p as any).status === 'available') ||
      (p.layer === 'events' && (p as any).eventStatus === 'happening-now') ||
      (p.layer === 'hangout' && ((p as HangoutPin).hangoutStatus === 'open'))
  ).length;

  // Get stories linked to a specific pin
  const getStoriesForPin = useCallback((pinId: string): MockStory[] => {
    let pinStories: MockStory[] = [];
    if (showDemoData) {
      pinStories = [...mockStories.filter(s => s.linkedPostId === pinId)];
    }
    
    // Merge real stories
    if (storiesResponse?.data) {
      const realStories = storiesResponse.data
        .filter((s: any) => s.linkedPostId === pinId || s.linkedPost?.documentId === pinId)
        .map((s: any) => ({
          id: s.documentId || String(s.id),
          type: s.type as any,
          caption: s.caption || '',
          imageUrl: s.imageUrl || s.photo?.url || '',
          location: s.location || '',
          linkedPostId: s.linkedPostId || s.linkedPost?.documentId,
          postedBy: s.postedBy?.username || 'Anonymous',
          postedByAvatar: (s.postedBy?.username || 'AN').slice(0, 2).toUpperCase(),
          reactions: s.reactions || {},
          createdAt: s.createdAt,
          latitude: s.latitude || 0,
          longitude: s.longitude || 0,
          expiresAt: s.expiresAt || new Date(Date.now() + 86400000).toISOString(),
          seen: false,
        }));
      pinStories = [...realStories, ...pinStories];
    }
    return pinStories;
  }, [showDemoData, storiesResponse]);

  // Create marker element for a pin
  const createMarkerElement = useCallback((pin: MapPin): HTMLDivElement => {
    const el = document.createElement('div');
    el.className = 'mapPin';

    // Check if this pin has live stories -- add gradient story ring
    const pinStories = getStoriesForPin(pin.id);
    if (pinStories.length > 0) {
      el.classList.add('hasStories');

      // For story pins, the outer div is the gradient ring.
      // An inner div holds the circular image inside.
      const inner = document.createElement('div');
      inner.className = 'mapPinInner';
      inner.style.backgroundImage = `url(${pin.imageUrl})`;
      el.appendChild(inner);

      const storyBadge = document.createElement('span');
      storyBadge.className = 'pinStoryBadge';
      storyBadge.textContent = String(pinStories.length);
      el.appendChild(storyBadge);
    } else {
      // Non-story pins: image goes directly on the outer element
      el.style.backgroundImage = `url(${pin.imageUrl})`;
    }

    if (pin.layer === 'free') {
      const free = pin as any;
      el.classList.add(
        free.status === 'available' ? 'statusAvailable' :
        free.status === 'running-low' ? 'statusRunningLow' : 'statusGone'
      );
      if (free.status === 'running-low' && free.quantityLeft) {
        const badge = document.createElement('span');
        badge.className = 'pinBadge';
        badge.textContent = free.quantityLeft;
        el.appendChild(badge);
      }
    } else if (pin.layer === 'events') {
      const event = pin as any;
      el.classList.add(
        event.eventStatus === 'happening-now' ? 'statusHappeningNow' : 'statusUpcoming'
      );
      if (event.isScraped) {
        const scrapedBadge = document.createElement('span');
        scrapedBadge.className = 'pinScrapedBadge';
        scrapedBadge.textContent = 'NYC';
        el.appendChild(scrapedBadge);
      }
    } else if (pin.layer === 'marketplace') {
      const market = pin as any;
      el.classList.add('layerMarket');
      const badge = document.createElement('span');
      badge.className = 'pinPriceBadge';
      badge.textContent = `$${market.price}`;
      el.appendChild(badge);
    } else if (pin.layer === 'hangout') {
      const hangout = pin as HangoutPin;
      el.classList.add('layerHangout');
      const badge = document.createElement('span');
      badge.className = 'pinHangoutBadge';
      badge.textContent = `${hangout.currentJoiners}/${hangout.maxJoiners}`;
      el.appendChild(badge);
    }

    // Click handler
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      setSelectedPin(pin);
      mapInstance.current?.flyTo({
        center: [pin.longitude, pin.latitude],
        zoom: 16,
        duration: 800,
      });
    });

    return el;
  }, [getStoriesForPin]);

  // Update markers on the map
  const updateMarkers = useCallback(() => {
    if (!mapInstance.current || !isMapLoaded) return;
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

    pins.forEach((pin) => {
      const el = createMarkerElement(pin);
      const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([pin.longitude, pin.latitude])
        .addTo(mapInstance.current!);
      markersRef.current.set(pin.id, marker);
    });
  }, [pins, isMapLoaded, createMarkerElement]);

  const panToPinsRef = useRef({ filters: '', initialized: false });

  useEffect(() => {
    if (!mapInstance.current || !isMapLoaded) return;
    
    // We want to pan if filters changed, OR if this is the first time we got pins
    const filtersStr = `${activeLayer}-${JSON.stringify(timeFilter)}-${searchQuery}`;
    const filtersChanged = panToPinsRef.current.filters !== filtersStr;
    const isFirstPins = !panToPinsRef.current.initialized && pins.length > 0;

    if (filtersChanged || isFirstPins) {
      if (pins.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        pins.forEach((pin) => {
          bounds.extend([pin.longitude, pin.latitude]);
        });
        mapInstance.current.fitBounds(bounds, { padding: 60, maxZoom: 16, duration: 800 });
        panToPinsRef.current.initialized = true;
      }
      panToPinsRef.current.filters = filtersStr;
    }
  }, [pins, isMapLoaded, activeLayer, timeFilter, searchQuery]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || isInitialized.current) return;
    isInitialized.current = true;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      antialias: true,
    });

    mapInstance.current = map;

    map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

    map.on('load', () => {
      setIsMapLoaded(true);
    });

    map.on('click', () => {
      setSelectedPin(null);
    });

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current.clear();
      map.remove();
      mapInstance.current = null;
      isInitialized.current = false;
    };
  }, []);

  // Update markers when layer or time filter changes
  useEffect(() => {
    updateMarkers();
  }, [updateMarkers]);

  const handleLayerChange = (layer: string) => {
    setActiveLayer(layer);
    setSelectedPin(null);
  };

  return (
    <div className="mapPage">
      {/* Top bar -- search + layers + time filter */}
      <div className="mapTopBar">
        <div className="mapTopBarInner">
          <div className="mapSearchRow">
            <div className="searchIcon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <input
              className="searchInput"
              placeholder="Search nearby..."
              type="text"
              id="map-search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {isAuthenticated ? (
              <button className="appLogo" id="app-logo">
                {user?.avatar ? (
                  <img src={user.avatar} alt="Profile" className="appLogoAvatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <span className="appLogoText">
                    {user?.username ? user.username.charAt(0).toUpperCase() : 'S'}
                  </span>
                )}
              </button>
            ) : (
              <button 
                className="appLogo" 
                id="app-logo" 
                onClick={onSignIn}
                style={{ width: 'auto', padding: '0 12px', borderRadius: '16px' }}
              >
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'white' }}>Login</span>
              </button>
            )}
          </div>
          <LayerToggle activeLayer={activeLayer} onLayerChange={handleLayerChange} showDemoData={showDemoData} />
          <TimeFilter value={timeFilter} onChange={setTimeFilter} />
        </div>
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="mapLoadingBadge">
          <span className="happeningNowDot" />
          Loading...
        </div>
      )}

      {/* API error indicator */}
      {isError && (
        <div className="mapLoadingBadge mapOfflineBadge">
          Offline mode -- showing demo data
        </div>
      )}

      {/* Happening Now badge */}
      {happeningNowCount > 0 && !selectedPin && !isLoading && (
        <div className="happeningNowBadge">
          <span className="happeningNowDot" />
          {happeningNowCount} happening now
        </div>
      )}

      {/* Time filter active indicator */}
      {timeFilter.mode !== 'all' && (
        <div className="timeFilterActiveBadge">
          Showing: {timeFilter.mode === 'now' ? 'Happening Now' : timeFilter.mode === 'today' ? 'Today' : timeFilter.mode === 'this-week' ? 'This Week' : 'Custom Range'}
          <button
            className="timeFilterClear"
            onClick={() => setTimeFilter({ mode: 'all' })}
          >
            x
          </button>
        </div>
      )}

      {/* Map */}
      <div className="mapContainer">
        <div ref={mapContainer} className="mapContainerInner" />
      </div>

      {/* Bottom sheet */}
      {selectedPin && (
        <BottomSheet
          pin={selectedPin}
          onClose={() => setSelectedPin(null)}
          stories={getStoriesForPin(selectedPin.id)}
        />
      )}
    </div>
  );
}
