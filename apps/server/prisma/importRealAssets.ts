/**
 * Imports the real asset library delivered in komorebi-library/ (copied into public/assets/) —
 * TICKET-007's actual output. Run with: npx ts-node prisma/importRealAssets.ts
 *
 * Note on aspectSafeCrop: an earlier delivery had the mascot bird painted directly into each
 * scene at the left third, which a center-crop to 9:16 (TICKET-009b's Shorts mechanism) would
 * likely have clipped. The library was regenerated as clean empty scenes (mascot composited
 * separately via mascot_pose assets instead) — no baked-in off-center subject, so
 * aspectSafeCrop: true is accurate here. Re-check this if the art direction changes again.
 */
import { PrismaClient } from '@prisma/client';
import type { SeasonTag, TimeOfDayTag } from '@komorebi/shared-types';

const prisma = new PrismaClient();

interface BackgroundRow {
  file: string;
  timeOfDay: TimeOfDayTag;
  season: SeasonTag;
  setting: 'outdoor_porch' | 'indoor';
  mood: string;
}

type MotionAnchors = {
  steam?: { x: number; y: number };
  lampFlicker?: { x: number; y: number };
  precipitation?: { x: number; y: number; width: number; height: number; kind: 'rain' | 'snow' };
};

function motionAnchorsFor(background: BackgroundRow): MotionAnchors | undefined {
  if (background.file.includes('indoor_rain')) {
    return { steam: { x: 62, y: 72 }, lampFlicker: { x: 26, y: 38 }, precipitation: { x: 50, y: 8, width: 47, height: 65, kind: 'rain' } };
  }
  if (background.file.includes('indoor_winter')) {
    return { steam: { x: 61, y: 73 }, lampFlicker: { x: 27, y: 38 }, precipitation: { x: 52, y: 8, width: 45, height: 62, kind: 'snow' } };
  }
  if (background.setting === 'indoor') {
    return { steam: { x: 62, y: 73 }, lampFlicker: { x: 27, y: 38 } };
  }
  if (background.timeOfDay === 'night' || background.timeOfDay === 'evening') {
    return { lampFlicker: { x: 69, y: 48 } };
  }
  return undefined;
}

const jpBackgrounds: BackgroundRow[] = [
  { file: 'jp_01_morning_spring.png', timeOfDay: 'morning', season: 'spring', setting: 'outdoor_porch', mood: 'warm' },
  { file: 'jp_02_morning_summer.png', timeOfDay: 'morning', season: 'summer', setting: 'outdoor_porch', mood: 'warm' },
  { file: 'jp_03_morning_autumn.png', timeOfDay: 'morning', season: 'autumn', setting: 'outdoor_porch', mood: 'calm' },
  { file: 'jp_04_morning_winter.png', timeOfDay: 'morning', season: 'winter', setting: 'outdoor_porch', mood: 'calm' },
  { file: 'jp_05_midday_spring.png', timeOfDay: 'afternoon', season: 'spring', setting: 'outdoor_porch', mood: 'warm' },
  { file: 'jp_06_midday_summer.png', timeOfDay: 'afternoon', season: 'summer', setting: 'outdoor_porch', mood: 'playful' },
  { file: 'jp_07_midday_autumn.png', timeOfDay: 'afternoon', season: 'autumn', setting: 'outdoor_porch', mood: 'warm' },
  { file: 'jp_08_midday_winter.png', timeOfDay: 'afternoon', season: 'winter', setting: 'outdoor_porch', mood: 'calm' },
  { file: 'jp_09_sunset_spring.png', timeOfDay: 'evening', season: 'spring', setting: 'outdoor_porch', mood: 'nostalgic' },
  { file: 'jp_10_sunset_summer.png', timeOfDay: 'evening', season: 'summer', setting: 'outdoor_porch', mood: 'nostalgic' },
  { file: 'jp_11_sunset_autumn.png', timeOfDay: 'evening', season: 'autumn', setting: 'outdoor_porch', mood: 'nostalgic' },
  { file: 'jp_12_sunset_winter.png', timeOfDay: 'evening', season: 'winter', setting: 'outdoor_porch', mood: 'nostalgic' },
  { file: 'jp_13_night_spring.png', timeOfDay: 'night', season: 'spring', setting: 'outdoor_porch', mood: 'calm' },
  { file: 'jp_14_night_summer.png', timeOfDay: 'night', season: 'summer', setting: 'outdoor_porch', mood: 'calm' },
  { file: 'jp_15_night_autumn.png', timeOfDay: 'night', season: 'autumn', setting: 'outdoor_porch', mood: 'calm' },
  { file: 'jp_16_night_winter.png', timeOfDay: 'night', season: 'winter', setting: 'outdoor_porch', mood: 'calm' },
  { file: 'jp_17_indoor_rain.png', timeOfDay: 'any', season: 'any', setting: 'indoor', mood: 'calm' },
  { file: 'jp_18_indoor_winter.png', timeOfDay: 'any', season: 'winter', setting: 'indoor', mood: 'calm' },
  { file: 'jp_19_indoor_quiet_night.png', timeOfDay: 'night', season: 'any', setting: 'indoor', mood: 'calm' },
  { file: 'jp_20_indoor_early_morning.png', timeOfDay: 'morning', season: 'any', setting: 'indoor', mood: 'warm' },
];

const krBackgrounds: BackgroundRow[] = [
  { file: 'kr_01_morning_spring.png', timeOfDay: 'morning', season: 'spring', setting: 'outdoor_porch', mood: 'warm' },
  { file: 'kr_02_midday_summer.png', timeOfDay: 'afternoon', season: 'summer', setting: 'outdoor_porch', mood: 'playful' },
  { file: 'kr_03_sunset_autumn.png', timeOfDay: 'evening', season: 'autumn', setting: 'outdoor_porch', mood: 'nostalgic' },
  { file: 'kr_04_night_winter.png', timeOfDay: 'night', season: 'winter', setting: 'outdoor_porch', mood: 'calm' },
];

// Filename -> pose_name, matching the values assetSelection.ts's SEGMENT_TO_POSE already expects.
const mascotPoses: { file: string; poseName: string; mood: string }[] = [
  { file: '01_greeting.png', poseName: 'standing', mood: 'warm' },
  { file: '02_head_tilt_curious.png', poseName: 'tilt_head', mood: 'playful' },
  { file: '03_wing_flap.png', poseName: 'wing_flap', mood: 'playful' },
  { file: '04_sleep.png', poseName: 'sleeping', mood: 'calm' },
  { file: '05_contemplative_bow.png', poseName: 'looking_down', mood: 'nostalgic' },
  { file: '06_looking_skyward.png', poseName: 'looking_up', mood: 'warm' },
  { file: '07_preening.png', poseName: 'preening', mood: 'warm' },
  { file: '08_fluffed_warm.png', poseName: 'puffed_up', mood: 'warm' },
];

const krMascotPoses: { file: string; poseName: string; mood: string }[] = [
  { file: '01_standing.png', poseName: 'standing', mood: 'warm' },
  { file: '02_tilt_head.png', poseName: 'tilt_head', mood: 'playful' },
  { file: '03_wing_flap.png', poseName: 'wing_flap', mood: 'playful' },
  { file: '04_sleeping.png', poseName: 'sleeping', mood: 'calm' },
  { file: '05_looking_down.png', poseName: 'looking_down', mood: 'nostalgic' },
  { file: '06_looking_up.png', poseName: 'looking_up', mood: 'warm' },
  { file: '07_preening.png', poseName: 'preening', mood: 'warm' },
  { file: '08_puffed_up.png', poseName: 'puffed_up', mood: 'warm' },
];

async function main() {
  await prisma.assetLibraryItem.deleteMany({});

  await prisma.assetLibraryItem.createMany({
    data: [
      ...jpBackgrounds.map((b) => ({
        market: 'jp' as const,
        assetType: 'background' as const,
        filePath: `/assets/backgrounds/jp/${b.file}`,
        timeOfDayTag: b.timeOfDay,
        seasonTag: b.season,
        settingTag: b.setting,
        moodTag: b.mood,
        aspectSafeCrop: true,
        motionAnchors: motionAnchorsFor(b),
      })),
      ...krBackgrounds.map((b) => ({
        market: 'kr' as const,
        assetType: 'background' as const,
        filePath: `/assets/backgrounds/kr/${b.file}`,
        timeOfDayTag: b.timeOfDay,
        seasonTag: b.season,
        settingTag: b.setting,
        moodTag: b.mood,
        aspectSafeCrop: false,
        motionAnchors: motionAnchorsFor(b),
      })),
      ...mascotPoses.map((p) => ({
        market: 'shared' as const,
        assetType: 'mascot_pose' as const,
        filePath: `/assets/mascot/${p.file}`,
        poseName: p.poseName,
        moodTag: p.mood,
        aspectSafeCrop: true, // transparent cutouts, safe at any crop
      })),
      ...krMascotPoses.map((p) => ({
        market: 'kr' as const,
        assetType: 'mascot_pose' as const,
        filePath: `/assets/mascot/kr/${p.file}`,
        poseName: p.poseName,
        moodTag: p.mood,
        aspectSafeCrop: true,
      })),
      {
        market: 'shared' as const,
        assetType: 'overlay_card' as const,
        filePath: '/assets/overlay/quiz_card.png',
        overlayRole: 'quiz_card',
        moodTag: 'playful',
        aspectSafeCrop: true,
      },
      {
        market: 'shared' as const,
        assetType: 'overlay_card' as const,
        filePath: '/assets/overlay/qmark_badge.png',
        overlayRole: 'qmark_badge',
        moodTag: 'playful',
        aspectSafeCrop: true,
      },
    ],
  });

  const counts = await prisma.assetLibraryItem.groupBy({
    by: ['market', 'assetType'],
    _count: true,
  });
  console.log('Imported asset_library rows:', counts);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
