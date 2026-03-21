import localBlogs from '@/data/blogs.json';

function toExcerpt(post) {
  if (post.excerpt?.trim()) {
    return post.excerpt.trim();
  }

  return String(post.content || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180);
}

export function normalizeBlog(post) {
  return {
    _id: String(post._id),
    title: String(post.title || '').trim(),
    excerpt: toExcerpt(post),
    content: String(post.content || '').trim(),
    category: String(post.category || 'General').trim(),
    author: String(post.author || 'Admin Team').trim(),
    createdAt: post.createdAt || new Date().toISOString(),
    image: String(post.image || '/assets/picNew3.jpeg').trim(),
  };
}

export function getLocalBlogs() {
  return [...localBlogs]
    .map(normalizeBlog)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function getBlogCategories(posts = getLocalBlogs()) {
  return ['All', ...new Set(posts.map((post) => post.category))];
}
