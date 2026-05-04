/**
 * Mock data type definitions for the community map prototype.
 * Separated from data to keep files under 400 lines.
 */

export type LayerType = 'free' | 'events' | 'marketplace' | 'hangout';
export type FreeCategory = 'food' | 'furniture' | 'books' | 'art-supplies' | 'clothing' | 'electronics' | 'other';
export type ItemStatus = 'available' | 'running-low' | 'gone';
export type EventStatus = 'upcoming' | 'happening-now' | 'ended';
export type MarketCategory = 'clothing' | 'furniture' | 'books' | 'electronics' | 'art' | 'other';
export type AccessScope = 'public' | 'school-only' | 'college-only';
export type StoryType = 'line-report' | 'crowd-shot' | 'moment';

export interface BasePin {
  id: string;
  layer: LayerType;
  latitude: number;
  longitude: number;
  title: string;
  description: string;
  postedBy: string;
  postedById?: string;
  postedByAvatar: string;
  imageUrl: string;
  createdAt: string;
  lineReports?: number;
}

export interface FreePin extends BasePin {
  layer: 'free';
  category: FreeCategory;
  status: ItemStatus;
  quantityLeft?: string;
  dietaryTags?: string[];
  location: string;
}

export interface EventPin extends BasePin {
  layer: 'events';
  eventStatus: EventStatus;
  startTime: string;
  endTime?: string;
  location: string;
  rsvpCount: number;
  capacity?: number;
  tags?: string[];
}

export interface MarketPin extends BasePin {
  layer: 'marketplace';
  price: number;
  condition: 'new' | 'like-new' | 'good' | 'fair';
  category: MarketCategory;
  tradeAccepted: boolean;
  location: string;
}

export interface HangoutPin extends BasePin {
  layer: 'hangout';
  activity: string;
  maxJoiners: number;
  currentJoiners: number;
  joinerAvatars: string[];
  startTime: string;
  endTime?: string;
  location: string;
  hangoutStatus: 'open' | 'full' | 'started' | 'ended';
}

export interface MockStory {
  id: string;
  type: StoryType;
  caption: string;
  imageUrl: string;
  postedBy: string;
  postedByAvatar: string;
  latitude: number;
  longitude: number;
  location: string;
  linkedPostId?: string;
  createdAt: string;
  expiresAt: string;
  reactions: Record<string, number>;
  seen: boolean;
}

export type MapPin = FreePin | EventPin | MarketPin | HangoutPin;

export interface LayerConfigItem {
  label: string;
  color: string;
  description: string;
}
