'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { usePostStore } from '../store/postStore';

export default function Home() {
  const { 
    posts, 
    loading, 
    fetchPosts, 
    addPost, 
    removePost, 
    toggleLike, 
    addComment,
    updateComment,
    deleteComment 
  } = usePostStore();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState<{ [key: string]: string }>({});
  const [editingComment, setEditingComment] = useState<{ id: string; text: string } | null>(null);
  const [showComments, setShowComments] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!title || !text) {
      setError('Title and text are required');
      return;
    }

    setError(null);
    try {
      await addPost({ title, text, image: image || undefined });
    setTitle('');
    setText('');
    setImage(null);
    setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create post');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await removePost(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete post');
    }
  };

  const handleLike = async (id: string) => {
    try {
      await toggleLike(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle like');
    }
  };

  const handleCommentChange = (postId: string, comment: string) => {
    setComments(prev => ({ ...prev, [postId]: comment }));
  };

  const handleAddComment = async (postId: string) => {
    const comment = comments[postId];
    if (!comment?.trim()) return;

    try {
      await addComment(postId, comment);
      setComments(prev => ({ ...prev, [postId]: '' }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add comment');
    }
  };

  const toggleComments = (postId: string) => {
    setShowComments(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

  const handleEditComment = (comment: { id: string; text: string }) => {
    setEditingComment(comment);
  };

  const handleSaveEdit = async () => {
    if (!editingComment) return;
    try {
      await updateComment(editingComment.id, editingComment.text);
      setEditingComment(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update comment');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteComment(commentId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete comment');
    }
  };

  return (
    <div 
      className="min-h-screen bg-cover bg-center bg-fixed"
      style={{
        backgroundImage: 'url("https://www.baltana.com/files/wallpapers-29/Bulgaria-HD-Desktop-Wallpaper-95295.jpg")'
      }}
    >
      <div className="max-w-xl mx-auto p-4 min-h-screen">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4 shadow-lg">
            {error}
            <button
              className="absolute top-0 right-0 px-4 py-3"
              onClick={() => setError(null)}
            >
              ×
            </button>
          </div>
        )}

        <button 
          onClick={() => setShowForm(true)} 
          className="fixed bottom-6 right-6 w-14 h-14 bg-emerald-400 hover:bg-emerald-500 text-white rounded-full flex items-center justify-center text-3xl shadow-lg transition-colors"
        >
          +
        </button>

      {showForm && (
          <div className="border p-4 rounded shadow-lg mb-4 bg-white/95">
          <input
            type="text"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-2 border rounded mb-2"
          />
          <textarea
            placeholder="Text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full p-2 border rounded mb-2"
          />
          <input type="file" accept="image/*" onChange={handleImageChange} className="mb-2" />
          {image && <Image src={image} alt="Preview" width={100} height={100} className="mb-2" />}
            <button 
              onClick={handleSubmit} 
              className="bg-emerald-400 hover:bg-emerald-500 text-white px-6 py-2 rounded-md font-medium uppercase tracking-wide text-sm transition-colors"
            >
              Post
            </button>
        </div>
      )}
        {loading ? (
          <div className="text-center text-white font-semibold text-xl drop-shadow-lg">Loading...</div>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="border p-4 rounded shadow-lg mb-4 bg-white/95">
          <h2 className="font-bold">{post.title}</h2>
          <p>{post.text}</p>
              {post.image && (
                <Image 
                  src={post.image} 
                  alt="Post image" 
                  width={500} 
                  height={300} 
                  className="mt-2 w-full h-auto object-cover rounded-lg"
                  style={{ maxHeight: '500px' }}
                />
              )}
              <div className="flex items-center mt-2 space-x-4">
                <div className="flex flex-col items-center">
                  <button 
                    onClick={() => handleLike(post.id)} 
                    className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
                      post.is_liked 
                        ? 'bg-pink-500 hover:bg-pink-600' 
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      viewBox="0 0 24 24" 
                      fill="currentColor"
                      className={`w-6 h-6 ${post.is_liked ? 'text-white' : 'text-gray-500'}`}
                    >
                      <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                    </svg>
                  </button>
                  <span className="text-xs text-gray-500 mt-1">{post.likes_count ?? 0}</span>
                </div>
                <div className="flex flex-col items-center">
                  <button 
                    onClick={() => handleDelete(post.id)} 
                    className="w-10 h-10 flex items-center justify-center bg-red-500 hover:bg-red-600 rounded-full text-white transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <span className="text-xs text-gray-500 mt-1">Delete</span>
                </div>
              </div>

              <div className="mt-4 border-t pt-4">
                <div className="flex items-center mb-3">
                  <div className="flex flex-col items-center mr-4">
                    <div className="w-10 h-10 flex items-center justify-center rounded-full bg-emerald-400 text-white">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                        <path fillRule="evenodd" d="M4.804 21.644A6.707 6.707 0 006 21.75a6.721 6.721 0 003.583-1.029c.774.182 1.584.279 2.417.279 5.322 0 9.75-3.97 9.75-9 0-5.03-4.428-9-9.75-9s-9.75 3.97-9.75 9c0 2.409 1.025 4.587 2.674 6.192.232.226.277.428.254.543a3.73 3.73 0 01-.814 1.686.75.75 0 00.44 1.223zM8.25 10.875a1.125 1.125 0 100 2.25 1.125 1.125 0 000-2.25zM10.875 12a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0zm4.875-1.125a1.125 1.125 0 100 2.25 1.125 1.125 0 000-2.25z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-xs text-gray-500 mt-1">Comments</span>
                  </div>
                  <span className="text-sm text-gray-600">({post.comments?.length || 0})</span>
                </div>
                <div className="space-y-3">
                  {(post.comments || []).map((comment, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded-lg">
                      {editingComment?.id === comment.id ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editingComment.text}
                            onChange={(e) => setEditingComment({ ...editingComment, text: e.target.value })}
                            className="w-full p-2 border rounded text-sm"
                          />
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => setEditingComment(null)}
                              className="text-gray-500 hover:text-gray-700 text-sm"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleSaveEdit}
                              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between items-start">
                            <p className="text-sm">{comment.text}</p>
                            <div className="flex space-x-2 ml-4">
                              <button
                                onClick={() => handleEditComment(comment)}
                                className="w-8 h-8 flex items-center justify-center bg-amber-400 hover:bg-amber-500 rounded-full text-white transition-colors"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                className="w-8 h-8 flex items-center justify-center bg-red-500 hover:bg-red-600 rounded-full text-white transition-colors"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(comment.created_at).toLocaleDateString()}
                          </p>
                        </>
                      )}
        </div>
      ))}
                </div>
                <div className="flex space-x-2 mt-3">
                  <input
                    type="text"
                    value={comments[post.id] || ''}
                    onChange={(e) => handleCommentChange(post.id, e.target.value)}
                    placeholder="Write a comment..."
                    className="flex-1 p-2 border rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddComment(post.id)}
                  />
                  <button
                    onClick={() => handleAddComment(post.id)}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                  >
                    Comment
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
