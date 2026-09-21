#!/bin/sh
set -eu

cd /app
npx prisma migrate deploy --schema apps/server/prisma/schema.prisma
ASSET_COUNT="$(node -e "const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.assetLibraryItem.count().then(n=>console.log(n)).finally(()=>p.\$disconnect())")"
AUDIO_COUNT="$(node -e "const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.audioLibraryItem.count().then(n=>console.log(n)).finally(()=>p.\$disconnect())")"
[ "$ASSET_COUNT" -gt 0 ] || npm run prisma:import-assets -w apps/server
[ "$AUDIO_COUNT" -gt 0 ] || npm run prisma:seed -w apps/server
exec npm run start -w apps/server
