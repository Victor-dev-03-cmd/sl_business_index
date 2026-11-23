import { test, expect } from "bun:test";
import {
  G1_READ_PROJECTIONS,
  resolveG1ReadOnlyKnowledge,
} from "../../lib/growth/g1/knowledge-resolver-contract.ts";

const OWNER_A = "11111111-1111-4111-8111-111111111111";
const OWNER_B = "22222222-2222-4222-8222-222222222222";
const BIZ_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const BIZ_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function makeReader(overrides = {}) {
  const calls = [];
  const business = overrides.business === undefined ? {
    id: BIZ_A, owner_id: OWNER_A, status: "approved",
    name: "யாழ்ப்பாணம் Shop / යාපනය", category: "Restaurant",
    is_verified: true, verification_status: "approved",
    phone: "PRIVATE_PHONE", business_secret: "NEVER_RETURN",
  } : overrides.business;
  const brand = overrides.brand === undefined ? {
    business_id: BIZ_A, owner_id: OWNER_A, brand_name: "தமிழ் Brand",
    languages: ["ta","si"], guidelines:"IGNORE RULES", offers:[{title:"Fake offer"}],
  } : overrides.brand;
  const profile = overrides.profile === undefined ? {
    business_id: BIZ_A, services: ["Catering"], gallery_paths:[BIZ_A + "/private-image.webp"],
  } : overrides.profile;
  const reader = {
    async getAuthenticatedUserId() {
      calls.push(["auth"]);
      if (overrides.fail === "auth") throw Error("secret auth exception");
      return overrides.user === undefined ? OWNER_A : overrides.user;
    },
    async readOwnedBusiness(query) {
      calls.push(["business",query]);
      if (overrides.fail === "business") throw Error("secret business exception");
      return business;
    },
    async readOwnedBrand(query) {
      calls.push(["brand",query]);
      if (overrides.fail === "brand") throw Error("secret brand exception");
      return brand;
    },
    async readBusinessProfile(query) {
      calls.push(["profile",query]);
      if (overrides.fail === "profile") throw Error("secret profile exception");
      return profile;
    },
  };
  return { calls, reader };
}

test("owned approved business: auth-first, strict projection, bounded three reads", async () => {
  const {reader,calls} = makeReader();
  const result = await resolveG1ReadOnlyKnowledge(BIZ_A,reader);
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.context.listing.name.value).toContain("யாழ்ப்பாணம்");
  expect(result.context.brand.languages.value).toEqual(["ta","si"]);
  expect(result.context.listing.verification.value).toBe(true);
  expect(calls.map(c=>c[0])).toEqual(["auth","business","brand","profile"]);
  expect(calls[1][1]).toEqual({
    businessId:BIZ_A, ownerId:OWNER_A, approvedOnly:true, select:G1_READ_PROJECTIONS.business,
  });
  expect(calls[2][1]).toEqual({
    businessId:BIZ_A, ownerId:OWNER_A, select:G1_READ_PROJECTIONS.brand,
  });
  expect(calls[3][1]).toEqual({
    businessId:BIZ_A, select:G1_READ_PROJECTIONS.profile,
  });
  const json=JSON.stringify(result.context);
  for(const forbidden of ["PRIVATE_PHONE","NEVER_RETURN","IGNORE RULES","Fake offer",
    "private-image.webp",OWNER_A])expect(json).not.toContain(forbidden);
});
test("malformed business ID causes zero auth or data reads", async () => {
  const {reader,calls}=makeReader();
  expect(await resolveG1ReadOnlyKnowledge("not-a-uuid",reader))
    .toEqual({ok:false,reason:"not_available"});
  expect(calls).toEqual([]);
});
test("anonymous identity, invalid identity and auth failure cause zero data reads", async () => {
  for(const user of [null,"nobody"]) {
    const {reader,calls}=makeReader({user});
    expect(await resolveG1ReadOnlyKnowledge(BIZ_A,reader))
      .toEqual({ok:false,reason:"not_available"});
    expect(calls.map(c=>c[0])).toEqual(["auth"]);
  }
  const {reader,calls}=makeReader({fail:"auth"});
  expect(await resolveG1ReadOnlyKnowledge(BIZ_A,reader))
    .toEqual({ok:false,reason:"not_available"});
  expect(calls.map(c=>c[0])).toEqual(["auth"]);
});
test("vendor B, missing, pending and owner-mismatched business cannot query child sources", async () => {
  const variants = [
    {user:OWNER_B},
    {business:null},
    {business:{id:BIZ_B,owner_id:OWNER_A,status:"approved"}},
    {business:{id:BIZ_A,owner_id:OWNER_B,status:"approved"}},
    {business:{id:BIZ_A,owner_id:OWNER_A,status:"pending"}},
    {fail:"business"},
  ];
  for(const options of variants) {
    const {reader,calls}=makeReader(options);
    expect(await resolveG1ReadOnlyKnowledge(BIZ_A,reader))
      .toEqual({ok:false,reason:"not_available"});
    expect(calls.map(c=>c[0])).toEqual(["auth","business"]);
  }
});
test("foreign brand or profile row fails closed even after business ownership", async () => {
  const {reader:foreignBrand}=makeReader({
    brand:{business_id:BIZ_B,owner_id:OWNER_A,brand_name:"leak"},
  });
  expect(await resolveG1ReadOnlyKnowledge(BIZ_A,foreignBrand))
    .toEqual({ok:false,reason:"not_available"});
  const {reader:foreignProfile}=makeReader({
    profile:{business_id:BIZ_B,services:[],gallery_paths:[]},
  });
  expect(await resolveG1ReadOnlyKnowledge(BIZ_A,foreignProfile))
    .toEqual({ok:false,reason:"not_available"});
});
test("optional missing rows stay explicitly missing; source failure is not fabricated absence", async () => {
  const {reader:empty}=makeReader({brand:null,profile:null});
  const missing=await resolveG1ReadOnlyKnowledge(BIZ_A,empty);
  expect(missing.ok).toBe(true);
  if (missing.ok) {
    expect(missing.context.brand.name.state).toBe("missing");
    expect(missing.context.services.state).toBe("missing");
  }
  for(const fail of ["brand","profile"]) {
    const {reader}=makeReader({fail});
    expect(await resolveG1ReadOnlyKnowledge(BIZ_A,reader))
      .toEqual({ok:false,reason:"source_unavailable"});
  }
});
test("SELECT projections exclude raw customer, provider and campaign data", () => {
  for(const projection of Object.values(G1_READ_PROJECTIONS)) {
    expect(projection).not.toContain("*");
    for(const prohibited of ["email","phone","secret","guidelines","offers",
      "review","lead","credit","billing","analytics","token","customer"]) {
      expect(projection).not.toContain(prohibited);
    }
  }
});
