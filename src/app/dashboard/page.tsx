import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import { countGenerations, db, findUserById, FREE_GENERATIONS, getBrandProfile, markPaid } from "@/lib/db";
import { paidUserIdForSession, PRICE_CENTS } from "@/lib/stripe";
import Dashboard from "./Dashboard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard · Socially" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; canceled?: string }>;
}) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");
  let user = await findUserById(userId);
  if (!user) redirect("/login");

  const params = await searchParams;
  let justPaid = false;
  if (params.session_id && !user.has_paid) {
    try {
      const paidId = await paidUserIdForSession(params.session_id);
      if (paidId === user.id) {
        await markPaid(user.id);
        user = { ...user, has_paid: true };
        justPaid = true;
      }
    } catch (err) {
      console.error(err);
    }
  }

  const used = await countGenerations(user.id);
  const history = await db()`
    SELECT id, input, output, created_at FROM generations
    WHERE user_id = ${user.id} ORDER BY created_at DESC LIMIT 10`;
  const brand = await getBrandProfile(user.id);

  return (
    <Dashboard
      email={user.email}
      hasPaid={user.has_paid}
      freeLeft={Math.max(0, FREE_GENERATIONS - used)}
      price={(PRICE_CENTS / 100).toFixed(PRICE_CENTS % 100 === 0 ? 0 : 2)}
      justPaid={justPaid || (!!params.session_id && user.has_paid)}
      canceled={!!params.canceled}
      history={JSON.parse(JSON.stringify(history))}
      brand={
        brand
          ? {
              businessName: brand.business_name,
              websiteUrl: brand.website_url,
              instagram: brand.instagram,
              samplePosts: brand.sample_posts,
              notes: brand.notes,
              logo: brand.logo,
              colors: brand.colors,
              brief: brand.brief,
              websiteRead: brand.website_text.length > 0,
            }
          : null
      }
    />
  );
}
