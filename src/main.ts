import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common'; // Import ValidationPipe and Logger
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'; // Import Swagger
import { ConfigService } from '@nestjs/config'; // Import ConfigService

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap'); // Create a logger instance
  const configService = app.get(ConfigService); // Get ConfigService instance

  // --- Global Pipes ---
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Automatically remove properties without decorators
      transform: true, // Automatically transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true, // Allow conversion of primitive types (e.g., string query param to number)
      },
      // forbidNonWhitelisted: true, // Optional: Throw error if extra properties are sent
    }),
  );

  // --- CORS ---
  // Configure CORS more specifically if needed
  app.enableCors(); // Enables basic CORS for all origins

  // --- Swagger ---
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Project Matcher API')
    .setDescription('API documentation for the Project Matcher application')
    .setVersion('1.0')
    .addBearerAuth() // Add JWT Bearer token authentication to Swagger UI
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, document); // Serve Swagger UI at /api

  // --- Port ---
  const port = configService.get<number>('PORT', 3000); // Use PORT env var or default to 3000

  await app.listen(port);
  logger.log(`Application listening on port ${port}`);
  logger.log(`Swagger UI available at http://localhost:${port}/api`);
}
bootstrap();
