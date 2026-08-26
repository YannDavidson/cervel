import type{FastifyInstance}from"fastify";
import{advanceDemo,seedDemo}from"../../../packages/demo-experience/src";
import{demoApp,demoCss,demoPage}from"./demo-assets";
import{demoDesignApp,demoDesignCss,demoDesignPage}from"./demo-design-assets";
import{demoNoteCaptureCss,patchDemoNoteCapture}from"./demo-note-capture-patch";
export{demoPage}from"./demo-assets";
const demoAppV52=patchDemoNoteCapture(demoApp);
const demoCssV52=`${demoCss}\n${demoNoteCaptureCss}`;
const demoPageV52=demoPage.replaceAll("v=51","v=52");
export function registerDemoRoutes(app:FastifyInstance){
 if(process.env.CERVEL_RUNTIME_MODE==="staging")app.get("/",async(_r,reply)=>reply.header("cache-control","no-store").redirect("/demo",302));
 app.get("/demo",async(_r,reply)=>reply.type("text/html; charset=utf-8").header("cache-control","no-store").header("content-security-policy","default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'").send(demoPageV52));
 app.get("/demo/app.css",async(_r,reply)=>reply.type("text/css; charset=utf-8").header("cache-control","no-cache, must-revalidate").send(demoCssV52));
 app.get("/demo/app.js",async(_r,reply)=>reply.type("application/javascript; charset=utf-8").header("cache-control","no-cache, must-revalidate").send(demoAppV52));
 app.get("/design-preview",async(_r,reply)=>reply.type("text/html; charset=utf-8").header("cache-control","no-store").header("content-security-policy","default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'").send(demoDesignPage));
 app.get("/design-preview/app.css",async(_r,reply)=>reply.type("text/css; charset=utf-8").header("cache-control","no-cache, must-revalidate").send(demoDesignCss));
 app.get("/design-preview/app.js",async(_r,reply)=>reply.type("application/javascript; charset=utf-8").header("cache-control","no-cache, must-revalidate").send(demoDesignApp));
 app.get("/v1/demo/seed",async()=>seedDemo(`demo-${Date.now().toString(36)}`));
 app.post("/v1/demo/action",async r=>{const b=r.body as any;if(!b?.state||!b?.action)throw Object.assign(new Error("DEMO_ACTION_REQUIRED"),{statusCode:400});return advanceDemo(b.state,b.action);});
 app.get("/v1/demo/health",async()=>({ok:true,experience:"alpha-golden-path",isolated:true,synthetic_data:true,ui:"interactive-workspace"}));
}
