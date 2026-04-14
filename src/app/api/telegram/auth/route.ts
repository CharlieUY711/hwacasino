import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const { data: row, error: fetchError } = await supabase
    .from("telegram_tokens")
    .select("user_id, expires_at, used")
    .eq("token", token)
    .single();

  if (fetchError || !row) return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  if (row.used) return NextResponse.json({ error: "Token already used" }, { status: 401 });
  if (new Date(row.expires_at) < new Date()) return NextResponse.json({ error: "Token expired" }, { status: 401 });

  await supabase.from("telegram_tokens").update({ used: true }).eq("token", token);

  const { data: userData, error: userError } = await supabase.auth.admin.getUserById(row.user_id);
  if (userError || !userData?.user?.email) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email: userData.user.email,
  });

  if (linkError || !linkData?.properties?.action_link) {
    return NextResponse.json({ error: "Failed to generate session" }, { status: 500 });
  }

  const actionLink = linkData.properties.action_link;
  const hashPart = actionLink.split("#")[1] ?? "";
  const params = new URLSearchParams(hashPart);
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");

  if (!accessToken) {
    return NextResponse.json({ action_link: actionLink });
  }

  return NextResponse.json({ access_token: accessToken, refresh_token: refreshToken });
}


