import type{FastifyInstance}from"fastify";
import{advanceDemo,seedDemo}from"../../../packages/demo-experience/src";
import{demoApp,demoCss,demoPage}from"./demo-assets";
export{demoPage}from"./demo-assets";
export function registerDemoRoutes(app:FastifyInstance){
 app.get("/demo",async(_r,reply)=>reply.type("text/html; charset=utf-8").header("cache-control","no-store").header("content-security-policy","default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'").send(demoPage));
 app.get("/demo/app.css",async(_r,reply)=>reply.type("text/css; charset=utf-8").header("cache-control","public, max-age=300").send(demoCss));
 app.get("/demo/app.js",async(_r,reply)=>reply.type("application/javascript; charset=utf-8").header("cache-control","public, max-age=300").send(demoApp));
 app.get("/v1/demo/seed",async()=>seedDemo(`demo-${Date.now().toString(36)}`));
 app.post("/v1/demo/action",async r=>{const b=r.body as any;if(!b?.state||!b?.action)throw Object.assign(new Error("DEMO_ACTION_REQUIRED"),{statusCode:400});return advanceDemo(b.state,b.action);});
 app.get("/v1/demo/health",async()=>({ok:true,experience:"alpha-golden-path",isolated:true,synthetic_data:true,ui:"interactive-workspace"}));
}
