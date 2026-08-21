import { NextResponse } from "next/server";
import { authCookie } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(authCookie.name, "", { maxAge: 0, path: "/" });
  return response;
}
