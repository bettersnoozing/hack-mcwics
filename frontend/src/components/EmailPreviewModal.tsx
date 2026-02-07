import { Dialog } from './ui/Dialog';
import { Button } from './ui/Button';
import { Mail, Send } from 'lucide-react';

interface EmailPreviewModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  email: {
    to: string;
    subject: string;
    body: string;
  } | null;
}

export function EmailPreviewModal({ open, onClose, onConfirm, email }: EmailPreviewModalProps) {
  if (!email) return null;

  return (
    <Dialog open={open} onClose={onClose}>
      <div className="flex items-center gap-2 text-warmGray-800 mb-1">
        <Mail size={18} className="text-brand-500" />
        <span className="font-semibold">Email Preview</span>
      </div>
      <p className="text-xs text-warmGray-500 mb-4">This email will be added to your outbox (demo mode - not actually sent)</p>

      <div className="rounded-xl border border-warmGray-100 bg-warmGray-50/50 p-4 space-y-3">
        <div className="flex items-start gap-2">
          <span className="text-xs font-medium text-warmGray-500 w-14 shrink-0">To:</span>
          <span className="text-sm text-warmGray-700">{email.to}</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-xs font-medium text-warmGray-500 w-14 shrink-0">Subject:</span>
          <span className="text-sm font-medium text-warmGray-800">{email.subject}</span>
        </div>
        <div className="h-px bg-warmGray-200" />
        <div>
          <span className="text-xs font-medium text-warmGray-500 block mb-2">Body:</span>
          <div className="text-sm text-warmGray-700 whitespace-pre-wrap bg-white rounded-lg border border-warmGray-100 p-3 max-h-48 overflow-y-auto">
            {email.body}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-6">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="cozyGradient" icon={<Send size={14} />} onClick={onConfirm}>
          Add to Outbox
        </Button>
      </div>
    </Dialog>
  );
}

// Email templates
export function generateInterviewInviteEmail(data: {
  studentEmail: string;
  studentName: string;
  clubName: string;
  positionTitle: string;
}): { to: string; subject: string; body: string } {
  return {
    to: data.studentEmail,
    subject: `Interview Invitation - ${data.positionTitle} at ${data.clubName}`,
    body: `Hi ${data.studentName},

Congratulations! We are pleased to invite you for an interview for the ${data.positionTitle} position at ${data.clubName}.

Please log in to the portal to select your preferred interview time slot.

We look forward to meeting you!

Best regards,
${data.clubName} Recruitment Team`,
  };
}

export function generateInterviewScheduledEmail(data: {
  studentEmail: string;
  studentName: string;
  clubName: string;
  positionTitle: string;
  timeSlot: string;
}): { to: string; subject: string; body: string } {
  return {
    to: data.studentEmail,
    subject: `Interview Confirmed - ${data.positionTitle} at ${data.clubName}`,
    body: `Hi ${data.studentName},

Your interview for the ${data.positionTitle} position at ${data.clubName} has been confirmed.

Interview Time: ${data.timeSlot}

Please arrive 5 minutes early. If you need to reschedule, contact us through the portal.

Best regards,
${data.clubName} Recruitment Team`,
  };
}

export function generateAcceptedEmail(data: {
  studentEmail: string;
  studentName: string;
  clubName: string;
  positionTitle: string;
}): { to: string; subject: string; body: string } {
  return {
    to: data.studentEmail,
    subject: `Welcome to ${data.clubName}!`,
    body: `Hi ${data.studentName},

We are thrilled to offer you the ${data.positionTitle} position at ${data.clubName}!

You have been an outstanding candidate throughout the application process.

Next steps:
- You will receive an onboarding email shortly
- Join our team Slack/Discord channel
- Attend the welcome meeting

Welcome to the team!

Best regards,
${data.clubName} Recruitment Team`,
  };
}

export function generateRejectedEmail(data: {
  studentEmail: string;
  studentName: string;
  clubName: string;
  positionTitle: string;
}): { to: string; subject: string; body: string } {
  return {
    to: data.studentEmail,
    subject: `Application Update - ${data.positionTitle} at ${data.clubName}`,
    body: `Hi ${data.studentName},

Thank you for your interest in the ${data.positionTitle} position at ${data.clubName}.

After careful consideration, we have decided to move forward with other candidates whose experience more closely aligns with our current needs.

We encourage you to apply for future positions, and we wish you the best in your endeavors.

Best regards,
${data.clubName} Recruitment Team`,
  };
}
