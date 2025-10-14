import Vapi from "@vapi-ai/web";
console.log("VAPI TOKEN BEING USED:", process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN);
export const vapi = new Vapi(process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN!);
