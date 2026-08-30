// Keep the API result compatible with ChannelCard and saved campaigns.
const text = { type: "string" };
const strings = { type: "array", items: text };
const object = (properties: Record<string, unknown>) => ({
  type: "object", properties, required: Object.keys(properties), additionalProperties: false,
});
export const campaignFields: Record<string, Record<string, unknown>> = {
  email: { subject: text, body: text },
  instagram: { caption: text, imageIdea: text, bestTime: text },
  facebook: { text, boostTip: text, imageIdea: text },
  google_ads: { headlines: strings, descriptions: strings, keywords: strings, dailyBudget: text },
  tiktok: { hook: text, script: text, cta: text, thumbnailIdea: text },
  sms: { text },
  xiaohongshu: { title: text, body: text, hashtags: strings, coverTextIdea: text, productTags: strings, bestTime: text },
  wechat: { momentsPost: text, officialAccountTitle: text, officialAccountSummary: text, miniProgramCta: text, bestTime: text },
};
export const campaignSchema = object({
  strategy: text,
  channels: { type: "array", items: { anyOf: Object.entries(campaignFields).map(([channel, fields]) => object({
    channel: { type: "string", enum: [channel] }, why: text,
    content: object({ variant_a: object(fields), variant_b: object(fields) }),
  })) } },
  thisWeek: { type: "array", items: object({ day: text, action: text, why: text }) },
});

export function validateCampaign(value: unknown): void {
  const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
  const nonempty = (v: unknown) => typeof v === "string" && v.trim().length > 0;
  if (!isObject(value) || !nonempty(value.strategy) || !Array.isArray(value.channels) || !value.channels.length || !Array.isArray(value.thisWeek) || value.thisWeek.length !== 3) throw new SyntaxError("Incomplete campaign structure");
  const seen = new Set();
  for (const c of value.channels) {
    if (!isObject(c) || typeof c.channel !== "string" || !Object.hasOwn(campaignFields,c.channel) || seen.has(c.channel) || !nonempty(c.why) || !isObject(c.content)) throw new SyntaxError("Invalid campaign channel");
    seen.add(c.channel);
    for (const key of ["variant_a", "variant_b"]) {
      const variant = c.content[key];
      if (!isObject(variant)) throw new SyntaxError("Missing campaign variant");
      for (const [field, schema] of Object.entries(campaignFields[c.channel])) {
        const v = variant[field];
        if ((schema as {type:string}).type === "array" ? !Array.isArray(v) || !v.every(nonempty) : !nonempty(v)) throw new SyntaxError("Invalid campaign content");
      }
    }
  }
  for (const action of value.thisWeek) if (!isObject(action) || ![action.day,action.action,action.why].every(nonempty)) throw new SyntaxError("Invalid campaign action plan");
}
