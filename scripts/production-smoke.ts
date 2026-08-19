const base=(process.env.CERVEL_BASE_URL??"").replace(/\/$/,"");
if(!base)throw new Error("CERVEL_BASE_URL is required");

async function check(path:string){
  const response=await fetch(`${base}${path}`,{redirect:"error"});
  if(!response.ok)throw new Error(`${path} returned ${response.status}`);
  const body=await response.json() as {ok?:boolean};
  if(body.ok!==true)throw new Error(`${path} did not report ok`);
}

await check("/live");
await check("/ready");
console.log(JSON.stringify({ok:true,base_url:base}));
