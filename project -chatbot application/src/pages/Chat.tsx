import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { LogOut, Search, Send, Smile, Paperclip as PaperClip } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Profile {
  id: string;
  email: string;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  created_at: string;
}

export default function Chat() {
  const { user, signOut } = useAuthStore();
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  // Search for users
  useEffect(() => {
    const searchUsers = async () => {
      if (searchQuery.trim()) {
        setLoading(true);
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .ilike('email', `%${searchQuery}%`)
          .neq('id', user?.id)
          .limit(10);

        if (!error && data) {
          setSearchResults(data);
        }
        setLoading(false);
      } else {
        setSearchResults([]);
      }
    };

    const timeoutId = setTimeout(searchUsers, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, user?.id]);

  // Load messages for selected user
  useEffect(() => {
    if (selectedUser) {
      const fetchMessages = async () => {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .or(`and(sender_id.eq.${user?.id},receiver_id.eq.${selectedUser.id}),and(sender_id.eq.${selectedUser.id},receiver_id.eq.${user?.id})`)
          .order('created_at', { ascending: true });

        if (!error && data) {
          setMessages(data);
        }
      };

      fetchMessages();

      // Subscribe to new messages
      const channel = supabase.channel('messages')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `or(and(sender_id.eq.${user?.id},receiver_id.eq.${selectedUser.id}),and(sender_id.eq.${selectedUser.id},receiver_id.eq.${user?.id}))`,
        }, (payload) => {
          setMessages(prev => [...prev, payload.new as Message]);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedUser, user?.id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !selectedUser) return;

    const { error } = await supabase
      .from('messages')
      .insert({
        content: message,
        sender_id: user?.id,
        receiver_id: selectedUser.id,
      });

    if (!error) {
      setMessage('');
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Messages</h2>
            <button
              onClick={signOut}
              className="p-2 hover:bg-gray-100 rounded-full"
              title="Sign out"
            >
              <LogOut className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search users by email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">Searching...</div>
          ) : searchResults.length > 0 ? (
            searchResults.map((profile) => (
              <button
                key={profile.id}
                onClick={() => setSelectedUser(profile)}
                className={`w-full p-4 text-left hover:bg-gray-50 flex items-center space-x-3 ${
                  selectedUser?.id === profile.id ? 'bg-indigo-50' : ''
                }`}
              >
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                  <span className="text-indigo-600 font-semibold">
                    {profile.email[0].toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-medium">{profile.email}</p>
                </div>
              </button>
            ))
          ) : searchQuery ? (
            <div className="p-4 text-center text-gray-500">No users found</div>
          ) : null}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="bg-white p-4 border-b">
          <h3 className="text-lg font-semibold">
            {selectedUser ? selectedUser.email : 'Select a user to start chatting'}
          </h3>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {selectedUser ? (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] p-3 rounded-lg ${
                    msg.sender_id === user?.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-gray-900'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              Select a user to start chatting
            </div>
          )}
        </div>

        {/* Message Input */}
        {selectedUser && (
          <form onSubmit={handleSendMessage} className="bg-white p-4 border-t">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                className="p-2 hover:bg-gray-100 rounded-full"
                title="Add sticker"
              >
                <Smile className="w-6 h-6 text-gray-500" />
              </button>
              <button
                type="button"
                className="p-2 hover:bg-gray-100 rounded-full"
                title="Attach file"
              >
                <PaperClip className="w-6 h-6 text-gray-500" />
              </button>
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 p-2 border rounded-lg focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}