/**
 * RTK Query API slice for community map
 * All data fetching and mutations for the community-post and messages APIs
 */

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from './store';
import type {
  PostsResponse,
  PostResponse,
  GetPostsParams,
  CreatePostParams,
  UpdateStatusParams,
  ConversationPreview,
  CreateStoryParams,
} from '../types';

const STRAPI_BASE_URL = import.meta.env.VITE_STRAPI_URL || 'http://localhost:1337';

export const communityApi = createApi({
  reducerPath: 'communityApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${STRAPI_BASE_URL}/api`,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.jwt;
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Post', 'MyPosts', 'Messages'],
  endpoints: (builder) => ({
    // ============ Queries ============

    /** Fetch community posts with optional filters */
    getPosts: builder.query<PostsResponse, GetPostsParams | void>({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params?.layer && params.layer !== 'all') searchParams.set('layer', params.layer);
        if (params?.lat != null) searchParams.set('lat', String(params.lat));
        if (params?.lng != null) searchParams.set('lng', String(params.lng));
        if (params?.radius != null) searchParams.set('radius', String(params.radius));
        if (params?.status) searchParams.set('status', params.status);
        if (params?.category) searchParams.set('category', params.category);
        const qs = searchParams.toString();
        return `/community-posts${qs ? `?${qs}` : ''}`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ documentId }) => ({ type: 'Post' as const, id: documentId })),
              { type: 'Post', id: 'LIST' },
            ]
          : [{ type: 'Post', id: 'LIST' }],
    }),

    /** Fetch a single post by documentId */
    getPost: builder.query<PostResponse, string>({
      query: (id) => `/community-posts/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Post', id }],
    }),

    /** Fetch current user's posts */
    getMyPosts: builder.query<PostsResponse, { layer?: string; status?: string } | void>({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params?.layer) searchParams.set('layer', params.layer);
        if (params?.status) searchParams.set('status', params.status);
        const qs = searchParams.toString();
        return `/community-posts/my-posts${qs ? `?${qs}` : ''}`;
      },
      providesTags: ['MyPosts'],
    }),

    /** Fetch launch config */
    getLaunchConfig: builder.query<{ data: any }, void>({
      query: () => '/launch-config',
    }),

    /** Fetch message conversations (chat list) */
    getMessages: builder.query<{ data: any[] }, void>({
      query: () => '/messages/chat/me',
      providesTags: ['Messages'],
      transformResponse: (response: any) => {
        // Chat list endpoint returns an array of chat entries directly
        const chats = Array.isArray(response) ? response : response?.data || [];
        return { data: chats };
      },
    }),

    /** Fetch conversation with a specific user */
    getConversation: builder.query<{ data: any[] }, { senderId: string; receiverId: string }>({
      query: ({ senderId, receiverId }) => `/messages/conversation/${senderId}/${receiverId}`,
      providesTags: ['Messages'],
      transformResponse: (response: any) => {
        // Conversation endpoint returns an array of messages directly
        const messages = Array.isArray(response) ? response : response?.data || [];
        return { data: messages };
      },
    }),

    /** Send a message */
    createMessage: builder.mutation<any, { text: string; messageReceiver: string | number; messageSender: string | number; messageCategory?: string; product?: string }>({
      query: (body) => ({
        url: '/messages',
        method: 'POST',
        body: body,
      }),
      invalidatesTags: ['Messages'],
    }),

    // ============ Mutations ============

    /** Create a new community post */
    createPost: builder.mutation<PostResponse, CreatePostParams>({
      query: (body) => ({
        url: '/community-posts',
        method: 'POST',
        body: { data: body },
      }),
      invalidatesTags: [{ type: 'Post', id: 'LIST' }, 'MyPosts'],
    }),

    /** Update a community post */
    updatePost: builder.mutation<PostResponse, { id: string; data: Partial<CreatePostParams> }>({
      query: ({ id, data }) => ({
        url: `/community-posts/${id}`,
        method: 'PUT',
        body: { data },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Post', id },
        { type: 'Post', id: 'LIST' },
        'MyPosts',
      ],
    }),

    /** Update post status (available → running-low → gone) */
    updatePostStatus: builder.mutation<PostResponse, UpdateStatusParams>({
      query: ({ id, status }) => ({
        url: `/community-posts/${id}/status`,
        method: 'PUT',
        body: { status },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Post', id },
        { type: 'Post', id: 'LIST' },
        'MyPosts',
      ],
    }),

    /** Get custom Google Auth URL */
    getGoogleAuthUrl: builder.query<{ authUrl: string }, void>({
      query: () => '/auth/social-auth-url/google?platform=susu_map',
    }),

    /** RSVP to an event */
    rsvpEvent: builder.mutation<PostResponse, string>({
      query: (id) => ({
        url: `/community-posts/${id}/rsvp`,
        method: 'PUT',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Post', id },
        { type: 'Post', id: 'LIST' },
        'MyPosts',
      ],
    }),

    /** Delete a post */
    deletePost: builder.mutation<{ data: { deleted: boolean; id: string } }, string>({
      query: (id) => ({
        url: `/community-posts/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Post', id: 'LIST' }, 'MyPosts'],
    }),

    /** Report line */
    reportLine: builder.mutation<PostResponse, string>({
      query: (id) => ({
        url: `/community-posts/${id}/report-line`,
        method: 'PUT',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Post', id },
        { type: 'Post', id: 'LIST' },
        'MyPosts',
      ],
    }),

    /** Join a hangout */
    joinHangout: builder.mutation<PostResponse, string>({
      query: (id) => ({
        url: `/community-posts/${id}/join`,
        method: 'PUT',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Post', id },
        { type: 'Post', id: 'LIST' },
      ],
    }),

    /** Leave a hangout */
    leaveHangout: builder.mutation<PostResponse, string>({
      query: (id) => ({
        url: `/community-posts/${id}/leave`,
        method: 'PUT',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Post', id },
        { type: 'Post', id: 'LIST' },
      ],
    }),

    /** Fetch active community stories */
    getStories: builder.query<{ data: any[] }, { lat?: number; lng?: number } | void>({
      query: () => '/community-stories',
      providesTags: ['Messages'], // Reuse tag for now
    }),

    /** Create a new story */
    createStory: builder.mutation<{ data: any }, CreateStoryParams>({
      query: (body) => ({
        url: '/community-stories',
        method: 'POST',
        body: { data: body },
      }),
    }),

    /** React to a story */
    reactToStory: builder.mutation<{ data: any }, { id: string; emoji: string }>({
      query: ({ id, emoji }) => ({
        url: `/community-stories/${id}/react`,
        method: 'PUT',
        body: { emoji },
      }),
    }),

    /** Verify .edu email */
    verifyEduEmail: builder.mutation<{ success: boolean; message: string; testCode?: string }, { email: string }>({
      query: (body) => ({
        url: '/profile/verify-edu',
        method: 'POST',
        body,
      }),
    }),

    /** Confirm .edu email */
    confirmEduEmail: builder.mutation<{ success: boolean; school: string; schoolEmail: string; schoolEmailVerified: boolean }, { code: string }>({
      query: (body) => ({
        url: '/profile/confirm-edu',
        method: 'POST',
        body,
      }),
    }),

    /** Update profile (e.g. username, bio, profilePic) */
    updateProfile: builder.mutation<any, { username?: string; bio?: string; profilePic?: number | string; profilePicUrl?: string }>({
      query: (body) => ({
        url: '/profile/me',
        method: 'PUT',
        body,
      }),
    }),

    /** Upload Media */
    uploadMedia: builder.mutation<any[], FormData>({
      query: (formData) => ({
        url: '/upload',
        method: 'POST',
        body: formData,
      }),
    }),
  }),
});

// Export typed hooks
export const {
  useGetPostsQuery,
  useGetPostQuery,
  useGetMyPostsQuery,
  useGetLaunchConfigQuery,
  useGetMessagesQuery,
  useGetConversationQuery,
  useGetGoogleAuthUrlQuery,
  useLazyGetGoogleAuthUrlQuery,
  useCreatePostMutation,
  useUpdatePostMutation,
  useUpdatePostStatusMutation,
  useRsvpEventMutation,
  useDeletePostMutation,
  useReportLineMutation,
  useJoinHangoutMutation,
  useLeaveHangoutMutation,
  useGetStoriesQuery,
  useCreateStoryMutation,
  useReactToStoryMutation,
  useVerifyEduEmailMutation,
  useConfirmEduEmailMutation,
  useUpdateProfileMutation,
  useCreateMessageMutation,
  useUploadMediaMutation,
} = communityApi;

export { STRAPI_BASE_URL };
