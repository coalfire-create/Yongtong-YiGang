import { db } from "../server/db";
import { summerImages, summerGuidelines } from "@shared/schema";
import { eq } from "drizzle-orm";

async function check() {
  const images = await db.select().from(summerImages).where(eq(summerImages.category, 'timetable'));
  console.log("Timetable images:", images.map(i => ({id: i.id, title: i.title})));

  const guidelines = await db.select().from(summerGuidelines).where(eq(summerGuidelines.category, 'timetable'));
  console.log("Timetable guidelines:", guidelines.map(g => ({id: g.id, title: g.title})));

  process.exit(0);
}
check();
