import {inngest} from "@/lib/inngest/client"
import { NEWS_SUMMARY_EMAIL_PROMPT,PERSONALIZED_WELCOME_EMAIL_PROMPT } from "@/lib/inngest/prompts"
import {sendNewsSummaryEmail,sendWelcomeEmail } from "@/lib/nodemailer"
import { getAllUsersForNewsEmail } from "../actions/user.actions"
import { getWatchlistSymbolsByEmail } from "@/lib/actions/watchlist.actions"
import { getNews } from "../actions/finnhub.actions"
import { getFormattedTodayDate } from "@/lib/utils";



export const sendSignUpEmail = inngest.createFunction(
    {id:'sign-up-email'},
    {event:'app/user.created'},
    async({event,step})=>{
        const userProfile = `
        -Country:${event.data.Country}
        -Investment Goals:${event.data.investmentGoals}
        -Risk Tolerance:${event.data.riskTolerance}
        -Preferred Industry:${event.data.preferredIndustry}
        `

        const prompt = PERSONALIZED_WELCOME_EMAIL_PROMPT.replace('{{userProfile}}',userProfile)

        const response = await step.ai.infer('generate-welcome-intro',{
            model:step.ai.models.gemini({model:'gemini-2.0-flash-lite'}),
            body:{
                contents:[
                    {
                        role:'user',
                        parts:[
                            {text:prompt}
                        ]
                    }]
            }
        })

        await step.run('sen-welcome-email', async()=>{
            const part = response.candidates?.[0]?.content?.parts?.[0]
            const introText = (part &&'text' in part? part.text:null)||'Thanks for joining signalist.You now have tools to track market and make smarter moves'

            const {data:{email,name}} = event
            return await sendWelcomeEmail({email,name,intro:introText})
        })



        return {
            success:true,
            message:'welcome email sent successfully'
        }

    }
)

export const sendDailyNewsSummary = inngest.createFunction(
  { id: "daily-news-summary" },
  [
    { event: "app/send-daily-news" },
    { cron: "0 1 * * *" }, // every day at 9 AM
  ],
  async ({ step }) => {
    // Step #1: Fetch all users eligible for news
    const users = await step.run("get-all-users", getAllUsersForNewsEmail);
    if (!users || users.length === 0) {
      console.warn("⚠️ No users found for daily news email.");
      return { success: false, message: "No users found for news email." };
    }

    // Step #2: Fetch personalized news for each user
    const results = await step.run("fetch-user-news", async () => {
      const perUser: Array<{ user: UserForNewsEmail; articles: MarketNewsArticle[] }> = [];

      for (const user of users as UserForNewsEmail[]) {
        try {
          const symbols = await getWatchlistSymbolsByEmail(user.email);
          let articles = await getNews(symbols);

          // Cap at 6 articles per user
          articles = (articles || []).slice(0, 6);

          // Fallback to general news if empty
          if (!articles || articles.length === 0) {
            articles = await getNews();
            articles = (articles || []).slice(0, 6);
          }

          perUser.push({ user, articles });
        } catch (e) {
          console.error("❌ Error preparing news for", user.email, e);
          perUser.push({ user, articles: [] });
        }
      }

      return perUser;
    });

    // Step #3: Summarize the news for each user using AI
    const userNewsSummaries: { user: UserForNewsEmail; newsContent: string | null }[] = [];

    for (const { user, articles } of results) {
      try {
        // Handle missing articles gracefully
        if (!articles || articles.length === 0) {
          console.warn(`⚠️ No news data found for user: ${user.email}`);
          userNewsSummaries.push({ user, newsContent: "No news data available today." });
          continue;
        }

        console.log(`📰 Sending ${articles.length} articles for ${user.email} to AI model`);

        // Keep only relevant fields
        const newsJson = JSON.stringify(
          articles.map((a) => ({
            headline: a.headline,
            summary: a.summary,
            url: a.url,
            source: a.source,
            datetime: a.datetime,
          })),
          null,
          2
        );

        const prompt = NEWS_SUMMARY_EMAIL_PROMPT.replace("{{newsData}}", newsJson);

        const response = await step.ai.infer(`summarize-news-${user.email}`, {
          model: step.ai.models.gemini({ model: "gemini-2.5-flash-lite" }),
          body: {
            contents: [{ role: "user", parts: [{ text: prompt }] }],
          },
        });

        const part = response.candidates?.[0]?.content?.parts?.[0];
        const newsContent =
          (part && "text" in part ? part.text : null) || "No market news available.";

        userNewsSummaries.push({ user, newsContent });
      } catch (e) {
        console.error("❌ Failed to summarize news for:", user.email, e);
        userNewsSummaries.push({ user, newsContent: null });
      }
    }

    // Step #4: Send the summarized emails
    await step.run("send-news-emails", async () => {
      await Promise.all(
        userNewsSummaries.map(async ({ user, newsContent }) => {
          if (!newsContent) return false;
          return await sendNewsSummaryEmail({
            email: user.email,
            date: getFormattedTodayDate(),
            newsContent,
          });
        })
      );
    });

    return { success: true, message: "✅ Daily news summary emails sent successfully." };
  }
);