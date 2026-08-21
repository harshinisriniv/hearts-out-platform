import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY || "re_not_configured");

// Swap for a verified domain (e.g. notifications@heartsoutforhomeless.org) later
const FROM_ADDRESS = "Hearts Out for Homeless <onboarding@resend.dev>";

export async function sendTaskAssignmentEmail({
  to,
  volunteerName,
  taskTitle,
  taskDescription,
  dueDate,
}: {
  to: string;
  volunteerName: string;
  taskTitle: string;
  taskDescription: string | null;
  dueDate: string | null;
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set — skipping task assignment email");
    return;
  }

  await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: `New task: ${taskTitle}`,
    html: `
      <p>Hi ${volunteerName},</p>
      <p>You've been assigned a new task for Hearts Out for Homeless:</p>
      <p><strong>${taskTitle}</strong></p>
      ${taskDescription ? `<p>${taskDescription}</p>` : ""}
      ${dueDate ? `<p>Due: ${dueDate}</p>` : ""}
      <p>Thank you for volunteering!</p>
    `,
  });
}

export async function sendReminderEmail({
  to,
  volunteerName,
  title,
  detail,
  whenLabel,
}: {
  to: string;
  volunteerName: string;
  title: string;
  detail: string | null;
  whenLabel: string;
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set — skipping reminder email");
    return;
  }

  await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: `Reminder: ${title} — ${whenLabel}`,
    html: `
      <p>Hi ${volunteerName},</p>
      <p>Just a heads up — this is coming up ${whenLabel.toLowerCase()}:</p>
      <p><strong>${title}</strong></p>
      ${detail ? `<p>${detail}</p>` : ""}
      <p>Thank you for volunteering!</p>
    `,
  });
}
