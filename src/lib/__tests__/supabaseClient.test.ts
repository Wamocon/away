import * as supabaseClient from "../supabaseClient";

describe("supabaseClient lib", () => {
  it("should export supabase and getSchema", () => {
    expect(typeof supabaseClient.supabase).toBe("object");
    expect(typeof supabaseClient.getSchema).toBe("function");
  });
});
