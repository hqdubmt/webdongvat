import bcrypt from 'bcryptjs';
import { prisma } from './prisma';

export async function seedSuperadmin() {
  const count = await prisma.user.count();
  if (count > 0) return;

  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const hashed = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      username,
      password: hashed,
      displayName: 'Superadmin',
      role: 'SUPERADMIN',
    },
  });

  console.log(`[seed] Superadmin created: username="${username}"`);
}
