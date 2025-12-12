<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

BRGY Web Backend - A NestJS application with comprehensive authentication module featuring JWT tokens, refresh tokens, and Role-Based Access Control (RBAC).

## Authentication Features

- **JWT Authentication**: Secure token-based authentication with access and refresh tokens
- **Role-Based Access Control (RBAC)**: Three-tier role system:
  - **Citizen**: Basic access for regular citizens
  - **Admin**: Administrative access for system administrators  
  - **Super Admin**: Full system access for super administrators
- **Password Hashing**: Secure bcrypt password encryption
- **Token Refresh**: Automatic token renewal for extended sessions
- **Protected Routes**: Role-based endpoint protection
- **User Registration**: New user creation with role assignment

## Setup

1. **Install dependencies**:
```bash
$ npm install
```

2. **Environment Configuration**:
Copy `.env.example` to `.env` and update the values:
```bash
$ cp .env.example .env
```

3. **Database Setup**:
Ensure MySQL is running and update the database credentials in your `.env` file.

4. **Seed the Database**:
Create default roles and admin user:
```bash
$ npm run seed
```

## API Endpoints

### Authentication Endpoints

- `POST /auth/register` - Register a new user
- `POST /auth/login` - User login
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout user
- `GET /auth/profile` - Get current user profile (protected)

### Protected Endpoints

- `GET /auth/protected` - Requires 'Citizen', 'Admin', or 'Super Admin' role
- `GET /auth/admin` - Requires 'Admin' or 'Super Admin' role
- `POST /auth/revoke-all` - Revoke all user tokens (Admin only)

## Usage Examples

### Register a new user
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "citizen@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe",
    "roleNames": ["Citizen"]
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "citizen@example.com",
    "password": "password123"
  }'
```

### Access protected endpoint
```bash
curl -X GET http://localhost:3000/auth/protected \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Refresh token
```bash
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

## Default Admin User

After running the seed script, you can use these credentials:
- **Email**: admin@example.com
- **Password**: admin123
- **Role**: Admin

## API Documentation (Swagger)

This application includes comprehensive API documentation using Swagger UI.

### Accessing Swagger UI

Once the application is running, you can access the interactive API documentation at:
- **Swagger UI**: http://localhost:3000/api
- **JSON Specification**: http://localhost:3000/api-json

### Features

- **Interactive Testing**: Try out all API endpoints directly from your browser
- **Authentication**: Built-in JWT Bearer token support for testing protected endpoints
- **Request/Response Examples**: Detailed examples for all request bodies and responses
- **Error Documentation**: Comprehensive error responses with status codes
- **Role-Based Access**: Clear documentation of which roles can access each endpoint

### How to Use

1. **Open Swagger UI**: Navigate to http://localhost:3000/api
2. **Authentication**: 
   - First, use the `/auth/login` endpoint to get a JWT token
   - Click the "Authorize" button at the top of the page
   - Enter `Bearer YOUR_JWT_TOKEN` in the value field
3. **Test Endpoints**: 
   - Expand any endpoint to see details
   - Click "Try it out" to test with custom parameters
   - Execute requests and see live responses

### Available Endpoints in Swagger

- **Authentication**: Register, Login, Refresh Token, Logout, Revoke All Tokens
- **User Management**: Profile, Protected Routes, Admin Routes
- **Role-Based Examples**: Different access levels for admin, user, moderator roles

## Project Structure

```
src/
├── auth/
│   ├── auth.controller.ts
│   ├── auth.module.ts
│   ├── auth.service.ts
│   ├── decorators/
│   │   └── roles.decorator.ts
│   ├── dto/
│   │   ├── auth-response.dto.ts
│   │   ├── login.dto.ts
│   │   ├── register.dto.ts
│   │   └── refresh-token.dto.ts
│   ├── entities/
│   │   ├── refresh-token.entity.ts
│   │   ├── role.entity.ts
│   │   └── user.entity.ts
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   ├── jwt-refresh-auth.guard.ts
│   │   ├── local-auth.guard.ts
│   │   └── roles.guard.ts
│   ├── interfaces/
│   │   └── jwt-payload.interface.ts
│   └── strategies/
│       ├── jwt-refresh.strategy.ts
│       ├── jwt.strategy.ts
│       └── local.strategy.ts
├── database/
│   ├── database.module.ts
│   └── seed.ts
└── app.module.ts
```

## Security Notes

- Change JWT secrets in production
- Use HTTPS in production
- Implement rate limiting
- Regularly rotate refresh tokens
- Use environment variables for sensitive data

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
