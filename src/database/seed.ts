import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Role } from '../auth/entities/role.entity';
import { User } from '../auth/entities/user.entity';
import * as bcrypt from 'bcrypt';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const roleRepository = app.get(getRepositoryToken(Role));
  const userRepository = app.get(getRepositoryToken(User));

  try {
    const defaultRoles = [
      { name: 'Citizen', description: 'Regular citizen with basic access' },
      { name: 'Admin', description: 'Administrator with administrative access' },
      { name: 'Super Admin', description: 'Super administrator with full system access' },
    ];

    for (const roleData of defaultRoles) {
      const existingRole = await roleRepository.findOne({
        where: { name: roleData.name },
      });

      if (!existingRole) {
        const role = roleRepository.create(roleData);
        await roleRepository.save(role);
        console.log(`Created role: ${roleData.name}`);
      } else {
        console.log(`Role already exists: ${roleData.name}`);
      }
    }

    const adminRole = await roleRepository.findOne({
      where: { name: 'Admin' },
    });

    if (adminRole) {
      const existingAdmin = await userRepository.findOne({
        where: { email: 'admin@example.com' },
        relations: ['roles'],
      });

      if (existingAdmin) {
        // Delete existing admin user to recreate with correct ID
        await userRepository.delete({ email: 'admin@example.com' });
        console.log('Deleted existing admin user');
      }

      const hashedPassword = await bcrypt.hash('admin123', 10);
      const admin = userRepository.create({
        id: 'admin-user-id', // Specify the ID to match JWT expectations
        email: 'admin@example.com',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        roles: [adminRole],
      });
      await userRepository.save(admin);
      console.log('Created default admin user: admin@example.com / admin123 with ID: admin-user-id');
    }

    console.log('Seed completed successfully!');
  } catch (error) {
    console.error('Error during seeding:', error.message);
  } finally {
    await app.close();
  }
}

bootstrap().catch(console.error);
