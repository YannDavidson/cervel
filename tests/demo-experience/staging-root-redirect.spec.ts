import Fastify from "fastify";
import { registerDemoRoutes } from "../../apps/api/src/demo-routes";

describe("staging root demo redirect",()=>{
  const originalRuntimeMode=process.env.CERVEL_RUNTIME_MODE;

  afterEach(()=>{
    if(originalRuntimeMode===undefined)delete process.env.CERVEL_RUNTIME_MODE;
    else process.env.CERVEL_RUNTIME_MODE=originalRuntimeMode;
  });

  test("redirects staging root to /demo without caching",async()=>{
    process.env.CERVEL_RUNTIME_MODE="staging";
    const app=Fastify();
    registerDemoRoutes(app);
    await app.ready();

    const response=await app.inject({method:"GET",url:"/"});

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe("/demo");
    expect(response.headers["cache-control"]).toBe("no-store");
    await app.close();
  });

  test("does not claim the API root outside staging",async()=>{
    process.env.CERVEL_RUNTIME_MODE="local";
    const app=Fastify();
    registerDemoRoutes(app);
    await app.ready();

    const response=await app.inject({method:"GET",url:"/"});

    expect(response.statusCode).toBe(404);
    await app.close();
  });
});
