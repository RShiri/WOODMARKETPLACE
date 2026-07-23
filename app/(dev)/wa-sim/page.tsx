'use client'

import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLocale } from '@/lib/i18n/locale-context'
import { cn } from '@/lib/utils'
import type { WaMessage } from '@/types/database.types'

import { fetchSimulatorHistory, sendSimulatorMessage } from './actions'

const PHONE_STORAGE_KEY = 'brickcase_wa_sim_phone'
const DEFAULT_PHONE = '+15550001234'

/**
 * Dev-only WhatsApp bot simulator. Exercises the exact same
 * lib/bot/engine.ts state machine a real WhatsApp webhook would, so this
 * doubles as the WhatsApp bot's demo surface — no Meta/Twilio account
 * needed. Not linked from the main nav; visit /wa-sim directly.
 *
 * The bot detects and replies in whichever language you write in (English
 * or Hebrew — see lib/bot/parser.ts#detectLocale), independent of this
 * page's own UI language. The message list is pinned dir="ltr" so bubble
 * alignment (your messages on the right) matches real WhatsApp regardless
 * of UI language; each bubble's text uses dir="auto" so Hebrew replies
 * still shape right-to-left inside it.
 */
export default function WhatsAppSimulatorPage() {
  const { dict } = useLocale()
  const [phone, setPhone] = useState(DEFAULT_PHONE)
  const [messages, setMessages] = useState<WaMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const stored = window.localStorage.getItem(PHONE_STORAGE_KEY)
    if (stored) setPhone(stored)
  }, [])

  useEffect(() => {
    window.localStorage.setItem(PHONE_STORAGE_KEY, phone)
  }, [phone])

  async function refreshHistory(currentPhone: string) {
    setLoadingHistory(true)
    try {
      const history = await fetchSimulatorHistory(currentPhone)
      setMessages(history)
    } finally {
      setLoadingHistory(false)
    }
  }

  useEffect(() => {
    void refreshHistory(phone)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    const text = input.trim()
    if (!text || sending) return
    setSending(true)
    setInput('')
    try {
      await sendSimulatorMessage(phone, text)
      await refreshHistory(phone)
    } finally {
      setSending(false)
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">{dict.waSim.title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{dict.waSim.subtitle}</p>

      <div className="mt-6 flex items-end gap-3">
        <div className="flex-1">
          <Label htmlFor="sim-phone" className="text-xs text-muted-foreground">
            {dict.waSim.phoneLabel}
          </Label>
          <Input
            id="sim-phone"
            dir="ltr"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onBlur={() => void refreshHistory(phone)}
          />
        </div>
        <Button type="button" variant="outline" onClick={() => void refreshHistory(phone)}>
          {dict.waSim.load}
        </Button>
      </div>

      <Card className="mt-4">
        <CardContent dir="ltr" className="flex h-[28rem] flex-col gap-3 overflow-y-auto p-4">
          {loadingHistory && <p className="text-sm text-muted-foreground">{dict.waSim.loading}</p>}
          {!loadingHistory && messages.length === 0 && (
            <p className="text-sm text-muted-foreground">{dict.waSim.empty}</p>
          )}
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn('flex', message.direction === 'in' ? 'justify-end' : 'justify-start')}
            >
              <div
                dir="auto"
                className={cn(
                  'max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm',
                  message.direction === 'in'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                )}
              >
                {message.body}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </CardContent>
      </Card>

      <div className="mt-4 flex gap-2">
        <Input
          dir="auto"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              void handleSend()
            }
          }}
          placeholder={dict.waSim.placeholder}
          disabled={sending}
        />
        <Button type="button" onClick={() => void handleSend()} disabled={sending || !input.trim()}>
          {sending ? dict.waSim.sending : dict.waSim.send}
        </Button>
      </div>
    </main>
  )
}
