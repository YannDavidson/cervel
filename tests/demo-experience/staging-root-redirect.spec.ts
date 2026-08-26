import Fastify from "fastify";
import { registerDemoRoutes } from "../../apps/api/src/demo-routes";

describe("staging service home",()=>{
  const originalRuntimeMode=process.env.CERVEL_RUNTIME_MODE;

  afterEach(()=>{
    if(originalRuntimeMode===undefined)delete process.env.CERVEL_RUNTIME_MODE;
    else process.env.CERVEL_RUNTIME_MODE=originalRuntimeMode;
  });

  test("renders a standalone staging root without redirecting the demo",async()=>{
    process.env.CERVEL_RUNTIME_MODE="staging";
    const app=Fastify();
    registerDemoRoutes(app);
    await app.ready();

    const response=await app.inject({method:"GET",url:"/"});

    expect(response.statusCode).toBe(200);
    expect(response.headers.location).toBeUndefined();
    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.body).toContain("Staging service");
    expect(response.body).toContain('href="/demo"');
    expect(response.body).toContain('href="/health"');
    await app.close();
  });

  test("keeps /demo as its own product experience",async()=>{
    process.env.CERVEL_RUNTIME_MODE="staging";
    const app=Fastify();
    registerDemoRoutes(app);
    await app.ready();

    const response=await app.inject({method:"GET",url:"/demo"});

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.body).not.toContain("Staging service<br>is online.");
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
