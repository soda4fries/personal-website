import { z } from 'zod';

export type ContactFormTranslations = {
  anonymousMessageLabel: string;
  anonymousMessagePlaceholder: string;
  publicMessageLabel: string;
  publicMessageHelperText: string;
  sendAnonymousButtonLabel: string;
  yourKeyIs: string;
  copyKeyButtonLabel: string;
  keyCopiedToast: string;
  enterKeyLabel: string;
  enterKeyPlaceholder: string;
  checkReplyButtonLabel: string;
  noReplyYet: string;
  replyReceived: string;
  invalidKeyToast: string;
  checkingReplyToast: string;
  toastErrorUnexpected: string;
  toastErrorDetails: string;
  toastErrorValidationFailed: string;
};

export const anonymousMessageSchema = z.object({
  message: z.string().min(10).max(500),
  public: z.boolean(),
});

export type AnonymousMessageValues = z.infer<typeof anonymousMessageSchema>;

export type SendMessageApiResponse =
  | {
      status: 'success';
      message: string;
      key: string;
    }
  | {
      status: 'error';
      message: string;
      errors?: Record<string, Array<string> | undefined>;
      error?: string;
    };

export type CheckReplyApiResponse =
  | {
      status: 'success';
      reply: string;
    }
  | {
      status: 'error';
      message: string;
    };

export type PublicMessage = {
  message: string;
  timestamp: string;
  reply: string | null;
  reply_timestamp: string | null;
  replied: boolean;
};

export type PublicMessagesApiResponse =
  | {
      status: 'success';
      messages: PublicMessage[];
    }
  | {
      status: 'error';
      message: string;
    };