const post = {
  name: 'post',
  title: 'Blog Post',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required().min(3).max(200),
    },
    {
      name: 'excerpt',
      title: 'Excerpt',
      type: 'text',
      rows: 3,
    },
    {
      name: 'content',
      title: 'Content',
      type: 'text',
      rows: 12,
      validation: (Rule) => Rule.required().min(10),
    },
    {
      name: 'category',
      title: 'Category',
      type: 'string',
      initialValue: 'General',
    },
    {
      name: 'author',
      title: 'Author',
      type: 'string',
      initialValue: 'Admin Team',
    },
    {
      name: 'image',
      title: 'Image URL',
      type: 'url',
      description: 'Public image URL. Can be a Sanity CDN URL or any https URL.',
      validation: (Rule) => Rule.required().uri({ scheme: ['http', 'https'] }),
    },
    {
      name: 'imageUrl',
      title: 'Image URL (legacy)',
      type: 'url',
      description: 'Optional legacy field. The app accepts either image or imageUrl.',
      validation: (Rule) => Rule.uri({ scheme: ['http', 'https'] }),
    },
    {
      name: 'createdAt',
      title: 'Created At',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
    },
  ],
}

export default post;
