import { Test } from '@nestjs/testing';
import { AppModule } from '../../backend/src/app.module';
import { INestApplication } from '@nestjs/common';
import 'reflect-metadata'; // 👈 MUST be at the top


describe('Application bootstrap', () => {
  let app: INestApplication;

  it('should create the app without errors', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.enableCors();
    await app.init();

    expect(app).toBeDefined();

    await app.close();
  });
});
