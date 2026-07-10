import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { JSX } from 'react';
import { buildPageMetadata } from '../../../components/content-page';
import { getAllDocSlugs, getDocPage } from '../../../lib/docs';
import { renderMarkdown } from '../../../lib/markdown';

interface Props {
  params: Promise<{ slug: string[] }>;
}

export function generateStaticParams() {
  return getAllDocSlugs().map((slug) => ({
    slug: slug.split('/'),
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = getDocPage(slug.join('/'));

  if (!page) return { title: 'Docs' };

  return buildPageMetadata({
    title: page.title,
    description: page.description,
    path: `/docs/${slug.join('/')}`,
  });
}

export default async function DocPage({ params }: Props): Promise<JSX.Element> {
  const { slug } = await params;
  const slugStr = slug.join('/');
  const page = getDocPage(slugStr);

  if (!page) return notFound();

  return (
    <div dangerouslySetInnerHTML={{ __html: renderMarkdown(page.content) }} />
  );
}
