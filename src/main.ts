import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { AppModule } from './app.module';
import { AppZodValidationPipe } from './common/zod/app-zod-validation.pipe';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new AppZodValidationPipe());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Guardian DeFi Agent')
    .setDescription(
      'API backend hackathon — évaluation de risque swap (quote Uniswap Trade API + RiskEngine), sans exécution de transaction. `UNISWAP_API_KEY` requise au démarrage du serveur.',
    )
    .setVersion('0.1.0')
    .build();
  const document = cleanupOpenApiDoc(
    SwaggerModule.createDocument(app, swaggerConfig),
  );
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
