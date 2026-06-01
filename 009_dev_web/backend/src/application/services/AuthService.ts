import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../../domain/repositories/UserRepository';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

export class AuthService {
  private userRepository = new UserRepository();

  async register(username: string, passwordPlain: string) {
    const existingUser = await this.userRepository.findByUsername(username);
    if (existingUser) {
      throw new Error('El usuario ya está registrado');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(passwordPlain, salt);

    const newUser = await this.userRepository.create(username, passwordHash);

    return {
      id: newUser.id,
      username: newUser.username,
      roles: newUser.UserRoles.map((ur) => ur.Role.name),
    };
  }

  async login(username: string, passwordPlain: string) {
    const user = await this.userRepository.findByUsername(username);
    if (!user) {
      throw new Error('Credenciales inválidas');
    }

    const isMatch = await bcrypt.compare(passwordPlain, user.password_hash);
    if (!isMatch) {
      throw new Error('Credenciales inválidas');
    }

    const roles = user.UserRoles.map((ur) => ur.Role.name);

    const token = jwt.sign(
      { userId: user.id, roles },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        roles,
      },
    };
  }
}
