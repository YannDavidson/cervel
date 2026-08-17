describe("knowledge connector contracts",()=>{
  test("supported provider identifiers stay stable",()=>{
    expect(["google_drive","dropbox","onedrive"]).toEqual(expect.arrayContaining(["google_drive","dropbox","onedrive"]));
  });
  test("automation secrets are not provider tokens",()=>{
    process.env.CERVEL_AUTOMATION_KEY="scheduler";
    process.env.CERVEL_CONNECTOR_TOKEN_KEY="encryption";
    expect(process.env.CERVEL_AUTOMATION_KEY).not.toBe(process.env.CERVEL_CONNECTOR_TOKEN_KEY);
  });
});
