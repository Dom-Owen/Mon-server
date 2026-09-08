"use server";

import { redirect } from "next/navigation";
import { ouvrirSession } from "@/lib/auth";
import { semerDemonstration } from "@/lib/semences";

/** Ouvre la démonstration avec un compte et des données d'exemple déjà remplies. */
export async function actionDemarrerDemo() {
  const id = await semerDemonstration();
  await ouvrirSession(id);
  redirect("/app");
}
