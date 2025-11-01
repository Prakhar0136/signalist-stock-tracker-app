import {inngest} from "@/lib/inngest/client"
import { PERSONALIZED_WELCOME_EMAIL_PROMPT } from "./prompts"
import { sendWelcomeEmail } from "../nodemailer"

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