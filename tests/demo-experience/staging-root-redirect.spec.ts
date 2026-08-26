import Fastify from "fastify";
import { registerDemoRoutes } from "../../apps/api/src/demo-routes";

describe("staging status console",()=>{
  const originalRuntimeMode=process.env.CERVEL_RUNTIME_MODE;

  afterEach(()=>{
    if(originalRuntimeMode===undefined)delete process.env.CERVEL_RUNTIME_MODE;
    else process.env.CERVEL_RUNTIME_MODE=originalRuntimeMode;
  });

  test("renders a standalone staging console without redirecting the demo",async()=>{
    process.env.CERVEL_RUNTIME_MODE="staging";
    const app=Fastify();
    registerDemoRoutes(app);
    await app.ready();

    const response=await app.inject({method:"GET",url:"/"});

    expect(response.statusCode).toBe(200);
    expect(response.headers.location).toBeUndefined();
    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.headers["content-security-policy"]).toContain("script-src 'self'");
    expect(response.headers["content-security-policy"]).toContain("connect-src 'self'");
    expect(response.body).toContain("Staging status");
    expect(response.body).toContain('src="/staging/status.js"');
    expect(response.body).toContain('data-status-card="live"');
    expect(response.body).toContain('data-status-card="ready"');
    expect(response.body).toContain('data-status-card="health"');
    expect(response.body).toContain('data-status-card="demo"');
    expect(response.body).toContain('href="/demo"');
    expect(response.body).not.toContain('href="/health"');
    await app.close();
  });

  test("serves the status console client only in staging",async()=>{
    process.env.CERVEL_RUNTIME_MODE="staging";
    const app=Fastify();
    registerDemoRoutes(app);
    await app.ready();

    const response=await app.inject({method:"GET",url:"/staging/status.js"});

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("application/javascript");
    expect(response.body).toContain('url:"/live"');
    expect(response.body).toContain('url:"/ready"');
    expect(response.body).toContain('url:"/health"');
    expect(response.body).toContain('url:"/v1/demo/health"');
    expect(response.body).toContain("setInterval(refresh,60000)");
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
    expect(response.body).not.toContain("Staging status<br>console.");
    await app.close();
  });

  test("does not claim staging-only routes outside staging",async()=>{
    process.env.CERVEL_RUNTIME_MODE="local";
    const app=Fastify();
    registerDemoRoutes(app);
    await app.ready();

    const root=await app.inject({method:"GET",url:"/"});
    const client=await app.inject({method:"GET",url:"/staging/status.js"});

    expect(root.statusCode).toBe(404);
    expect(client.statusCode).toBe(404);
    await app.close();
  });
});
