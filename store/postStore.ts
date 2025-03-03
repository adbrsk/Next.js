import { create } from 'zustand';
import { supabase } from '../utils/supabase/client';

// Hardcoded user ID for development
const HARDCODED_USER_ID = '123e4567-e89b-12d3-a456-426614174000';

interface Post {
  id: string;
  user_id: string;
  title: string;
  text: string;
  image?: string;
  created_at: string;
  likes_count: number;
  is_liked: boolean;
  comments: Comment[];
}

interface Comment {
  id: string;
  text: string;
  user_id: string;
  created_at: string;
}

type CreatePostData = Pick<Post, 'title' | 'text' | 'image'>;

interface PostStore {
  posts: Post[];
  loading: boolean;
  fetchPosts: () => Promise<void>;
  addPost: (post: CreatePostData) => Promise<void>;
  removePost: (id: string) => Promise<void>;
  toggleLike: (postId: string) => Promise<void>;
  addComment: (postId: string, text: string) => Promise<void>;
  updateComment: (commentId: string, text: string) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
}

export const usePostStore = create<PostStore>((set, get) => ({
  posts: [],
  loading: false,

  fetchPosts: async () => {
    set({ loading: true });
    try {
      // First fetch all posts
      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select('*, comments(id, text, user_id, created_at)')
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;
      if (!posts) return;

      // Then fetch likes count for each post
      const { data: likesCount, error: likesError } = await supabase
        .from('likes')
        .select('post_id')
        .in('post_id', posts.map(p => p.id));

      if (likesError) throw likesError;

      // Get user's liked posts
      const { data: userLikes, error: userLikesError } = await supabase
        .from('likes')
        .select('post_id')
        .eq('user_id', HARDCODED_USER_ID);

      if (userLikesError) throw userLikesError;

      // Create a map of post_id to likes count
      const likesCountMap = new Map();
      likesCount?.forEach(like => {
        const count = likesCountMap.get(like.post_id) || 0;
        likesCountMap.set(like.post_id, count + 1);
      });

      // Create a set of posts liked by user
      const userLikedPosts = new Set(userLikes?.map(like => like.post_id) || []);

      const transformedPosts = posts.map(post => ({
        ...post,
        likes_count: likesCountMap.get(post.id) || 0,
        is_liked: userLikedPosts.has(post.id),
        comments: post.comments || []
      }));

      set({ posts: transformedPosts });
    } catch (error) {
      console.error('Error fetching posts:', error);
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  toggleLike: async (postId: string) => {
    try {
      const posts = get().posts;
      const post = posts.find(p => p.id === postId);
      if (!post) {
        console.error('Post not found:', postId);
        return;
      }

      // Optimistically update UI
      set({
        posts: posts.map(p => 
          p.id === postId 
            ? { 
                ...p, 
                is_liked: !p.is_liked,
                likes_count: p.is_liked ? p.likes_count - 1 : p.likes_count + 1
              }
            : p
        )
      });

      if (post.is_liked) {
        // Unlike
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', HARDCODED_USER_ID);

        if (error) {
          console.error('Error unliking post:', error);
          throw new Error(`Failed to unlike post: ${error.message}`);
        }
      } else {
        // Like
        const { error } = await supabase
          .from('likes')
          .insert({
            post_id: postId,
            user_id: HARDCODED_USER_ID
          });

        if (error) {
          console.error('Error liking post:', error);
          throw new Error(`Failed to like post: ${error.message}`);
        }
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      // Revert optimistic update on error
      await get().fetchPosts();
      throw error; // Re-throw to propagate to UI
    }
  },

  addPost: async (post) => {
    try {
      let imageUrl = post.image;

      // If the image is a base64 string, upload it to Supabase Storage
      if (post.image && post.image.startsWith('data:image')) {
        try {
          // Extract file type and create file name
          const [mimeType, base64Data] = post.image.split(',');
          const fileType = mimeType.match(/:(.*?);/)?.[1]?.split('/')[1] || 'jpeg';
          const fileName = `${Date.now()}.${fileType}`;
          
          // Convert base64 to Blob with proper MIME type
          const byteCharacters = atob(base64Data);
          const byteArrays = [];
          
          for (let offset = 0; offset < byteCharacters.length; offset += 512) {
            const slice = byteCharacters.slice(offset, offset + 512);
            const byteNumbers = new Array(slice.length);
            for (let i = 0; i < slice.length; i++) {
              byteNumbers[i] = slice.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            byteArrays.push(byteArray);
          }
          
          const blob = new Blob(byteArrays, { type: `image/${fileType}` });
          
          console.log('Uploading image:', { 
            fileName, 
            fileType, 
            blobSize: blob.size, 
            mimeType: blob.type 
          });

          // Upload to Supabase Storage
          const { data: uploadData, error: uploadError } = await supabase
            .storage
            .from('post-images')
            .upload(fileName, blob, {
              contentType: `image/${fileType}`,
              cacheControl: '3600'
            });

          if (uploadError) {
            console.error('Upload error:', uploadError);
            throw new Error(`Failed to upload image: ${uploadError.message}`);
          }

          console.log('Upload successful:', uploadData);

          // Get public URL
          const { data: urlData } = supabase
            .storage
            .from('post-images')
            .getPublicUrl(fileName);

          imageUrl = urlData.publicUrl;
          console.log('Public URL:', imageUrl);

        } catch (uploadError) {
          console.error('Image upload failed:', uploadError);
          throw new Error(`Image upload failed: ${uploadError.message}`);
        }
      }

      // Create post in database
      const { data, error } = await supabase
        .from('posts')
        .insert([{ 
          ...post, 
          image: imageUrl,
          user_id: HARDCODED_USER_ID 
        }])
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        throw error;
      }
      
      set((state) => ({ posts: [data, ...state.posts] }));
    } catch (error) {
      console.error('Error adding post:', error);
      throw error;
    }
  },

  removePost: async (id) => {
    try {
      const post = get().posts.find(p => p.id === id);
      
      // If post has an image stored in Supabase, delete it
      if (post?.image?.includes(process.env.NEXT_PUBLIC_SUPABASE_URL!)) {
        const fileName = post.image.split('/').pop()!;
        await supabase.storage.from('post-images').remove([fileName]);
      }

      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', id)
        .eq('user_id', HARDCODED_USER_ID);

      if (error) throw error;
      
      set((state) => ({
        posts: state.posts.filter((p) => p.id !== id),
      }));
    } catch (error) {
      console.error('Error removing post:', error);
      throw error;
    }
  },

  addComment: async (postId: string, text: string) => {
    try {
      const { data: newComment, error } = await supabase
        .from('comments')
        .insert([
          {
            post_id: postId,
            user_id: HARDCODED_USER_ID, // Use the same hardcoded ID
            text
          }
        ])
        .select('*');

      if (error) throw error;
      if (!newComment || newComment.length === 0) throw new Error('Failed to create comment');

      const comment = newComment[0];
      const posts = get().posts;
      const updatedPosts = posts.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            comments: [...(post.comments || []), comment]
          };
        }
        return post;
      });

      set({ posts: updatedPosts });
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  },

  updateComment: async (commentId: string, text: string) => {
    try {
      const { data: updatedComment, error } = await supabase
        .from('comments')
        .update({ text })
        .eq('id', commentId)
        .eq('user_id', HARDCODED_USER_ID)
        .select('*');

      if (error) throw error;
      if (!updatedComment || updatedComment.length === 0) throw new Error('Comment not found or no permission to update');

      const comment = updatedComment[0];
      const posts = get().posts;
      const updatedPosts = posts.map(post => ({
        ...post,
        comments: post.comments.map(c => 
          c.id === commentId ? { ...comment } : c
        )
      }));

      set({ posts: updatedPosts });
    } catch (error) {
      console.error('Error updating comment:', error);
      throw error;
    }
  },

  deleteComment: async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', HARDCODED_USER_ID);

      if (error) throw error;

      const posts = get().posts;
      const updatedPosts = posts.map(post => ({
        ...post,
        comments: post.comments.filter(c => c.id !== commentId)
      }));

      set({ posts: updatedPosts });
    } catch (error) {
      console.error('Error deleting comment:', error);
      throw error;
    }
  }
})); 