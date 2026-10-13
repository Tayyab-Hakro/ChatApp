import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { io } from 'socket.io-client'
import {
  ArrowLeft, ArrowUpRight, Check, CheckCheck, ChevronLeft, CircleHelp,
  Info, LogOut, MessageCircle, MoreHorizontal, Paperclip, Pencil, Plus, Search, Trash2,
  Send, Settings, Smile, Sparkles, Sun, Users, X,
} from 'lucide-react'
import { ApiError, downloadFile, getAccessToken, request, saveAccessToken, SOCKET_URL } from './api'

function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?'
}

function Avatar({ src, name, online, size = 'normal', group = false }) {
  return (
    <span className={`avatar avatar-${size}${group ? ' avatar-group' : ''}${src ? '' : ' avatar-fallback'}`}>
      {src ? <img src={src} alt="" /> : <span aria-hidden="true">{initials(name)}</span>}
      {online && <i className="presence-dot" aria-label="Online" />}
    </span>
  )
}

function Brand() {
  return (
    <span className="brand">
      <span className="brand-icon"><MessageCircle size={19} strokeWidth={2.6} /></span>
      <span>gather<span className="brand-period">.</span></span>
    </span>
  )
}

function errorMessage(error) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

function AuthPage({ mode, onAuthenticated }) {
  const navigate = useNavigate()
  const isSignup = mode === 'signup'
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setError('')
    if (mode === 'reset') {
      setError('Password reset is not available yet. Please contact your administrator.')
      return
    }
    const form = new FormData(event.currentTarget)
    const body = {
      email: form.get('email'),
      password: form.get('password')
    }
    if (isSignup) body.name = form.get('name')

    setBusy(true)
    try {
      const session = await request(`/auth/${isSignup ? 'register' : 'login'}`, {
        method: 'POST',
        body: JSON.stringify(body)
      }, false)
      saveAccessToken(session.accessToken)
      onAuthenticated(session.user)
      navigate('/', { replace: true })
    } catch (submitError) {
      setError(errorMessage(submitError))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-visual">
        <div className="auth-art-shape art-one" />
        <div className="auth-art-shape art-two" />
        <div className="auth-art-shape art-three" />
        <div className="auth-visual-content">
          <Brand />
          <div className="auth-quote">
            <span className="eyebrow light-eyebrow"><Sparkles size={14} /> A little more human</span>
            <h1>Good conversations<br />make good days.</h1>
            <p>A calmer corner of the internet, made for the people who make your life.</p>
          </div>
          <div className="auth-people"><span>Made for meaningful moments</span></div>
        </div>
      </section>
      <section className="auth-form-side">
        <Link to="/" className="mobile-brand"><Brand /></Link>
        <form className="auth-form" onSubmit={submit}>
          <span className="eyebrow"><span className="eyebrow-dot" /> YOUR PEOPLE ARE HERE</span>
          <h2>{mode === 'reset' ? 'Reset your password' : isSignup ? 'Make yourself at home.' : 'Welcome back.'}</h2>
          <p className="auth-subtitle">
            {mode === 'reset' ? 'Get help recovering access to your account.' : isSignup ? 'Create an account and find your people.' : 'Pick up right where your conversations left off.'}
          </p>
          {isSignup && <label>Your name<input name="name" autoComplete="name" placeholder="What should we call you?" minLength="2" maxLength="80" required /></label>}
          <label>Email address<input name="email" type="email" autoComplete="email" placeholder="you@example.com" required /></label>
          {mode !== 'reset' && (
            <label>Password
              <span className="password-field">
                <input name="password" type={showPassword ? 'text' : 'password'} autoComplete={isSignup ? 'new-password' : 'current-password'} placeholder={isSignup ? 'At least 10 characters' : 'Your password'} minLength={isSignup ? 10 : 1} maxLength="128" required />
                <button type="button" className="text-button" onClick={() => setShowPassword((value) => !value)}>{showPassword ? 'Hide' : 'Show'}</button>
              </span>
            </label>
          )}
          {!isSignup && mode === 'login' && <div className="form-between"><span /><Link to="/forgot-password">Forgot password?</Link></div>}
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary-button auth-submit" type="submit" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'reset' ? 'Reset password' : isSignup ? 'Create my account' : 'Sign in'}<ArrowUpRight size={17} />
          </button>
          <p className="auth-switch">
            {isSignup ? 'Already have an account?' : 'New around here?'}{' '}
            <Link to={isSignup ? '/login' : '/signup'}>{isSignup ? 'Sign in' : 'Create an account'}</Link>
          </p>
          <p className="auth-disclaimer">Your account and conversations are securely connected to the Gather service.</p>
        </form>
        <div className="auth-footer"><span>© 2026 Gather</span><a href="mailto:hello@gather.example">Need a hand?</a></div>
      </section>
    </main>
  )
}

function NavRail({ active, onTheme, onLogout, user }) {
  return (
    <nav className="nav-rail" aria-label="Main navigation">
      <Link to="/" aria-label="Gather messages"><Brand /></Link>
      <div className="rail-links">
        <Link className={`rail-button${active === 'messages' ? ' active' : ''}`} to="/" aria-label="Messages" title="Messages"><MessageCircle size={20} /></Link>
        <Link className={`rail-button${active === 'people' ? ' active' : ''}`} to="/people" aria-label="People" title="People"><Users size={20} /></Link>
      </div>
      <div className="rail-bottom">
        {onTheme && <button className="rail-button" onClick={onTheme} aria-label="Toggle theme" title="Toggle theme"><Sun size={20} /></button>}
        <Link className={`rail-button${active === 'settings' ? ' active' : ''}`} to="/settings" aria-label="Settings" title="Settings"><Settings size={20} /></Link>
        <button className="rail-profile" onClick={onLogout} title="Sign out" aria-label="Sign out"><Avatar src={user?.avatarUrl} name={user?.name} size="small" /></button>
      </div>
    </nav>
  )
}

function relativeTime(date) {
  if (!date) return ''
  const elapsed = Math.max(0, Date.now() - new Date(date).getTime())
  const minutes = Math.floor(elapsed / 60000)
  if (minutes < 1) return 'now'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

function mapConversation(item, userId) {
  const participants = item.participants || []
  const members = participants.map((participant) => participant.user).filter(Boolean)
  const other = members.find((person) => person._id !== userId) || members[0]
  const membership = participants.find((participant) => participant.user?._id === userId)
  const group = item.type === 'group'
  const personName = group ? item.title : (other?.name || 'Conversation')
  const lastMessage = item.lastMessage
  const lastText = lastMessage?.text || lastMessage?.attachments?.[0]?.name || ''
  const senderName = lastMessage?.sender?._id === userId ? 'You' : lastMessage?.sender?.name
  return {
    id: item._id,
    title: personName,
    handle: group ? `${members.length} members` : (other?.email || ''),
    avatar: group ? '' : other?.avatarUrl,
    personId: group ? null : other?._id,
    online: false,
    unread: lastMessage?.sender?._id !== userId && lastMessage?.createdAt
      && (!membership?.lastReadAt || new Date(lastMessage.createdAt) > new Date(membership.lastReadAt)) ? 1 : 0,
    time: relativeTime(lastMessage?.createdAt || item.updatedAt),
    preview: lastText ? (group && senderName ? `${senderName}: ${lastText}` : lastText) : 'Start a conversation',
    type: group ? 'group' : 'person',
    members
  }
}

function mapMessage(message, userId) {
  const sender = message.sender || {}
  return {
    id: message._id,
    from: sender._id === userId ? 'me' : 'them',
    author: sender.name,
    senderId: sender._id,
    text: message.deletedAt ? 'This message was deleted' : message.text,
    attachments: message.deletedAt ? [] : (message.attachments || []),
    time: message.createdAt ? new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(message.createdAt)) : '',
    createdAt: message.createdAt,
    deleted: Boolean(message.deletedAt)
  }
}

function ConversationRow({ conversation, selected, onClick }) {
  return (
    <button className={`conversation-row${selected ? ' selected' : ''}`} onClick={onClick}>
      <Avatar src={conversation.avatar} name={conversation.title} online={conversation.online && conversation.type === 'person'} group={conversation.type === 'group'} />
      <span className="conversation-copy">
        <span className="conversation-top"><strong>{conversation.title}</strong><time>{conversation.time}</time></span>
        <span className="conversation-bottom"><span>{conversation.preview}</span>{conversation.unread > 0 && <i className="unread-count" aria-label="Unread messages">•</i>}</span>
      </span>
    </button>
  )
}

function Sidebar({ conversations, selectedId, onSelect, onNew, filter, setFilter, query, setQuery, onLogout, user, loading, error }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-heading">
        <div><span className="eyebrow"><span className="eyebrow-dot" /> YOUR SPACE</span><h1>Messages <span className="heading-count">{conversations.length}</span></h1></div>
        <button className="icon-button new-chat-button" onClick={onNew} aria-label="Start a new conversation" title="New conversation"><Plus size={19} /></button>
      </div>
      <label className="search-box">
        <Search size={16} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search conversations" aria-label="Search conversations" />
        {query && <button onClick={() => setQuery('')} type="button" aria-label="Clear search"><X size={14} /></button>}
      </label>
      <div className="filter-tabs" role="tablist" aria-label="Conversation filters">
        {['All', 'Unread', 'Groups'].map((item) => <button key={item} role="tab" aria-selected={filter === item} className={filter === item ? 'current' : ''} onClick={() => setFilter(item)}>{item}</button>)}
      </div>
      <div className="list-label"><span>RECENT</span></div>
      <div className="conversation-list">
        {loading && <div className="list-empty">Loading conversations…</div>}
        {!loading && error && <div className="list-empty"><span>{error}</span><small>Check that the backend is running.</small></div>}
        {!loading && !error && conversations.length ? conversations.map((conversation) => (
          <ConversationRow key={conversation.id} conversation={conversation} selected={selectedId === conversation.id} onClick={() => onSelect(conversation.id)} />
        )) : !loading && !error && <div className="list-empty"><Search size={20} /><span>No conversations yet</span><small>Find someone to start a chat.</small></div>}
      </div>
      <div className="sidebar-footer">
        <Avatar src={user?.avatarUrl} name={user?.name} size="small" />
        <div className="self-copy"><strong>{user?.name}</strong><span>{user?.email}</span></div>
        <button className="icon-button subtle-button" onClick={onLogout} title="Sign out" aria-label="Sign out"><LogOut size={17} /></button>
      </div>
    </aside>
  )
}

function EmptyChat({ onNew }) {
  return (
    <section className="empty-chat">
      <div className="empty-illustration"><div className="empty-orbit orbit-one" /><div className="empty-orbit orbit-two" /><div className="empty-chat-icon"><MessageCircle size={37} strokeWidth={1.65} /></div><span className="sparkle sparkle-a">✳</span><span className="sparkle sparkle-b">✦</span></div>
      <span className="eyebrow"><span className="eyebrow-dot" /> A SPACE FOR YOUR PEOPLE</span>
      <h2>Good things start<br />with a hello.</h2>
      <p>Choose a conversation from the side, or start a new one. Your favorite people are just a message away.</p>
      <button className="primary-button" onClick={onNew}><Plus size={17} /> Start a conversation</button>
    </section>
  )
}

function ConversationDetails({ conversation, onClose }) {
  return (
    <aside className="details-panel">
      <div className="details-heading"><strong>Details</strong><button className="icon-button" onClick={onClose} aria-label="Close details"><X size={18} /></button></div>
      <div className="details-person">
        <Avatar src={conversation.avatar} name={conversation.title} online={conversation.online} size="large" group={conversation.type === 'group'} />
        <h3>{conversation.title}</h3><p>{conversation.handle}</p>
        {conversation.online && <span className="online-label"><i /> Active now</span>}
      </div>
      <div className="details-divider" />
      <div className="details-section"><span className="details-label">MEMBERS</span><p>{conversation.members?.map((member) => member.name).join(', ')}</p></div>
      <div className="details-divider" />
      <div className="details-bottom"><span className="detail-action muted"><CircleHelp size={17} /><span>Messages are stored securely.</span></span></div>
    </aside>
  )
}

function AttachmentLink({ attachment }) {
  const [error, setError] = useState('')
  async function openFile() {
    try {
      const blob = await downloadFile(attachment.url)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = attachment.name
      link.click()
      URL.revokeObjectURL(url)
      setError('')
    } catch (downloadError) {
      setError(errorMessage(downloadError))
    }
  }
  return (
    <span className="message-attachment">
      <button type="button" onClick={openFile}><Paperclip size={13} />{attachment.name}</button>
      {error && <small role="alert">{error}</small>}
    </span>
  )
}

function ChatView({ conversation, messages, onBack, onToggleDetails, onSend, onTyping, onEditMessage, onDeleteMessage, busy, user }) {
  const [draft, setDraft] = useState('')
  const [showEmoji, setShowEmoji] = useState(false)
  const [file, setFile] = useState(null)
  const [notice, setNotice] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)
  const fileRef = useRef(null)
  const typingTimer = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, conversation.id])

  async function sendMessage(event) {
    event.preventDefault()
    const text = draft.trim()
    if ((!text && !file) || sending) return
    setNotice('')
    setSending(true)
    try {
      let attachments = []
      if (file) {
        const form = new FormData()
        form.append('file', file)
        const uploaded = await request('/uploads', { method: 'POST', body: form })
        attachments = [uploaded.file]
      }
      await onSend({ text, attachments })
      setDraft('')
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
      setShowEmoji(false)
    } catch (sendError) {
      setNotice(errorMessage(sendError))
    } finally {
      setSending(false)
      onTyping(false)
    }
  }

  function updateDraft(value) {
    setDraft(value)
    if (value.trim()) {
      onTyping(true)
      window.clearTimeout(typingTimer.current)
      typingTimer.current = window.setTimeout(() => onTyping(false), 1200)
    } else {
      onTyping(false)
    }
  }

  function chooseFile(event) {
    const nextFile = event.target.files?.[0]
    if (!nextFile) return
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'text/plain']
    if (!allowed.includes(nextFile.type)) {
      setNotice('This file type is not supported. Choose an image, PDF, or text file.')
      event.target.value = ''
      return
    }
    if (nextFile.size > 5 * 1024 * 1024) {
      setNotice('Files must be 5 MB or smaller.')
      event.target.value = ''
      return
    }
    setNotice('')
    setFile(nextFile)
  }

  async function editMessage(message) {
    const text = window.prompt('Edit your message', message.text)
    if (text === null || text.trim() === '' || text.trim() === message.text) return
    try {
      await onEditMessage(message.id, text.trim())
    } catch (editError) {
      setNotice(errorMessage(editError))
    }
  }

  async function deleteMessage(message) {
    if (!window.confirm('Delete this message?')) return
    try {
      await onDeleteMessage(message.id)
    } catch (deleteError) {
      setNotice(errorMessage(deleteError))
    }
  }

  useEffect(() => () => window.clearTimeout(typingTimer.current), [])

  return (
    <section className="chat-view">
      <header className="chat-header">
        <button className="icon-button mobile-back" onClick={onBack} aria-label="Back to conversations"><ChevronLeft size={21} /></button>
        <Avatar src={conversation.avatar} name={conversation.title} online={conversation.online} group={conversation.type === 'group'} />
        <div className="chat-header-copy"><h2>{conversation.title}</h2><span>{conversation.type === 'group' ? conversation.handle : conversation.online ? <><i className="tiny-online" /> Active now</> : conversation.handle}</span></div>
        <div className="header-actions"><button className="icon-button" onClick={onToggleDetails} aria-label="Conversation details"><Info size={18} /></button><button className="icon-button header-more" aria-label="More options"><MoreHorizontal size={19} /></button></div>
      </header>
      <div className="chat-scroll">
        <div className="chat-day"><span />CONVERSATION<span /></div>
        <div className="messages">
          {!messages.length && <div className="chat-empty-hint">This is the beginning of your conversation. Say hello!</div>}
          {messages.map((message, index) => {
            const previous = messages[index - 1]
            const grouped = previous && previous.from === message.from && message.createdAt && previous.createdAt
              && new Date(message.createdAt).getTime() - new Date(previous.createdAt).getTime() < 5 * 60 * 1000
            return (
              <div className={`message-row ${message.from === 'me' ? 'mine' : 'theirs'}${grouped ? ' grouped' : ''}`} key={message.id}>
                {message.from !== 'me' && !grouped && conversation.type === 'group' && <span className="message-author">{message.author || conversation.title}</span>}
                <div className="message-line">
                  {message.from !== 'me' && !grouped && <Avatar src={message.senderId === user?._id ? user.avatarUrl : conversation.avatar} name={message.author || conversation.title} size="tiny" />}
                  <div className="message-bubble">
                    {message.text && <span>{message.text}</span>}
                    {message.attachments?.map((attachment) => <AttachmentLink key={attachment.url} attachment={attachment} />)}
                  </div>
                  {message.from === 'me' && <span className="read-indicator" title="Sent"><CheckCheck size={14} /></span>}
                </div>
                {message.from === 'me' && !message.deleted && <div className="message-actions">
                  <button type="button" onClick={() => editMessage(message)} aria-label="Edit message" title="Edit message"><Pencil size={13} /></button>
                  <button type="button" onClick={() => deleteMessage(message)} aria-label="Delete message" title="Delete message"><Trash2 size={13} /></button>
                </div>}
                <span className="message-time">{message.time}</span>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>
      </div>
      <div className="composer-wrap">
        {notice && <div className="composer-notice" role="alert">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss"><X size={14} /></button></div>}
        {file && <div className="attachment-chip"><Paperclip size={14} />{file.name}<button type="button" onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = '' }} aria-label="Remove attachment"><X size={14} /></button></div>}
        <form className="composer" onSubmit={sendMessage}>
          <input ref={fileRef} type="file" className="visually-hidden" accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,text/plain" onChange={chooseFile} />
          <button className="composer-tool" type="button" onClick={() => fileRef.current?.click()} aria-label="Attach a file"><Paperclip size={19} /></button>
          <input className="message-input" value={draft} onChange={(event) => updateDraft(event.target.value)} placeholder={`Message ${conversation.title.split(' ')[0]}...`} aria-label="Write a message" />
          <div className="emoji-wrap">
            <button className={`composer-tool${showEmoji ? ' emoji-active' : ''}`} type="button" onClick={() => setShowEmoji((value) => !value)} aria-label="Choose emoji"><Smile size={19} /></button>
            {showEmoji && <div className="emoji-picker">{['😊', '💛', '✨', '🌼', '🙌', '☕'].map((emoji) => <button key={emoji} type="button" onClick={() => { updateDraft(`${draft}${emoji}`); setShowEmoji(false) }}>{emoji}</button>)}</div>}
          </div>
          <button className="send-button" type="submit" disabled={(!draft.trim() && !file) || sending || busy} aria-label="Send message">{sending ? '…' : <Send size={17} />}</button>
        </form>
        <div className="composer-hint"><span>Enter to send</span><span>Made with care <span className="heart">♥</span></span></div>
      </div>
    </section>
  )
}

function NewConversationModal({ onClose, onStart }) {
  const [query, setQuery] = useState('')
  const [people, setPeople] = useState([])
  const [groupMode, setGroupMode] = useState(false)
  const [groupTitle, setGroupTitle] = useState('')
  const [selectedPeople, setSelectedPeople] = useState([])
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState('')
  const [creatingGroup, setCreatingGroup] = useState(false)

  useEffect(() => {
    if (query.trim().length < 2) {
      setPeople([])
      setError('')
      return undefined
    }
    setError('')
    let active = true
    const timer = window.setTimeout(async () => {
      try {
        const result = await request(`/users/search?q=${encodeURIComponent(query.trim())}`)
        if (active) setPeople(result.users)
      } catch (searchError) {
        if (active) setError(errorMessage(searchError))
      }
    }, 250)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [query])

  async function start(selection) {
    const userId = typeof selection === 'string' ? selection : ''
    setBusyId(userId)
    setCreatingGroup(!userId)
    setError('')
    try {
      await onStart(selection)
      onClose()
    } catch (startError) {
      setError(errorMessage(startError))
    } finally {
      setBusyId('')
      setCreatingGroup(false)
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="new-modal" role="dialog" aria-modal="true" aria-labelledby="new-modal-title">
        <header><div><span className="eyebrow"><span className="eyebrow-dot" /> SAY HELLO</span><h2 id="new-modal-title">New conversation</h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={19} /></button></header>
        <div className="conversation-mode">
          <button type="button" className={!groupMode ? 'current' : ''} onClick={() => setGroupMode(false)}>Direct message</button>
          <button type="button" className={groupMode ? 'current' : ''} onClick={() => setGroupMode(true)}>Group chat</button>
        </div>
        {groupMode && <label className="group-title-field">Group name<input value={groupTitle} onChange={(event) => setGroupTitle(event.target.value)} placeholder="Give your group a name" maxLength="100" /></label>}
        <label className="search-box modal-search"><Search size={16} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name or email" /></label>
        <span className="modal-section-label">{groupMode ? `SELECT PEOPLE${selectedPeople.length ? ` · ${selectedPeople.length} SELECTED` : ''}` : 'PEOPLE'}</span>
        <div className="modal-people">
          {people.map((person) => {
            const chosen = selectedPeople.includes(person._id)
            return <button className={`person-choice${chosen ? ' person-selected' : ''}`} key={person._id} onClick={() => groupMode
              ? setSelectedPeople((current) => chosen ? current.filter((id) => id !== person._id) : [...current, person._id])
              : start(person._id)} disabled={Boolean(busyId) || creatingGroup}>
              <Avatar src={person.avatarUrl} name={person.name} />
              <span><strong>{person.name}</strong><small>{person.email}</small></span>
              {busyId === person._id ? <span>Opening…</span> : chosen ? <Check size={17} /> : <ArrowUpRight size={17} />}
            </button>
          })}
          {query.trim().length < 2 && <p className="modal-empty">Type at least two characters to search for people.</p>}
          {query.trim().length >= 2 && !people.length && !error && <p className="modal-empty">No people found. Try another name or email.</p>}
          {error && <p className="form-error" role="alert">{error}</p>}
        </div>
        {groupMode && <button className="primary-button group-create-button" type="button" onClick={() => start({ type: 'group', title: groupTitle.trim(), participantIds: selectedPeople })} disabled={!groupTitle.trim() || !selectedPeople.length || creatingGroup}>{creatingGroup ? 'Creating…' : `Create group${selectedPeople.length ? ` · ${selectedPeople.length + 1}` : ''}`}<ArrowUpRight size={16} /></button>}
        <div className="modal-footnote"><Sparkles size={15} /> Search includes registered Gather users.</div>
      </section>
    </div>
  )
}

function ChatDashboard({ user, onLogout }) {
  const [conversations, setConversations] = useState([])
  const [messages, setMessages] = useState([])
  const [filter, setFilter] = useState('All')
  const [onlineUserIds, setOnlineUserIds] = useState(() => new Set())
  const [query, setQuery] = useState('')
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [dark, setDark] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [messageError, setMessageError] = useState('')
  const [busy, setBusy] = useState(false)
  const [typing, setTyping] = useState('')
  const navigate = useNavigate()
  const { conversationId } = useParams()
  const socketRef = useRef(null)

  const loadConversations = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await request('/conversations')
      setConversations(result.conversations.map((item) => mapConversation(item, user._id)))
    } catch (loadError) {
      setError(errorMessage(loadError))
    } finally {
      setLoading(false)
    }
  }, [user._id])

  useEffect(() => { loadConversations() }, [loadConversations])

  const conversationsWithPresence = useMemo(() => conversations.map((conversation) => ({
    ...conversation,
    online: Boolean(conversation.personId && onlineUserIds.has(conversation.personId))
  })), [conversations, onlineUserIds])
  const selectedConversation = conversationsWithPresence.find((conversation) => conversation.id === conversationId)

  const filteredConversations = useMemo(() => conversationsWithPresence.filter((conversation) => {
    const matchesQuery = `${conversation.title} ${conversation.preview}`.toLowerCase().includes(query.toLowerCase())
    const matchesFilter = filter === 'All'
      || (filter === 'Unread' && conversation.unread > 0)
      || (filter === 'Groups' && conversation.type === 'group')
    return matchesQuery && matchesFilter
  }), [conversationsWithPresence, filter, query])

  useEffect(() => {
    if (!conversationId) {
      setMessages([])
      if (window.matchMedia('(min-width: 761px)').matches && conversations.length) {
        navigate(`/messages/${conversations[0].id}`, { replace: true })
      }
      return
    }
    if (!selectedConversation) {
      if (!loading) navigate('/', { replace: true })
      return
    }

    let active = true
    setMessageError('')
    setBusy(true)
    request(`/conversations/${conversationId}/messages?limit=100`)
      .then(({ messages: loaded }) => {
        if (active) setMessages(loaded.map((message) => mapMessage(message, user._id)))
        return request(`/conversations/${conversationId}/read`, { method: 'POST', body: JSON.stringify({}) })
          .then(() => {
            if (active) setConversations((current) => current.map((item) => item.id === conversationId ? { ...item, unread: 0 } : item))
          })
      })
      .catch((loadError) => { if (active) setMessageError(errorMessage(loadError)) })
      .finally(() => { if (active) setBusy(false) })
    return () => { active = false }
  }, [conversationId, loading, navigate, user._id])

  useEffect(() => {
    const token = getAccessToken()
    if (!token) return undefined
    let active = true
    const socket = io(SOCKET_URL, { auth: { accessToken: token }, withCredentials: true })
    socketRef.current = socket
    socket.on('message:new', (message) => {
      if (message.conversation !== conversationId) return
      setMessages((current) => current.some((item) => item.id === message._id) ? current : [...current, mapMessage(message, user._id)])
      setConversations((current) => {
        const updated = current.map((item) => item.id === message.conversation
          ? { ...item, preview: message.text || message.attachments?.[0]?.name || 'Attachment', time: 'now' }
          : item)
        return [...updated].sort((a, b) => (a.id === message.conversation ? -1 : b.id === message.conversation ? 1 : 0))
      })
    })
    socket.on('message:updated', (message) => {
      if (message.conversation !== conversationId) return
      setMessages((current) => current.map((item) => item.id === message._id ? mapMessage(message, user._id) : item))
    })
    socket.on('message:deleted', (message) => {
      if (message.conversation !== conversationId) return
      setMessages((current) => current.map((item) => item.id === message._id ? mapMessage(message, user._id) : item))
    })
    socket.on('typing:update', (event) => {
      if (event.conversationId === conversationId) setTyping(event.isTyping ? `${event.user.name} is typing…` : '')
    })
    socket.on('presence:online', ({ userId: personId }) => {
      setOnlineUserIds((current) => new Set(current).add(personId))
    })
    socket.on('presence:offline', ({ userId: personId }) => {
      setOnlineUserIds((current) => {
        const next = new Set(current)
        next.delete(personId)
        return next
      })
    })
    socket.on('connect_error', (socketError) => setMessageError(socketError.message || 'Unable to connect to live chat.'))
    socket.on('disconnect', (reason) => {
      if (reason !== 'io server disconnect') return
      request('/auth/me').then(() => {
        if (!active) return
        socket.auth = { accessToken: getAccessToken() }
        socket.connect()
      }).catch((socketError) => {
        if (active) setMessageError(errorMessage(socketError))
      })
    })
    return () => {
      active = false
      socket.disconnect()
      socketRef.current = null
    }
  }, [conversationId, user._id])

  useEffect(() => {
    const socket = socketRef.current
    if (!socket || !conversationId) return undefined
    socket.emit('conversation:join', { conversationId }, (result) => {
      if (!result?.success) setMessageError(result?.error?.message || 'Unable to join this conversation.')
    })
    return () => socket.emit('conversation:leave', { conversationId })
  }, [conversationId])

  function selectConversation(id) {
    setDetailsOpen(false)
    setMessageError('')
    setConversations((current) => current.map((item) => item.id === id ? { ...item, unread: 0 } : item))
    navigate(`/messages/${id}`)
  }

  async function startConversation(selection) {
    const body = typeof selection === 'string'
      ? { type: 'direct', participantIds: [selection] }
      : selection
    const { conversation } = await request('/conversations', {
      method: 'POST',
      body: JSON.stringify(body)
    })
    await loadConversations()
    navigate(`/messages/${conversation._id}`)
  }

  async function sendMessage(content) {
    if (!selectedConversation) return
    const { message } = await request(`/conversations/${selectedConversation.id}/messages`, {
      method: 'POST',
      body: JSON.stringify(content)
    })
    setMessages((current) => current.some((item) => item.id === message._id) ? current : [...current, mapMessage(message, user._id)])
    setConversations((current) => {
      const updated = current.map((item) => item.id === selectedConversation.id
        ? { ...item, preview: message.text || message.attachments?.[0]?.name || 'Attachment', time: 'now' }
        : item)
      return [...updated].sort((a, b) => (a.id === selectedConversation.id ? -1 : b.id === selectedConversation.id ? 1 : 0))
    })
  }

  async function editMessage(messageId, text) {
    const { message } = await request(`/conversations/messages/${messageId}`, {
      method: 'PATCH',
      body: JSON.stringify({ text })
    })
    const updated = mapMessage(message, user._id)
    setMessages((current) => current.map((item) => item.id === messageId ? updated : item))
    if (messages[messages.length - 1]?.id === messageId) {
      setConversations((current) => current.map((item) => item.id === conversationId ? { ...item, preview: text } : item))
    }
  }

  async function deleteMessage(messageId) {
    const { message } = await request(`/conversations/messages/${messageId}`, { method: 'DELETE' })
    const deleted = mapMessage(message, user._id)
    setMessages((current) => current.map((item) => item.id === messageId ? deleted : item))
    if (messages[messages.length - 1]?.id === messageId) {
      setConversations((current) => current.map((item) => item.id === conversationId ? { ...item, preview: 'This message was deleted' } : item))
    }
  }

  function sendTyping(isTyping) {
    const socket = socketRef.current
    if (socket && selectedConversation) socket.emit(isTyping ? 'typing:start' : 'typing:stop', { conversationId: selectedConversation.id })
  }

  return (
    <main className={`app-shell${dark ? ' theme-dark' : ''}${selectedConversation ? ' mobile-chat' : ''}`}>
      <NavRail active="messages" user={user} onTheme={() => setDark((value) => !value)} onLogout={onLogout} />
      <Sidebar
        conversations={filteredConversations}
        selectedId={selectedConversation?.id}
        onSelect={selectConversation}
        onNew={() => setModalOpen(true)}
        filter={filter}
        setFilter={setFilter}
        query={query}
        setQuery={setQuery}
        onLogout={onLogout}
        user={user}
        loading={loading}
        error={error}
      />
      {selectedConversation ? (
        <ChatView
          key={selectedConversation.id}
          conversation={selectedConversation}
          messages={messages}
          onBack={() => navigate('/')}
          onToggleDetails={() => setDetailsOpen((value) => !value)}
          onSend={sendMessage}
          onTyping={sendTyping}
          onEditMessage={editMessage}
          onDeleteMessage={deleteMessage}
          busy={busy}
          user={user}
        />
      ) : <EmptyChat onNew={() => setModalOpen(true)} />}
      {messageError && selectedConversation && <div className="chat-error" role="alert">{messageError}</div>}
      {typing && selectedConversation && <div className="typing-indicator">{typing}</div>}
      {detailsOpen && selectedConversation && <ConversationDetails conversation={selectedConversation} onClose={() => setDetailsOpen(false)} />}
      {modalOpen && <NewConversationModal onClose={() => setModalOpen(false)} onStart={startConversation} />}
    </main>
  )
}

function PeoplePage({ user, onLogout }) {
  const [query, setQuery] = useState('')
  const [people, setPeople] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    if (query.trim().length < 2) {
      setPeople([])
      setError('')
      setLoading(false)
      return undefined
    }
    let active = true
    setLoading(true)
    setError('')
    const timer = window.setTimeout(async () => {
      try {
        const result = await request(`/users/search?q=${encodeURIComponent(query.trim())}`)
        if (active) setPeople(result.users)
      } catch (searchError) {
        if (active) setError(errorMessage(searchError))
      } finally {
        if (active) setLoading(false)
      }
    }, 250)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [query])

  async function messagePerson(personId) {
    try {
      const { conversation } = await request('/conversations', {
        method: 'POST',
        body: JSON.stringify({ type: 'direct', participantIds: [personId] })
      })
      navigate(`/messages/${conversation._id}`)
    } catch (createError) {
      setError(errorMessage(createError))
    }
  }

  return (
    <main className="app-shell page-shell">
      <NavRail active="people" user={user} onLogout={onLogout} />
      <section className="page-content">
        <div className="page-heading"><span className="eyebrow"><span className="eyebrow-dot" /> YOUR COMMUNITY</span><h1>Find your people</h1><p>Search for someone by name or email to start a conversation.</p></div>
        <label className="search-box page-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search people by name or email" aria-label="Search people" /></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="people-results">
          {loading && <p className="page-empty">Searching…</p>}
          {!loading && query.trim().length < 2 && <p className="page-empty">Enter at least two characters to find people.</p>}
          {!loading && query.trim().length >= 2 && people.length === 0 && !error && <p className="page-empty">No people found. Try a different search.</p>}
          {people.map((person) => <article className="person-card" key={person._id}><Avatar src={person.avatarUrl} name={person.name} size="large" /><div className="person-card-copy"><strong>{person.name}</strong><span>{person.email}</span>{person.bio && <p>{person.bio}</p>}</div><button className="primary-button" onClick={() => messagePerson(person._id)}><MessageCircle size={16} /> Message</button></article>)}
        </div>
      </section>
    </main>
  )
}

function SettingsPage({ user, onUserUpdate, onLogout }) {
  const [name, setName] = useState(user.name || '')
  const [bio, setBio] = useState(user.bio || '')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setName(user.name || '')
    setBio(user.bio || '')
  }, [user])

  async function saveProfile(event) {
    event.preventDefault()
    setStatus('')
    setError('')
    setBusy(true)
    try {
      const { user: updatedUser } = await request('/users/me', {
        method: 'PATCH',
        body: JSON.stringify({ name: name.trim(), bio: bio.trim() })
      })
      onUserUpdate(updatedUser)
      setStatus('Your profile has been updated.')
    } catch (saveError) {
      setError(errorMessage(saveError))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="app-shell page-shell">
      <NavRail active="settings" user={user} onLogout={onLogout} />
      <section className="page-content">
        <div className="page-heading"><span className="eyebrow"><span className="eyebrow-dot" /> YOUR ACCOUNT</span><h1>Settings</h1><p>Manage your profile and account details.</p></div>
        <form className="settings-card" onSubmit={saveProfile}>
          <div className="settings-profile"><Avatar src={user.avatarUrl} name={user.name} size="large" /><div><strong>{user.name}</strong><span>{user.email}</span></div></div>
          <label>Display name<input value={name} onChange={(event) => setName(event.target.value)} minLength="2" maxLength="80" required /></label>
          <label>About you<textarea value={bio} onChange={(event) => setBio(event.target.value)} maxLength="280" rows="4" placeholder="A little about yourself…" /></label>
          <div className="settings-meta"><span>{bio.length}/280</span><span>{user.email} · email cannot be changed here</span></div>
          {error && <p className="form-error" role="alert">{error}</p>}
          {status && <p className="success-note" role="status"><Check size={17} />{status}</p>}
          <button className="primary-button" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
        </form>
        <section className="settings-card account-actions"><div><h2>Account</h2><p>Sign out of this device.</p></div><button className="secondary-button" onClick={onLogout}><LogOut size={16} /> Sign out</button></section>
      </section>
    </main>
  )
}

function ProtectedRoute({ user, ready, children }) {
  const location = useLocation()
  if (!ready) return <main className="app-loading"><Brand /><p>Connecting to Gather…</p></main>
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  return children
}

export default function App() {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)
  const authGeneration = useRef(0)
  const navigate = useNavigate()

  useEffect(() => {
    let active = true
    const generation = authGeneration.current
    request('/auth/me')
      .then(({ user: current }) => {
        if (active && authGeneration.current === generation) setUser(current)
      })
      .catch((error) => {
        if (active && authGeneration.current === generation && !(error instanceof ApiError && error.status === 401)) {
          console.error('Unable to restore Gather session:', error)
        }
        if (active && authGeneration.current === generation) {
          saveAccessToken(null)
          setUser(null)
        }
      })
      .finally(() => {
        if (active && authGeneration.current === generation) setReady(true)
      })
    return () => { active = false }
  }, [])

  const authenticate = useCallback((authenticatedUser) => {
    authGeneration.current += 1
    setUser(authenticatedUser)
    setReady(true)
  }, [])

  const logout = useCallback(async () => {
    authGeneration.current += 1
    try {
      await request('/auth/logout', { method: 'POST' }, false)
    } catch (logoutError) {
      console.error('Unable to revoke Gather session:', logoutError)
    } finally {
      saveAccessToken(null)
      setUser(null)
      navigate('/login', { replace: true })
    }
  }, [navigate])

  return (
    <Routes>
      <Route path="/login" element={ready && user ? <Navigate to="/" replace /> : <AuthPage mode="login" onAuthenticated={authenticate} />} />
      <Route path="/signup" element={ready && user ? <Navigate to="/" replace /> : <AuthPage mode="signup" onAuthenticated={authenticate} />} />
      <Route path="/forgot-password" element={<AuthPage mode="reset" onAuthenticated={authenticate} />} />
      <Route path="/" element={<ProtectedRoute user={user} ready={ready}><ChatDashboard user={user} onLogout={logout} /></ProtectedRoute>} />
      <Route path="/messages/:conversationId" element={<ProtectedRoute user={user} ready={ready}><ChatDashboard user={user} onLogout={logout} /></ProtectedRoute>} />
      <Route path="/people" element={<ProtectedRoute user={user} ready={ready}><PeoplePage user={user} onLogout={logout} /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute user={user} ready={ready}><SettingsPage user={user} onUserUpdate={setUser} onLogout={logout} /></ProtectedRoute>} />
      <Route path="*" element={<main className="not-found"><Brand /><span className="eyebrow"><span className="eyebrow-dot" /> LOST IN THE CHAT</span><h1>That page wandered off.</h1><p>Let’s get you back to your people.</p><Link className="primary-button" to="/">Back to messages <ArrowLeft size={17} /></Link></main>} />
    </Routes>
  )
}
