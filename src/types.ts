/**
 * Shared TypeScript types for the community map app
 * These match the Strapi v5 community-post content type schema
 */

// ============ Layer / Category Enums ============

export type LayerType = 'free' | 'event' | 'marketplace' | 'hangout';

export type PostStatus =
  | 'available'
  | 'running-low'
  | 'gone'
  | 'upcoming'
  | 'happening-now'
  | 'ended'
  | 'active'
  | 'sold';

export type FreeCategory =
  | 'food'
  | 'furniture'
  | 'books'
  | 'art-supplies'
  | 'clothing'
  | 'electronics'
  | 'other';

export type ItemCondition = 'new' | 'like-new' | 'good' | 'fair';

export type AccessScope = 'public' | 'school-only' | 'org-only' | 'college-only';

export type StoryType = 'line-report' | 'crowd-shot' | 'moment';

export type TimeFilterMode = 'all' | 'now' | 'today' | 'this-week' | 'custom';

export interface TimeFilter {
  mode: TimeFilterMode;
  startTime?: string;
  endTime?: string;
}

// ============ Core Types ============

export interface StrapiUser {
  id: number;
  documentId?: string;
  username: string;
  email: string;
  firstname?: string;
  lastname?: string;
  avatar?: string;
  bio?: string;
  school?: string;
  schoolEmail?: string;
  schoolEmailVerified?: boolean;
}

export interface CommunityPost {
  id: number;
  documentId: string;
  layer: LayerType;
  title: string;
  description: string | null;
  latitude: number;
  longitude: number;
  location: string | null;
  imageUrl: string | null;
  photo: StrapiMedia | null;
  status: PostStatus;
  category: string | null;
  quantityLeft: string | null;
  dietaryTags: string[] | null;
  price: number | null;
  condition: ItemCondition | null;
  tradeAccepted: boolean;
  eventStartTime: string | null;
  eventEndTime: string | null;
  rsvpCount: number;
  capacity: number | null;
  tags: string[] | null;
  viewCount: number;
  expiresAt: string | null;
  postedBy: StrapiUser | null;
  // Access control
  accessScope: AccessScope;
  accessDomain: string | null;
  accessOrgId: string | null;
  // Hangout fields
  hangoutActivity: string | null;
  hangoutMaxJoiners: number | null;
  hangoutJoiners: string[] | null;
  // Scraped event fields
  sourceUrl: string | null;
  sourceName: string | null;
  isScraped: boolean;
  // Line reporting
  lineReports: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface StrapiMedia {
  id: number;
  url: string;
  name: string;
  width: number;
  height: number;
  formats: {
    thumbnail?: { url: string };
    small?: { url: string };
    medium?: { url: string };
    large?: { url: string };
  };
}

// ============ API Response Types ============

export interface PostsResponse {
  data: CommunityPost[];
  meta: { total: number };
}

export interface PostResponse {
  data: CommunityPost;
}

// ============ API Request Types ============

export interface GetPostsParams {
  layer?: LayerType | 'all';
  lat?: number;
  lng?: number;
  radius?: number;
  status?: PostStatus;
  category?: string;
}

export interface CreatePostParams {
  layer: LayerType;
  title: string;
  description?: string;
  latitude: number;
  longitude: number;
  location?: string;
  imageUrl?: string;
  photo?: number | string;
  category?: string;
  quantityLeft?: string;
  dietaryTags?: string[];
  price?: number;
  condition?: ItemCondition;
  tradeAccepted?: boolean;
  eventStartTime?: string;
  eventEndTime?: string;
  capacity?: number;
  tags?: string[];
}

export interface UpdateStatusParams {
  id: string;
  status: PostStatus;
}

// ============ Story Types ============

export interface CommunityStory {
  id: number;
  documentId: string;
  type: StoryType;
  caption: string | null;
  imageUrl: string | null;
  latitude: number;
  longitude: number;
  location: string | null;
  linkedPostId: string | null;
  expiresAt: string;
  viewCount: number;
  reactions: Record<string, number>;
  postedBy: StrapiUser | null;
  createdAt: string;
}

export interface StoriesResponse {
  data: CommunityStory[];
}

export interface CreateStoryParams {
  type: StoryType;
  caption?: string;
  imageUrl?: string;
  photo?: number | string;
  latitude: number;
  longitude: number;
  location?: string;
  linkedPostId?: string;
}

// ============ Message Types ============

export interface ConversationPreview {
  id: string;
  name: string;
  initials: string;
  color: string;
  time: string;
  preview: string;
  unread?: boolean;
}

// ============ Auth Types ============

export interface AuthState {
  jwt: string | null;
  user: StrapiUser | null;
  isAuthenticated: boolean;
  schoolEmail: string | null;
  schoolEmailVerified: boolean;
  schoolDomain: string | null;
  organizations: string[];
}

export interface LoginCredentials {
  identifier: string;
  password: string;
}

export interface RegisterCredentials {
  username: string;
  email: string;
  password: string;
}

export interface LoginResponse {
  jwt: string;
  user: StrapiUser;
}

// ============ UI Helper Types ============

/** Map layer display configuration */
export const LAYER_CONFIG = {
  free: {
    label: 'Free Stuff',
    color: '#10b981',
    description: 'Free food, items, and resources near you',
  },
  event: {
    label: 'Events',
    color: '#8b5cf6',
    description: 'Popups, shows, swaps, and community events',
  },
  marketplace: {
    label: 'Market',
    color: '#f59e0b',
    description: 'Buy, sell, rent, and trade locally',
  },
  hangout: {
    label: 'Hangout',
    color: '#06b6d4',
    description: 'Join others for walks, study sessions, and more',
  },
} as const;

export const FREE_CATEGORY_CONFIG: Record<FreeCategory, { label: string }> = {
  food: { label: 'Food' },
  furniture: { label: 'Furniture' },
  books: { label: 'Books' },
  'art-supplies': { label: 'Art Supplies' },
  clothing: { label: 'Clothing' },
  electronics: { label: 'Electronics' },
  other: { label: 'Other' },
};

// ============ Utility ============

/** Get display image URL for a post (prefers uploaded photo, falls back to imageUrl) */
export function getPostImageUrl(post: CommunityPost, strapiBaseUrl: string): string {
  if (post.photo?.url) {
    // Strapi media URLs may be relative
    return post.photo.url.startsWith('http') ? post.photo.url : `${strapiBaseUrl}${post.photo.url}`;
  }
  return post.imageUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=300&fit=crop';
}

/** Get user display name and avatar fallback */
export function getPostedByDisplay(post: CommunityPost): { name: string; avatar: string } {
  if (post.postedBy) {
    const name = post.postedBy.username;
    return {
      name,
      avatar: post.postedBy.avatar || name.slice(0, 2).toUpperCase(),
    };
  }
  return { name: 'Anonymous', avatar: 'AN' };
}
