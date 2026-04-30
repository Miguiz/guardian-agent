import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Guardian DeFi Agent')
    .setDescription(
      'API backend hackathon — évaluation de risque swap (quote Uniswap + RiskEngine), sans exécution de transaction.',
    )
    .setVersion('0.1.0')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    jsonDocumentUrl: 'docs/json',
  });

  const port = parseInt(process.env.PORT ?? '3000', 10);
  const listenPort = Number.isFinite(port) ? port : 3000;
  await app.listen(listenPort);
  const logger = new Logger('Bootstrap');
  logger.log(`Listening on http://localhost:${listenPort}`);
  logger.log(`OpenAPI UI: http://localhost:${listenPort}/docs`);
  logger.log(`OpenAPI JSON: http://localhost:${listenPort}/docs/json`);
}

void bootstrap();
