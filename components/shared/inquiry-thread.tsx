'use client'

import { useState, type KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { sendInquiryMessage } from '@/app/inquiries/actions'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { formatDateTime } from '@/lib/utils/format'
import type { InquiryMessage } from '@/types/database.types'

type ThreadMessage = InquiryMessage & { sender: { full_name: string | null } }

interface InquiryThreadProps {
  inquiryId: string
  currentUserId: string
  messages: ThreadMessage[]
  /** Display name of the other party in the conversation (customer or artist). */
  otherPartyName: string
}

/**
 * Shared messaging thread for a custom order inquiry. Used by both the
 * artist-facing inquiry detail page and (later) the customer-facing one —
 * it only needs the current viewer's id and the initial messages, it has no
 * opinion on which side of the marketplace is rendering it.
 *
 * No realtime subscription: sending a message calls `router.refresh()` so
 * the server-rendered message list (the source of truth) re-fetches. Simple
 * and sufficient for this MVP.
 */
export function InquiryThread({
  inquiryId,
  currentUserId,
  messages,
  otherPartyName,
}: InquiryThreadProps) {
  const router = useRouter()
  const [body, setBody] = useState('')
  const [isSending, setIsSending] = useState(false)

  async function handleSend() {
    const trimmed = body.trim()
    if (!trimmed || isSending) return

    setIsSending(true)
    try {
      const result = await sendInquiryMessage(inquiryId, trimmed)
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      setBody('')
      router.refresh()
    } catch {
      toast.error('Something went wrong sending your message. Please try again.')
    } finally {
      setIsSending(false)
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void handleSend()
    }
  }

  return (
    <div className="flex flex-col rounded-xl border bg-card">
      <div className="border-b px-4 py-3">
        <p className="text-sm font-semibold">Conversation with {otherPartyName}</p>
      </div>

      <div className="flex max-h-[28rem] min-h-[12rem] flex-col gap-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <p className="m-auto text-sm text-muted-foreground">
            No messages yet. Say hello to start the conversation.
          </p>
        ) : (
          messages.map((message) => {
            const isOwn = message.sender_id === currentUserId

            return (
              <div
                key={message.id}
                className={cn('flex flex-col', isOwn ? 'items-end' : 'items-start')}
              >
                <div
                  className={cn(
                    'max-w-[80%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm',
                    isOwn
                      ? 'bg-primary/10 text-foreground'
                      : 'bg-muted text-foreground'
                  )}
                >
                  {message.body}
                </div>
                <span className="mt-1 text-xs text-muted-foreground">
                  {isOwn ? 'You' : message.sender.full_name ?? otherPartyName} ·{' '}
                  {formatDateTime(message.created_at)}
                </span>
              </div>
            )
          })
        )}
      </div>

      <div className="flex flex-col gap-2 border-t p-4">
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write a message…"
          disabled={isSending}
          rows={3}
        />
        <Button
          onClick={() => void handleSend()}
          disabled={isSending || body.trim().length === 0}
          className="self-end"
        >
          {isSending ? 'Sending…' : 'Send'}
        </Button>
      </div>
    </div>
  )
}
