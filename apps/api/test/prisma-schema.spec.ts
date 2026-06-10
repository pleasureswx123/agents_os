import { PrismaClient } from '@prisma/client';
import { afterAll, describe, expect, it } from 'vitest';

process.env.DATABASE_URL ??= 'postgresql://agents_os:agents_os@localhost:5432/agents_os';

const prisma = new PrismaClient();

describe('seeded Prisma schema', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('has the MVP seed records required to start the factory', async () => {
    const [templateVersionCount, providerConfigCount, userCount] = await Promise.all([
      prisma.templateVersion.count(),
      prisma.providerConfig.count(),
      prisma.user.count()
    ]);

    expect(templateVersionCount).toBeGreaterThanOrEqual(1);
    expect(providerConfigCount).toBeGreaterThanOrEqual(1);
    expect(userCount).toBeGreaterThanOrEqual(1);
  });
});
