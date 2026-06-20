import { Resend } from 'resend'
import { env } from './env'
import VerificationEmail from '@/email/verification-email'
import ResetPasswordEmail from '@/email/reset-password';

const resend = new Resend(env.RESEND_API_KEY)

export async function sendVerificationEmail({ email, appName, verificationUrl, supportEmail, name }: { email: string, appName: string, verificationUrl: string, supportEmail: string, name: string }): Promise<void> {
    try {
        const { data, error } = await resend.emails.send({
            from: env.MAIL_FROM,
            to: email,
            subject: `Verify your email address for ${appName}`,
            react: VerificationEmail({
                name,
                appName,
                verificationUrl,
                supportEmail,
            }),
            tags: [
                { name: "type", value: "email-verification" }
            ]
        });
        if (error) {
            throw error;
        }

    } catch (error) {
        console.error(error);
    }
}

export async function sendResetPasswordEmail({ appName, email, resetUrl, supportEmail }: { email: string, appName: string, resetUrl: string, supportEmail: string }) {
    try {
        const { error } = await resend.emails.send({
            from: env.MAIL_FROM,
            to: email,
            subject: `Reset Password - ${appName}`,
            react: ResetPasswordEmail({
                appName,
                resetUrl,
                supportEmail,
            }),
            tags: [
                { name: "type", value: "reset-password" }
            ]
        });
        if (error) throw error
    }
    catch (error) {
        console.error(error)
    }
}