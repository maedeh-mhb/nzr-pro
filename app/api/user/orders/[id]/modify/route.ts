import { NextResponse } from "next/server";

export async function PATCH() {
  return NextResponse.json(
    { error: "Customer order editing is no longer available" },
    { status: 410 }
  );
}
