import nodemailer from 'nodemailer';

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/send")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        const emailMap: Record<string, string> = {
                product: 'demo@spara.ir',
                redTeam: 'redteam@spara.ir',
                blueTeam: 'blueteam@spara.ir',
                purpleTeam: 'purpleteam@spara.ir',
                hiring: 'we@spara.ir',
                info: 'info@spara.ir',
                commercial: 'commercial@spara.ir',
            };


            const { name, phone, company, message, meet_type, formName, formType, resume } = body;

            if (!name || !phone || !message || !meet_type || !formType) {
                return Response.json({ error: 'لطفاً تمام فیلدهای ضروری را پر کنید.' }, { status: 400 });
            }

            const recipientEmail = emailMap[formType];
            if (!recipientEmail) {
                return Response.json({ error: 'نوع فرم نامعتبر است.' }, { status: 400 });
            }

            try {
                const transporter = nodemailer.createTransport({
                    host: process.env.SMTP_HOST,
                    port: parseInt(process.env.SMTP_PORT || '587', 10),
                    secure: process.env.SMTP_SECURE === 'true',
                    auth: {
                        user: process.env.SMTP_USER,
                        pass: process.env.SMTP_PASS,
                    },
                    logger: true,
                    debug: true,
                    tls: {
                        rejectUnauthorized: false,
                    },
                });

                const attachments: Array<{ filename: string; content: Buffer; contentType?: string }> = [];
                if (resume && typeof resume === 'object' && resume.content && resume.filename) {
                    try {
                        attachments.push({
                            filename: resume.filename,
                            content: Buffer.from(resume.content, 'base64'),
                            contentType: resume.contentType || 'application/octet-stream',
                        });
                    } catch (attachmentErr) {
                        console.warn('Invalid resume attachment payload', attachmentErr);
                    }
                }

                const mailOptions = {
                    from: `"اسپارا" <${process.env.SMTP_USER}>`,
                    to: recipientEmail,
                    subject: `یک اعلان جدید از فرم ${formName || formType}`,
                    attachments,
                    html: `
            <!DOCTYPE html>
            <html lang="fa" dir="rtl">
            <head>
              <meta charset="UTF-8" />
              <style>
                body { font-family: Tahoma, sans-serif; background: #f4f4f7; margin:0; padding:0;}
                .container { max-width:600px; margin:20px auto; background:#fff; border-radius:8px; box-shadow:0 4px 12px rgba(0,0,0,0.1); overflow:hidden; border-top:6px solid #4f46e5; }
                .header { background:#4f46e5; color:white; padding:16px; text-align:center; font-size:20px; font-weight:bold; }
                .content { padding:20px; color:#333; }
                .content p { margin:8px 0; }
                .content .label { font-weight:bold; color:#4f46e5; }
                .footer { padding:16px; text-align:center; font-size:12px; color:#888; background:#f9f9f9; }
                .divider { border-top:1px solid #e0e0e0; margin:16px 0; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">پیغام جدید از فرم ${formName || formType}</div>
                <div class="content">
                  <p><span class="label">نام و نام خانوادگی:</span> ${name}</p>
                  <p><span class="label">شماره تماس:</span> ${phone}</p>
                  <p><span class="label">نام شرکت:</span> ${company || '---'}</p>
                  <p><span class="label">نوع تماس:</span> ${meet_type}</p>
                  <div class="divider"></div>
                  <p><span class="label">پیغام:</span></p>
                  <p>${message}</p>
                </div>
                <div class="footer">این پیام از طریق وبسایت شما ارسال شده است.</div>
              </div>
            </body>
            </html>
          `,
                };

                await transporter.sendMail(mailOptions);

                return Response.json({ message: 'پیغام شما با موفقیت ارسال شد.' }, { status: 200 });
            } catch (error) {
                console.error(error);
                return Response.json({ error: 'ارسال ایمیل با مشکل مواجه شد.' }, { status: 500 });
            }
      },
    },
  },
});
