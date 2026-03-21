const galleryItem = {
  name: 'galleryItem',
  title: 'Gallery Item',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required().min(3).max(120),
    },
    {
      name: 'type',
      title: 'Type',
      type: 'string',
      options: {
        list: [
          { title: 'Image', value: 'image' },
          { title: 'Video', value: 'video' },
        ],
        layout: 'radio',
      },
      initialValue: 'image',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'category',
      title: 'Category',
      type: 'string',
      description: 'Optional category label (e.g. Community Service, Recognition & Awards, Events).',
    },
    {
      name: 'image',
      title: 'Image (optional)',
      type: 'image',
      options: {
        hotspot: true,
      },
      hidden: ({ parent }) => parent?.type !== 'image',
      description: 'Optional Studio-hosted image. The app will also use the Source URL field when provided.',
    },
    {
      name: 'src',
      title: 'Source URL',
      type: 'url',
      description: 'Public URL for the image/video. For uploads from the website, this will be set automatically.',
      validation: (Rule) => Rule.uri({ scheme: ['http', 'https'] }),
    },
    {
      name: 'thumb',
      title: 'Thumbnail URL',
      type: 'url',
      description: 'Optional thumbnail URL (used mainly for videos).',
      validation: (Rule) => Rule.uri({ scheme: ['http', 'https'] }),
    },
  ],
}

export default galleryItem