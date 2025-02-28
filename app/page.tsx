'use client';

import { useState } from 'react';
import { create } from 'zustand';
import Image from 'next/image';

const usePostStore = create((set) => ({
  posts: [],
  addPost: (post: any) => set((state: any) => ({ posts: [post, ...state.posts] })),
  removePost: (id: any) => set((state: any) => ({ posts: state.posts.filter((p: any) => p.id !== id) })),
}));

export default function Home() {
  const { posts, addPost, removePost } = usePostStore();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [image, setImage] = useState(null);
  const [text, setText] = useState('');

  const handleImageChange = (e: any) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImage(reader.result as any);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    if (!title || !text) return;
    addPost({ id: Date.now(), title, text, image });
    setTitle('');
    setText('');
    setImage(null);
    setShowForm(false);
  };

  return (
    <div className="max-w-xl mx-auto p-4">
      <button onClick={() => setShowForm(true)} className="bg-blue-500 text-white px-4 py-2 rounded mb-4">Create</button>
      {showForm && (
        <div className="border p-4 rounded shadow mb-4">
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
          <button onClick={handleSubmit} className="bg-green-500 text-white px-4 py-2 rounded">Save</button>
        </div>
      )}
      {posts.map((post) => (
        <div key={post.id} className="border p-4 rounded shadow mb-4">
          <h2 className="font-bold">{post.title}</h2>
          <p>{post.text}</p>
          {post.image && <Image src={post.image} alt="Post image" width={200} height={200} className="mt-2" />}
          <button onClick={() => removePost(post.id)} className="bg-red-500 text-white px-2 py-1 rounded mt-2">Delete</button>
        </div>
      ))}
    </div>
  );
}
