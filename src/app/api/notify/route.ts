import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL;

interface Detection {
  serialNumber: string;
  serialName: string;
  pageTitle: string;
  sourceUrl: string;
  isShopee: boolean;
}

export async function POST(request: NextRequest) {
  try {
    if (!RESEND_API_KEY) {
      return NextResponse.json(
        { error: "Email notifications not configured", configured: false },
        { status: 200 }
      );
    }

    const body = await request.json();
    const { detections, recipientEmail } = body as {
      detections: Detection[];
      recipientEmail?: string;
    };

    const email = recipientEmail || NOTIFICATION_EMAIL;

    if (!email) {
      return NextResponse.json(
        { error: "No recipient email configured", configured: false },
        { status: 200 }
      );
    }

    if (!detections || detections.length === 0) {
      return NextResponse.json(
        { error: "No detections to report" },
        { status: 400 }
      );
    }

    const resend = new Resend(RESEND_API_KEY);

    // Build email content
    const shopeeCount = detections.filter((d) => d.isShopee).length;
    const otherCount = detections.length - shopeeCount;

    const detectionsList = detections
      .map(
        (d) => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #eee;">
            <strong>${d.serialName}</strong><br/>
            <span style="color: #666; font-size: 12px;">${d.serialNumber}</span>
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #eee;">
            <a href="${d.sourceUrl}" style="color: #f97316;">${d.pageTitle}</a>
            ${d.isShopee ? '<span style="background: #EE4D2D; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; margin-left: 8px;">蝦皮</span>' : ""}
          </td>
        </tr>
      `
      )
      .join("");

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>NCC 序號監控通知</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #f97316, #ea580c); padding: 24px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">NCC 序號監控通知</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0;">發現新的序號使用記錄</p>
        </div>

        <div style="background: #fff; border: 1px solid #eee; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
            <strong style="color: #92400e;">發現 ${detections.length} 筆新結果</strong>
            <p style="margin: 8px 0 0; color: #a16207; font-size: 14px;">
              ${shopeeCount > 0 ? `蝦皮: ${shopeeCount} 筆` : ""}
              ${shopeeCount > 0 && otherCount > 0 ? " | " : ""}
              ${otherCount > 0 ? `其他: ${otherCount} 筆` : ""}
            </p>
          </div>

          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #f9fafb;">
                <th style="padding: 12px; text-align: left; font-size: 12px; color: #6b7280; text-transform: uppercase;">序號</th>
                <th style="padding: 12px; text-align: left; font-size: 12px; color: #6b7280; text-transform: uppercase;">發現位置</th>
              </tr>
            </thead>
            <tbody>
              ${detectionsList}
            </tbody>
          </table>

          <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #eee; text-align: center;">
            <a href="#" style="display: inline-block; background: #f97316; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
              查看詳情
            </a>
          </div>
        </div>

        <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 24px;">
          此郵件由 NCC 序號監控系統自動發送
        </p>
      </body>
      </html>
    `;

    const { data, error } = await resend.emails.send({
      from: "NCC Monitor <onboarding@resend.dev>",
      to: [email],
      subject: `[NCC 監控] 發現 ${detections.length} 筆新的序號使用記錄`,
      html: htmlContent,
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json(
        { error: "Failed to send email", details: error },
        { status: 500 }
      );
    }

    console.log("Email sent successfully:", data);

    return NextResponse.json({
      success: true,
      emailId: data?.id,
      configured: true,
    });
  } catch (error) {
    console.error("Email notification error:", error);
    return NextResponse.json(
      { error: "Failed to send notification", message: String(error) },
      { status: 500 }
    );
  }
}

// Check if email notifications are configured
export async function GET() {
  const configured = !!(RESEND_API_KEY && NOTIFICATION_EMAIL);

  return NextResponse.json({
    configured,
    hasApiKey: !!RESEND_API_KEY,
    hasEmail: !!NOTIFICATION_EMAIL,
  });
}
