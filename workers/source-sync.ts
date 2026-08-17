import { db,withTransaction } from "../apps/api/src/db";
import { syncDueSources } from "../apps/api/src/connectors";

async function main(){
  const limit=Math.min(Number(process.env.CERVEL_SYNC_BATCH_SIZE??20),100);
  const results=await withTransaction(client=>syncDueSources(client,limit));
  console.log(JSON.stringify({processed:results.length,results}));
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>db.end());
