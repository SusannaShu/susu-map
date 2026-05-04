import { useState, useRef, useEffect } from 'react';
import { useGetMessagesQuery, useGetConversationQuery, useCreateMessageMutation } from '../store/communityApi';
import { useAppSelector } from '../store/store';
import toast from 'react-hot-toast';
import './MessagesPage.css';

function ChatView({ receiverId, receiverName, onBack }: { receiverId: string, receiverName: string, onBack: () => void }) {
  const { user } = useAppSelector(state => state.auth);
  const { data: convData, isLoading } = useGetConversationQuery(
    { senderId: String(user?.id || ''), receiverId: String(receiverId) },
    { skip: !user }
  );
  const [createMessage] = useCreateMessageMutation();
  const [text, setText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const messages = convData?.data || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() || !user) return;
    try {
      await createMessage({
        text,
        messageReceiver: receiverId,
        messageSender: user.documentId || user.id,
        messageCategory: 'user'
      }).unwrap();
      setText('');
    } catch (e) {
      console.error(e);
      toast.error('Failed to send message');
    }
  };

  return (
    <div className="chatView">
      <div className="chatViewHeader">
        <button className="chatViewBackBtn" onClick={onBack}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
        <h1 className="chatViewTitle">{receiverName}</h1>
      </div>

      <div className="chatMessages">
        {isLoading ? (
          <div className="chatMessagesLoading">Loading...</div>
        ) : messages.length === 0 ? (
          <div className="chatMessagesEmpty">No messages yet.</div>
        ) : (
          messages.map((msg: any) => {
            const isMe = msg.isSender;
            return (
              <div key={msg.id} className={`chatMessageBubble ${isMe ? 'isMe' : 'isThem'}`}>
                <div className="chatMessageText">{msg.messageText}</div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chatInputArea">
        <input
          className="chatInputBox"
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Type a message..."
        />
        <button
          className="chatSendBtn"
          onClick={handleSend}
          disabled={!text.trim()}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </div>
    </div>
  );
}

export function MessagesPage() {
  const { data: messagesResponse, isLoading } = useGetMessagesQuery();
  const { isAuthenticated } = useAppSelector(state => state.auth);
  const [activeChat, setActiveChat] = useState<{ id: string, name: string } | null>(null);

  const messages = messagesResponse?.data || [];

  if (activeChat) {
    return (
      <div className="messagesPage" id="messages-page" style={{ display: 'flex', flexDirection: 'column' }}>
        <ChatView 
          receiverId={activeChat.id} 
          receiverName={activeChat.name}
          onBack={() => setActiveChat(null)} 
        />
      </div>
    );
  }

  return (
    <div className="messagesPage" id="messages-page">
      <div className="messagesHeader">
        <h1 className="messagesTitle">Messages</h1>
      </div>

      {!isAuthenticated ? (
        <div className="messagesEmpty">
          <p>Sign in to view your messages</p>
        </div>
      ) : isLoading ? (
        <div className="messagesLoading">Loading messages...</div>
      ) : messages.length === 0 ? (
        <div className="messagesEmpty">
          <p>No messages yet. Start a conversation from a pin!</p>
        </div>
      ) : (
        <div className="messagesList">
          {messages.map((msg: any) => {
            const displayName = msg.username || msg.name || 'User';
            const displayPreview = msg.lastMessage || msg.preview || msg.content || 'Message preview';
            
            return (
              <div 
                key={msg.id} 
                className="messageItem" 
                onClick={() => setActiveChat({ id: msg.id, name: displayName })}
                style={{ cursor: 'pointer' }}
              >
                <div className="messageAvatar" style={{ backgroundColor: msg.color || 'var(--color-primary)' }}>
                  {msg.profilePicUrl || msg.avatar ? (
                    <img src={msg.profilePicUrl || msg.avatar} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    displayName.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="messageInfo">
                  <div className="messageTop">
                    <span className="messageName">{displayName}</span>
                    <span className="messageTime">
                      {msg.lastMessageDate ? new Date(msg.lastMessageDate).toLocaleDateString() : 'Recently'}
                    </span>
                  </div>
                  <div className={`messagePreview ${msg.unread ? 'unread' : ''}`}>
                    {displayPreview}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
