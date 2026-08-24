import {createDemoAIHandler,demoAIHealth,resetDemoAIRateLimits} from "../../apps/api/src/demo-ai";

const request=(query:string,history:unknown[]=[],ip="203.0.113.9")=>({ip,body:{query,history}}) as any;
const providerResponse=()=>({ok:true,json:async()=>({id:"resp_test_1",model:"gpt-test",output:[{type:"message",content:[{type:"output_text",text:"A concise answer with evidence."}]}]})}) as Response;

describe("Ask CERVEL OpenAI gateway",()=>{
 beforeEach(()=>resetDemoAIRateLimits());

 test("is explicitly disabled without a server-side API key",async()=>{
  const handler=createDemoAIHandler({apiKey:""});
  await expect(handler(request("Hello"))).rejects.toMatchObject({message:"DEMO_AI_NOT_CONFIGURED",statusCode:503});
  expect(demoAIHealth({apiKey:""})).toMatchObject({configured:false,provider:"openai"});
  expect(demoAIHealth({apiKey:"configured"}).model).toBe("gpt-5-mini");
 });

 test("uses the Responses API without provider storage and returns an archive suggestion",async()=>{
  const fetchMock=jest.fn(async()=>providerResponse());
  const handler=createDemoAIHandler({apiKey:"server-secret",model:"gpt-test",fetchImpl:fetchMock as unknown as typeof fetch,now:()=>100});
  const result=await handler(request("Summarize our revenue and pricing strategy"));
  expect(result).toMatchObject({answer:"A concise answer with evidence.",provider:"openai",model:"gpt-test",response_id:"resp_test_1",archive_suggestion:{vertical:"Business"},disclosure_receipt:{external:true,stored_by_provider:false}});
  const [url,init]=fetchMock.mock.calls[0] as unknown as [string,RequestInit];
  expect(url).toBe("https://api.openai.com/v1/responses");
  expect(init.headers).toMatchObject({authorization:"Bearer server-secret"});
  expect(JSON.parse(String(init.body))).toMatchObject({model:"gpt-test",store:false,max_output_tokens:1200});
  expect(JSON.stringify(result)).not.toContain("server-secret");
 });

 test("bounds inputs and public-demo usage",async()=>{
  const fetchMock=jest.fn(async()=>providerResponse());
  const handler=createDemoAIHandler({apiKey:"key",fetchImpl:fetchMock as unknown as typeof fetch,now:()=>100});
  await expect(handler(request("x".repeat(4001)))).rejects.toMatchObject({message:"DEMO_AI_QUERY_TOO_LONG",statusCode:413});
  for(let i=0;i<12;i++)await handler(request(`question ${i}`,[],"198.51.100.2"));
  await expect(handler(request("one more",[],"198.51.100.2"))).rejects.toMatchObject({message:"DEMO_AI_RATE_LIMITED",statusCode:429});
 });
});
