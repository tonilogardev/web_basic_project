import { PrismaClient, User, Role } from '@prisma/client';

const prisma = new PrismaClient();

export class UserRepository {
  async findByUsername(username: string) {
    return prisma.user.findUnique({
      where: { username },
      include: {
        UserRoles: {
          include: {
            Role: true,
          },
        },
      },
    });
  }

  async create(username: string, passwordHash: string) {
    // Buscar el rol READ_ONLY por defecto
    const defaultRole = await prisma.role.findUnique({
      where: { name: 'READ_ONLY' },
    });

    if (!defaultRole) {
      throw new Error('Default role READ_ONLY not found in the database');
    }

    return prisma.user.create({
      data: {
        username,
        password_hash: passwordHash,
        UserRoles: {
          create: {
            role_id: defaultRole.id,
          },
        },
      },
      include: {
        UserRoles: {
          include: {
            Role: true,
          },
        },
      },
    });
  }
}
