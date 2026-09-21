import { PrismaClient } from '@prisma/client';
import { appendQuizTimestamps, buildFallbackSeo } from '../src/services/seo';

const prisma = new PrismaClient();

async function main() {
  const items = await prisma.contentItem.findMany({ orderBy: [{ scheduledDate: 'asc' }, { timeSlot: 'asc' }] });
  for (const item of items) {
    const metadata = (item.scriptMetadata as Record<string, unknown>) ?? {};
    const tags = Array.isArray(metadata.tags) ? metadata.tags.filter((tag): tag is string => typeof tag === 'string') : [];
    const seo = buildFallbackSeo({
      market: item.market,
      segmentType: item.segmentType,
      title: item.title ?? '',
      scriptText: item.scriptText ?? '',
      tags,
      targetKeyword: item.targetKeyword ?? undefined,
      dayIndex: Math.floor(item.scheduledDate.getTime() / 86_400_000),
    });
    const captionCues = Array.isArray(metadata.captionCues)
      ? metadata.captionCues.filter(
          (cue): cue is { text: string; startSeconds: number } =>
            Boolean(cue) && typeof cue === 'object' && typeof (cue as any).text === 'string' && typeof (cue as any).startSeconds === 'number',
        )
      : [];
    const description = item.segmentType === 'quiz'
      ? appendQuizTimestamps(item.seoDescription || seo.seoDescription, captionCues)
      : item.seoDescription || seo.seoDescription;
    await prisma.contentItem.update({
      where: { id: item.id },
      data: {
        targetKeyword: item.targetKeyword || seo.targetKeyword,
        seoTitle: item.seoTitle || seo.seoTitle,
        seoDescription: description,
        seoTags: item.seoTags.length > 0 ? item.seoTags : seo.seoTags,
      },
    });
  }
  console.log(`Backfilled SEO metadata for ${items.length} content items.`);
}

main().finally(() => prisma.$disconnect());
