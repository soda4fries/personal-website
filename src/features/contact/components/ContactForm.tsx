import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  type ContactFormTranslations,
anonymousMessageSchema,
  type AnonymousMessageValues,
  type SendMessageApiResponse,
  type CheckReplyApiResponse,
} from '../type';
import { setGlobalZodErrorMap } from '@/i18n/zodErrorMap';
import type { LanguageCode } from '@/i18n/ui';
import { Loader2, Send, ClipboardCopy, Search } from 'lucide-react';
import { toast } from 'sonner';

interface ContactFormProps {
  lang: LanguageCode;
  formTranslations: ContactFormTranslations;
}

export function ContactForm({
  lang,
  formTranslations,
}: ContactFormProps) {
  const [messageKey, setMessageKey] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState<string | null>(null);
  const [isSendingMessage, setIsSendingMessage] = useState<boolean>(false);
  const [isCheckingReply, setIsCheckingReply] = useState<boolean>(false);
  const [keyToCheck, setKeyToCheck] = useState<string>('');

  useEffect(() => {
    setGlobalZodErrorMap(lang);
  }, [lang]);

  const form = useForm<AnonymousMessageValues>({
    resolver: zodResolver(anonymousMessageSchema),
    defaultValues: {
      message: '',
    },
    mode: 'onBlur',
  });

  const generateRandomKey = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  const onSendMessage = async (values: AnonymousMessageValues) => {
    setIsSendingMessage(true);
    setReplyMessage(null); // Clear any previous reply
    setMessageKey(null); // Clear any previous key

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500)); // Simulate network delay

    try {
      // In a real application, you would send `values.message` to your backend
      // and receive a unique key.
      const simulatedKey = generateRandomKey();
      const result: SendMessageApiResponse = {
        status: 'success',
        message: formTranslations.sendAnonymousButtonLabel, // Reusing for toast
        key: simulatedKey,
      };

      if (result.status === 'success') {
        setMessageKey(result.key);
        toast.success(formTranslations.sendAnonymousButtonLabel);
        form.reset();
      } else {
        // Handle simulated error
        let errorMessage = result.message || formTranslations.toastErrorUnexpected;
        if (result.errors) {
          const errorMessages = Object.values(result.errors).flat().join('\n');
          errorMessage += `\n\n${formTranslations.toastErrorDetails}\n${errorMessages}`;
        }
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('An unexpected error occurred:', error);
      toast.error(formTranslations.toastErrorUnexpected);
    } finally {
      setIsSendingMessage(false);
    }
  };

  const onCheckReply = async () => {
    if (!keyToCheck) {
      toast.error(formTranslations.invalidKeyToast);
      return;
    }

    setIsCheckingReply(true);
    setReplyMessage(null); // Clear previous reply

    // Simulate API call to check for reply
    await new Promise((resolve) => setTimeout(resolve, 1500)); // Simulate network delay

    try {
      // In a real application, you would send `keyToCheck` to your backend
      // and receive a reply or a "no reply" status.
      let simulatedReply: CheckReplyApiResponse;
      if (keyToCheck === 'testkey123') { // Example: a hardcoded key for testing replies
        simulatedReply = { status: 'success', reply: 'This is a test reply for your message!' };
      } else if (keyToCheck === 'anotherreply') {
        simulatedReply = { status: 'success', reply: 'Here is another reply for you.' };
      }
      else {
        simulatedReply = { status: 'error', message: formTranslations.noReplyYet };
      }

      if (simulatedReply.status === 'success') {
        setReplyMessage(simulatedReply.reply);
        toast.success(formTranslations.replyReceived);
      } else {
        setReplyMessage(simulatedReply.message); // Display "No reply yet" or error message
        toast.info(simulatedReply.message);
      }
    } catch (error) {
      console.error('An unexpected error occurred while checking reply:', error);
      toast.error(formTranslations.toastErrorUnexpected);
    } finally {
      setIsCheckingReply(false);
    }
  };

  const copyKeyToClipboard = async () => {
    if (!messageKey) return;

    try {
      // Attempt to use the modern Clipboard API
      await navigator.clipboard.writeText(messageKey);
      toast.success(formTranslations.keyCopiedToast);
    } catch (err) {
      console.error('Failed to copy using Clipboard API:', err);
      // Fallback to document.execCommand if modern API fails
      try {
        const textarea = document.createElement('textarea');
        textarea.value = messageKey;
        textarea.style.position = 'fixed'; // Avoid scrolling to bottom
        textarea.style.left = '-9999px'; // Move off-screen
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
        toast.success(formTranslations.keyCopiedToast);
      } catch (fallbackErr) {
        console.error('Failed to copy using fallback:', fallbackErr);
        toast.error('Failed to copy key. Please try again or copy manually.');
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* Send Anonymous Message Section */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSendMessage)} className="space-y-4">
          <FormField
            control={form.control}
            name="message"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{formTranslations.anonymousMessageLabel}</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={formTranslations.anonymousMessagePlaceholder}
                    rows={10}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              size="lg"
              className="w-24"
              disabled={isSendingMessage}
            >
            {isSendingMessage ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                <Send className="size-4" />
                {formTranslations.sendAnonymousButtonLabel}
              </>
            )}
          </Button>
          </div>
        </form>
      </Form>

      {messageKey && (
        <div className="mt-8 p-4 bg-muted rounded-md flex flex-col items-center text-center animate-in fade-in duration-500">
          <p className="text-lg font-semibold mb-2">{formTranslations.yourKeyIs}</p>
          <div className="flex items-center space-x-2">
            <span className="font-mono text-primary text-xl select-all">{messageKey}</span>
            <Button variant="ghost" size="icon" onClick={copyKeyToClipboard} aria-label={formTranslations.copyKeyButtonLabel}>
              <ClipboardCopy className="size-5" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {formTranslations.keyCopiedToast}
          </p>
        </div>
      )}

      {/* Check Reply Section */}
      <div className="mt-8 pt-8 border-t border-border/50 space-y-4">
        <h3 className="text-xl font-semibold text-center">{formTranslations.enterKeyLabel}</h3>
        <div className="flex space-x-2">
          <Input
            placeholder={formTranslations.enterKeyPlaceholder}
            value={keyToCheck}
            onChange={(e) => setKeyToCheck(e.target.value)}
            disabled={isCheckingReply}
            className="h-10"
          />
          <Button onClick={onCheckReply} disabled={isCheckingReply} size="lg" className="w-24">
            {isCheckingReply ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                <Search className="size-4" />
                {formTranslations.checkReplyButtonLabel}
              </>
            )}
          </Button>
        </div>

        {replyMessage && (
          <div className="p-4 bg-secondary rounded-md animate-in fade-in duration-500">
            <p className="font-semibold">{formTranslations.replyReceived}</p>
            <p className="mt-2 whitespace-pre-wrap">{replyMessage}</p>
          </div>
        )}
      </div>
    </div>
  );
}