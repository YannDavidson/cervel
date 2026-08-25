import { demoApp } from "../../apps/api/src/demo-assets";
import { demoNoteCaptureCss, patchDemoNoteCapture } from "../../apps/api/src/demo-note-capture-patch";

const patched = patchDemoNoteCapture(demoApp);

describe("PR #52 — smooth note capture + direct subtab notes", () => {
  test("removes the competing instant Untitled-note handler", () => {
    expect(patched).not.toContain("notes.push({id:id,title:'Untitled note'");
    expect(patched).toContain("if(a==='new-note'){openComposer(null);return}");
  });

  test("keeps composer title and content in durable draft state", () => {
    for (const feature of [
      "composerDraft:{title:'',body:''}",
      "state.composerDraft.title=composerTitle.value",
      "state.composerDraft.body=composerBody.value",
      "value=\"'+esc(draft.title||'')+'\"",
      "'+esc(draft.body||'')+'",
    ]) expect(patched).toContain(feature);
  });

  test("adds a direct add-note control to every rendered subtab", () => {
    for (const feature of [
      "enhanceSubtabActions",
      "data-direct-note",
      "Add note directly to ",
      "Add note here",
      "KNOWLEDGE_DIRECT_FILED",
      "direct placement",
    ]) expect(patched).toContain(feature);
    expect(demoNoteCaptureCss).toContain(".subtab-add");
  });

  test("supports keyboard-first note capture", () => {
    expect(patched).toContain("state.composer&&e.key==='Escape'");
    expect(patched).toContain("state.composer&&(e.metaKey||e.ctrlKey)&&e.key==='Enter'");
    expect(patched).toContain("form.requestSubmit()");
  });

  test("keeps direct filing semantic rather than duplicating the note", () => {
    expect(patched).toContain("state.memberships[state.corpus+':'+n.id]=filed");
    expect(patched).toContain("state.selected=id");
    expect(patched).toContain("state.view='notes'");
    expect(patched).toContain("source:'Added in demo Vault · automatic corpus classification'");
  });

  test("remains valid standalone browser JavaScript", () => {
    expect(() => new Function(patched)).not.toThrow();
  });
});
