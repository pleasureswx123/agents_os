import 'reflect-metadata';

async function bootstrap() {
  const port = Number(process.env.API_PORT ?? 3000);
  console.log(`Agents OS API placeholder ready on port ${port}`);
}

void bootstrap();
