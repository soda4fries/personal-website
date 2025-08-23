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
import { Switch } from '@/components/ui/switch';
import {
  type ContactFormTranslations,
  anonymousMessageSchema,
  type AnonymousMessageValues,
  type SendMessageApiResponse,
  type CheckReplyApiResponse,
} from '../type';
import { setGlobalZodErrorMap } from '@/i18n/zodErrorMap';
import type { LanguageCode } from '@/i18n/ui';
import {
  Loader2,
  Send,
  ClipboardCopy,
  Search,
  MessageSquare,
  Eye,
  EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { PublicMessagesDisplay } from './PublicMessagesDisplay';

interface ContactFormProps {
  lang: LanguageCode;
  formTranslations: ContactFormTranslations;
  baseUrl?: string;
}

export function ContactForm({
  lang,
  formTranslations,
  baseUrl = '',
}: ContactFormProps) {
  const [messageKey, setMessageKey] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState<string | null>(null);
  const [replyStatus, setReplyStatus] = useState<'success' | 'error' | null>(
    null
  );
  const [isSendingMessage, setIsSendingMessage] = useState<boolean>(false);
  const [isCheckingReply, setIsCheckingReply] = useState<boolean>(false);
  const [keyToCheck, setKeyToCheck] = useState<string>('');
  const [publicMessagesKey, setPublicMessagesKey] = useState<number>(0);
  const [showMessagesOnly, setShowMessagesOnly] = useState<boolean>(false);
  const [isConstrainedLayout, setIsConstrainedLayout] =
    useState<boolean>(false);

  useEffect(() => {
    setGlobalZodErrorMap(lang);
  }, [lang]);

  // Check for constrained layout and enable mobile-style toggles when needed
  useEffect(() => {
    const checkLayoutConstraints = () => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Same logic as PublicMessagesDisplay for detecting constrained space
      const isSmallLandscape = viewportWidth >= 768 && viewportHeight < 600;
      const hasEnoughSideSpace = viewportWidth >= 1200; // Need wider screen for side animations
      const hasEnoughVerticalSpace = viewportHeight > 500;

      const shouldUseConstrainedLayout =
        isSmallLandscape || !hasEnoughSideSpace || !hasEnoughVerticalSpace;
      
      // If transitioning from constrained to non-constrained layout while in messages mode,
      // automatically switch back to send mode to prevent getting stuck
      if (isConstrainedLayout && !shouldUseConstrainedLayout && showMessagesOnly) {
        setShowMessagesOnly(false);
      }
      
      setIsConstrainedLayout(shouldUseConstrainedLayout);
    };

    // Check on mount
    checkLayoutConstraints();

    // Check on resize
    window.addEventListener('resize', checkLayoutConstraints);
    return () => window.removeEventListener('resize', checkLayoutConstraints);
  }, [isConstrainedLayout, showMessagesOnly]);

  const form = useForm<AnonymousMessageValues>({
    resolver: zodResolver(anonymousMessageSchema),
    defaultValues: {
      message: '',
      public: true,
    },
    mode: 'onBlur',
  });

  const onSendMessage = async (values: AnonymousMessageValues) => {
    setIsSendingMessage(true);
    setReplyMessage(null); // Clear any previous reply
    setMessageKey(null); // Clear any previous key

    try {
      const response = await fetch(`${baseUrl}/api/contact/send-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: values.message,
          public: values.public,
        }),
      });

      const result: SendMessageApiResponse = await response.json();

      if (result.status === 'success') {
        setMessageKey(result.key);
        toast.success('Message sent successfully!');
        // If it was a public message, refresh the public messages display
        if (values.public) {
          setPublicMessagesKey((prev) => prev + 1);
        }
        form.reset();
      } else {
        // Handle API error
        let errorMessage =
          result.message || formTranslations.toastErrorUnexpected;
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
    setReplyStatus(null); // Clear previous status

    try {
      const response = await fetch(`${baseUrl}/api/contact/check-reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: keyToCheck,
        }),
      });

      const result: CheckReplyApiResponse = await response.json();

      if (result.status === 'success') {
        setReplyMessage(result.reply);
        setReplyStatus('success');
        toast.success(formTranslations.replyReceived);
      } else {
        setReplyMessage(result.message); // Display "No reply yet" or error message
        setReplyStatus('error');
        toast.info(result.message);
      }
    } catch (error) {
      console.error(
        'An unexpected error occurred while checking reply:',
        error
      );
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
      {/* Random Public Messages Background - only show on desktop when not in messages-only mode and layout is not constrained */}
      {!showMessagesOnly && !isConstrainedLayout && (
        <div
          className="fixed inset-0 pointer-events-none hidden md:block"
          style={{ zIndex: -10 }}
        >
          <PublicMessagesDisplay
            key={publicMessagesKey}
            baseUrl={baseUrl}
            popupInterval={5000}
            maxVisibleCards={2}
            containerHeight="100vh"
          />
        </div>
      )}

      {/* Messages-only view */}
      {showMessagesOnly && (
        <div className="relative z-10 space-y-6">
          <div
            className={`flex items-center justify-between ${isConstrainedLayout ? '' : 'md:hidden'}`}
          >
            <h2 className="text-lg font-semibold">Messages</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMessagesOnly(false)}
            >
              <EyeOff className="w-4 h-4 mr-1" />
              Send
            </Button>
          </div>
          <PublicMessagesDisplay
            key={publicMessagesKey}
            baseUrl={baseUrl}
            popupInterval={3000}
            maxVisibleCards={1}
            containerHeight="50vh"
          />
        </div>
      )}

      {/* Combined Contact Form - hide when showing messages only */}
      {!showMessagesOnly && (
        <div className="space-y-6">
          {/* Header with Toggle Button - Mobile and Constrained Desktop */}
          <div
            className={`flex items-center justify-between ${isConstrainedLayout ? '' : 'md:hidden'}`}
          >
            <h2 className="text-lg font-semibold">Send</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMessagesOnly(true)}
            >
              <Eye className="w-4 h-4 mr-1" />
              Messages
            </Button>
          </div>

          {/* Send Message Section */}
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSendMessage)}
              className="space-y-4 mb-6"
            >
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {formTranslations.anonymousMessageLabel}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={
                          formTranslations.anonymousMessagePlaceholder
                        }
                        rows={8}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-between items-center">
                <FormField
                  control={form.control}
                  name="public"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="text-sm font-normal">
                        {formTranslations.publicMessageLabel}
                      </FormLabel>
                    </FormItem>
                  )}
                />
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
            <div className="mb-6 p-4 bg-muted rounded-md flex flex-col items-center text-center animate-in fade-in duration-500 max-w-full overflow-hidden">
              <p className="text-lg font-semibold mb-2">
                {formTranslations.yourKeyIs}
              </p>
              <div className="flex items-center space-x-2 max-w-full">
                <span className="font-mono text-primary text-xl select-all break-all min-w-0 flex-1">
                  {messageKey}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={copyKeyToClipboard}
                  aria-label={formTranslations.copyKeyButtonLabel}
                  className="flex-shrink-0"
                >
                  <ClipboardCopy className="size-5" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {formTranslations.keyCopiedToast}
              </p>
            </div>
          )}

          {/* Check Reply Section */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Search className="size-5" />
              Check for replies
            </h3>
            <div className="flex space-x-2 mb-4">
              <Input
                placeholder={formTranslations.enterKeyPlaceholder}
                value={keyToCheck}
                onChange={(e) => setKeyToCheck(e.target.value)}
                disabled={isCheckingReply}
                className="h-10"
              />
              <Button
                onClick={onCheckReply}
                disabled={isCheckingReply}
                size="lg"
                className="w-24"
              >
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
              <div
                className={`p-4 rounded-md animate-in fade-in duration-500 ${
                  replyStatus === 'success' ? 'bg-muted' : 'bg-secondary'
                }`}
              >
                <p className="font-semibold">
                  {replyStatus === 'success'
                    ? formTranslations.replyReceived
                    : 'Status'}
                </p>
                <p className="mt-2 whitespace-pre-wrap">{replyMessage}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}