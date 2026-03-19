import { useState, useEffect, type FormEvent } from 'react'
import './App.css'

interface Message {
  direction: 'outbound' | 'inbound'
  to: string
  from: string
  body: string
  timestamp: string
  sid?: string
}

function getStored(key: string, fallback = '') {
  return localStorage.getItem(key) ?? fallback
}

function getMessages(): Message[] {
  try {
    return JSON.parse(localStorage.getItem('twilio_messages') ?? '[]')
  } catch {
    return []
  }
}

function saveMessages(msgs: Message[]) {
  localStorage.setItem('twilio_messages', JSON.stringify(msgs))
}

function App() {
  const [accountSid, setAccountSid] = useState(() => getStored('twilio_account_sid'))
  const [authToken, setAuthToken] = useState(() => getStored('twilio_auth_token'))
  const [from, setFrom] = useState(() => getStored('twilio_from'))
  const [to, setTo] = useState(() => getStored('twilio_to'))
  const [body, setBody] = useState('')
  const [messages, setMessages] = useState<Message[]>(getMessages)
  const [status, setStatus] = useState<{ type: 'error' | 'success'; text: string } | null>(null)
  const [loading, setLoading] = useState(false)

  // Subscribe to incoming messages via SSE
  useEffect(() => {
    const es = new EventSource('/incoming-stream')
    es.onmessage = (event) => {
      const incoming: Message = { ...JSON.parse(event.data), direction: 'inbound' }
      setMessages((prev) => {
        const updated = [incoming, ...prev]
        saveMessages(updated)
        return updated
      })
    }
    return () => es.close()
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setStatus(null)
    setLoading(true)

    try {
      const res = await fetch(`/twilio-api/2010-04-01/Accounts/${accountSid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: to, From: from, Body: body }).toString(),
      })

      const data = await res.json()

      if (!res.ok) {
        setStatus({ type: 'error', text: data.message || `Error ${res.status}` })
        return
      }

      // Persist credentials
      localStorage.setItem('twilio_account_sid', accountSid)
      localStorage.setItem('twilio_auth_token', authToken)
      localStorage.setItem('twilio_from', from)
      localStorage.setItem('twilio_to', to)

      // Add message to history
      const newMessage: Message = {
        direction: 'outbound',
        to,
        from,
        body,
        timestamp: new Date().toISOString(),
        sid: data.sid,
      }
      setMessages((prev) => {
        const updated = [newMessage, ...prev]
        saveMessages(updated)
        return updated
      })

      setBody('')
      setStatus({ type: 'success', text: 'Message sent!' })
    } catch (err) {
      setStatus({ type: 'error', text: err instanceof Error ? err.message : 'Request failed' })
    } finally {
      setLoading(false)
    }
  }

  const clearHistory = () => {
    setMessages([])
    localStorage.removeItem('twilio_messages')
  }

  return (
    <div className="layout">
      <div className="form-panel">
        <h1>Twilio SMS</h1>
        <form onSubmit={handleSubmit}>
          <label>
            Account SID
            <input
              type="text"
              value={accountSid}
              onChange={(e) => setAccountSid(e.target.value)}
              placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              required
            />
          </label>
          <label>
            Auth Token
            <input
              type="text"
              value={authToken}
              onChange={(e) => setAuthToken(e.target.value)}
              placeholder="Your auth token"
              required
            />
          </label>
          <label>
            From
            <input
              type="text"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              placeholder="+1234567890"
              required
            />
          </label>
          <label>
            To
            <input
              type="text"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="+1234567890"
              required
            />
          </label>
          <label>
            Message
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Your message..."
              rows={4}
              required
            />
          </label>
          <button type="submit" disabled={loading}>
            {loading ? 'Sending...' : 'Send Message'}
          </button>
          {status && (
            <p className={`status ${status.type}`}>{status.text}</p>
          )}
        </form>
      </div>

      <div className="messages-panel">
        <div className="messages-header">
          <h2>Messages</h2>
          {messages.length > 0 && (
            <button className="clear-btn" onClick={clearHistory}>Clear</button>
          )}
        </div>
        {messages.length === 0 ? (
          <p className="empty">No messages yet.</p>
        ) : (
          <div className="messages-list">
            {messages.map((msg, i) => (
              <div key={i} className={`message-card ${msg.direction}`}>
                <div className="message-meta">
                  <span className="message-direction">
                    {msg.direction === 'inbound' ? `From: ${msg.from}` : `To: ${msg.to}`}
                  </span>
                  <span className="message-time">
                    {new Date(msg.timestamp).toLocaleString()}
                  </span>
                </div>
                <p className="message-body">{msg.body}</p>
                {msg.sid && <span className="message-sid">SID: {msg.sid}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default App
