import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // asset_library (background/mascot_pose/overlay_card) is seeded by importRealAssets.ts from
  // the real files delivered into public/assets/ — see that script instead of placeholder rows here.

  // --- audio_library: BGM per market + shared SFX (TICKET-006b AC) ---
  await prisma.audioLibraryItem.createMany({
    data: [
      {
        market: 'jp',
        audioType: 'bgm',
        filePath: '/audio/bgm/jp/warm_morning.mp3',
        moodTag: 'warm',
        segmentTypeTags: ['morning_news', 'gratitude_ritual'],
        durationSeconds: 120,
        loopSafe: true,
        licenseSource: 'YouTube Audio Library — placeholder, verify before use',
      },
      {
        market: 'kr',
        audioType: 'bgm',
        filePath: '/audio/bgm/kr/warm_morning.mp3',
        moodTag: 'warm',
        segmentTypeTags: ['morning_news', 'gratitude_ritual'],
        durationSeconds: 120,
        loopSafe: true,
        licenseSource: 'YouTube Audio Library — placeholder, verify before use',
      },
      {
        market: 'shared',
        audioType: 'sfx',
        filePath: '/audio/sfx/bird_chirp_intro.mp3',
        sfxTrigger: 'bird_chirp_intro',
        segmentTypeTags: [],
        durationSeconds: 2,
        loopSafe: false,
        licenseSource: 'YouTube Audio Library — placeholder, verify before use',
      },
      {
        market: 'shared',
        audioType: 'sfx',
        filePath: '/audio/sfx/chime_transition.mp3',
        sfxTrigger: 'chime_transition',
        segmentTypeTags: [],
        durationSeconds: 1.5,
        loopSafe: false,
        licenseSource: 'YouTube Audio Library — placeholder, verify before use',
      },
      {
        market: 'shared',
        audioType: 'sfx',
        filePath: '/audio/sfx/page_turn.mp3',
        sfxTrigger: 'page_turn',
        segmentTypeTags: ['bedtime_story'],
        durationSeconds: 1,
        loopSafe: false,
        licenseSource: 'YouTube Audio Library — placeholder, verify before use',
      },
    ],
    skipDuplicates: true,
  });

  console.log('Seed complete.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
