import { db, withTransaction } from "../apps/api/src/db";
import { dispatchCkepJournalEvent } from "../apps/api/src/ckep-reactive";

async function main(){
  const limit=Math.min(Math.max(Number(process.env.CERVEL_CKEP_DRAIN_LIMIT??50),1),500);
  const pending=await db.query(`SELECT j.id,j.node_id,j.workspace_id FROM ckep_event_journal j LEFT JOIN ckep_reactive_dispatches d ON d.journal_event_id=j.id WHERE d.journal_event_id IS NULL OR d.status='failed' ORDER BY j.created_at,j.sequence LIMIT $1`,[limit]);
  let succeeded=0,failed=0;
  for(const row of pending.rows){
    try{await withTransaction(client=>dispatchCkepJournalEvent(client,{nodeId:row.node_id,workspaceId:row.workspace_id,journalEventId:row.id}));succeeded++;}
    catch(error){failed++;console.error(JSON.stringify({event:"ckep_drain_failed",journal_event_id:row.id,error:error instanceof Error?error.message:String(error)}));}
  }
  console.log(JSON.stringify({ok:failed===0,processed:pending.rowCount,succeeded,failed}));
  if(failed)process.exitCode=1;
}

main().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>db.end());
