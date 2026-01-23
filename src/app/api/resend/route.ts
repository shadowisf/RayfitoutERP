import { NextRequest } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  const { email, name } = await request.json();

  try {
    const data = await resend.emails.send({
      from: "no-reply@rayfitout.com",
      to: email,
      subject: "Thanks for contacting us!",
      html: `<h1>Hi ${name}!</h1><p>We received your message.</p>`,
    });

    return Response.json({ success: true, data });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
