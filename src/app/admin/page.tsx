'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Phone,
  MessageSquare,
  Calendar,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Lock,
  LogOut,
  Heart,
  MapPin,
  Activity,
  Download,
  Flame,
} from 'lucide-react';

interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface Conversation {
  id: string;
  session_id: string;
  user_name: string | null;
  user_phone: string | null;
  user_location: string | null;
  service_interest: string | null;
  prospect_status: 'hot' | 'warm' | 'not_a_fit' | null;
  ai_summary: string | null;
  created_at: string;
  updated_at: string;
  messages: Message[];
}

interface Stats {
  totalConversations: number;
  leadsWithPhone: number;
  todayConversations: number;
  hotLeads: number;
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr + (dateStr.includes('Z') ? '' : 'Z'));
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return dateStr;
  }
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center flex-shrink-0`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
}

function ConversationRow({ conv }: { conv: Conversation }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden mb-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-6 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
              <span className="text-teal-700 font-semibold text-sm">
                {conv.user_name ? conv.user_name[0].toUpperCase() : '?'}
              </span>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-gray-800 text-sm">
                  {conv.user_name || 'Anonymous Visitor'}
                </span>
                {conv.user_phone && (
                  <span className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                    <Phone className="w-3 h-3" />
                    {conv.user_phone}
                  </span>
                )}
                {conv.user_location && (
                  <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                    <MapPin className="w-3 h-3" />
                    {conv.user_location}
                  </span>
                )}
                {conv.service_interest && (
                  <span className="inline-flex items-center gap-1 text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
                    <Heart className="w-3 h-3" />
                    {conv.service_interest}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-gray-400">
                  {formatDate(conv.created_at)}
                </span>
                <span className="text-xs text-gray-400">
                  {conv.messages.length} messages
                </span>
                {conv.prospect_status && (
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    conv.prospect_status === 'hot'
                      ? 'bg-red-100 text-red-700'
                      : conv.prospect_status === 'warm'
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {conv.prospect_status === 'hot' ? '🔥 Hot' : conv.prospect_status === 'warm' ? '🌤 Warm' : 'Not a Fit'}
                  </span>
                )}
              </div>
              {conv.ai_summary && (
                <p className="text-xs text-gray-500 mt-1 italic">"{conv.ai_summary}"</p>
              )}
            </div>
          </div>

          <div className="flex-shrink-0 text-gray-400">
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50 px-6 py-4">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Conversation History
          </h4>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {conv.messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div
                  className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                    msg.role === 'user'
                      ? 'bg-gray-300 text-gray-600'
                      : 'bg-teal-500 text-white'
                  }`}
                >
                  {msg.role === 'user' ? 'U' : 'A'}
                </div>
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-teal-500 text-white rounded-tr-none'
                      : 'bg-white border border-gray-200 text-gray-700 rounded-tl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  <p
                    className={`mt-1 text-[10px] ${
                      msg.role === 'user' ? 'text-teal-200' : 'text-gray-400'
                    }`}
                  >
                    {formatDate(msg.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LoginForm({ onLogin }: { onLogin: (password: string) => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/conversations', {
        headers: { Authorization: `Bearer ${password}` },
      });
      if (res.ok) {
        onLogin(password);
      } else {
        setError('Invalid password. Please try again.');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-teal-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-800">Admin Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Concierge Care Florida</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
              required
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full bg-gradient-to-r from-teal-500 to-teal-700 text-white rounded-xl py-3 text-sm font-semibold hover:from-teal-600 hover:to-teal-800 disabled:opacity-50 transition-all shadow-sm"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [password, setPassword] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalConversations: 0,
    leadsWithPhone: 0,
    todayConversations: 0,
    hotLeads: 0,
  });
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Restore password from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('ccf_admin_password');
    if (stored) setPassword(stored);
  }, []);

  const fetchData = useCallback(
    async (pwd: string) => {
      setLoading(true);
      try {
        const res = await fetch('/api/conversations', {
          headers: { Authorization: `Bearer ${pwd}` },
        });
        if (res.ok) {
          const data = await res.json();
          setConversations(data.conversations);
          setStats(data.stats);
          setLastRefresh(new Date());
        } else if (res.status === 401) {
          // Password no longer valid
          localStorage.removeItem('ccf_admin_password');
          setPassword(null);
        }
      } catch (err) {
        console.error('Fetch error:', err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (password) {
      fetchData(password);
      const interval = setInterval(() => fetchData(password), 30000);
      return () => clearInterval(interval);
    }
  }, [password, fetchData]);

  const handleLogin = (pwd: string) => {
    localStorage.setItem('ccf_admin_password', pwd);
    setPassword(pwd);
  };

  const handleLogout = () => {
    localStorage.removeItem('ccf_admin_password');
    setPassword(null);
    setConversations([]);
  };

  if (!password) {
    return <LoginForm onLogin={handleLogin} />;
  }

  const leadsOnly = conversations.filter((c) => c.user_name || c.user_phone);
  const anonymousCount = conversations.length - leadsOnly.length;

  const exportCSV = () => {
    const rows = [
      ['Name', 'Phone', 'Location', 'Service Interest', 'Prospect Status', 'AI Summary', 'Date'],
      ...conversations.map((c) => [
        c.user_name || '',
        c.user_phone || '',
        c.user_location || '',
        c.service_interest || '',
        c.prospect_status || '',
        c.ai_summary || '',
        formatDate(c.created_at),
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" fill="white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-800">Admin Dashboard</h1>
              <p className="text-xs text-gray-500">Concierge Care Florida</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {lastRefresh && (
              <span className="text-xs text-gray-400 hidden sm:block">
                Updated {lastRefresh.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={exportCSV}
              disabled={conversations.length === 0}
              className="flex items-center gap-2 text-sm text-white px-3 py-2 rounded-xl transition-colors disabled:opacity-40"
              style={{ backgroundColor: '#78b833' }}
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
            <button
              onClick={() => fetchData(password)}
              disabled={loading}
              className="flex items-center gap-2 text-sm text-teal-600 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 px-3 py-2 rounded-xl transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-xl transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={MessageSquare}
            label="Total Conversations"
            value={stats.totalConversations}
            color="bg-teal-500"
          />
          <StatCard
            icon={Phone}
            label="Leads with Phone"
            value={stats.leadsWithPhone}
            color="bg-green-500"
          />
          <StatCard
            icon={Calendar}
            label="Today's Conversations"
            value={stats.todayConversations}
            color="bg-blue-500"
          />
          <StatCard
            icon={Flame}
            label="Hot Leads"
            value={stats.hotLeads}
            color="bg-red-500"
          />
        </div>

        {/* Conversations */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800">
            All Conversations
          </h2>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Activity className="w-4 h-4" />
            <span>
              {leadsOnly.length} leads · {anonymousCount} anonymous
            </span>
          </div>
        </div>

        {loading && conversations.length === 0 ? (
          <div className="text-center py-16">
            <RefreshCw className="w-8 h-8 text-teal-400 animate-spin mx-auto mb-3" />
            <p className="text-gray-500">Loading conversations...</p>
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-100 shadow-sm">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-gray-600 font-medium">No conversations yet</h3>
            <p className="text-gray-400 text-sm mt-1">
              Conversations will appear here once visitors start chatting.
            </p>
          </div>
        ) : (
          <div>
            {conversations.map((conv) => (
              <ConversationRow key={conv.id} conv={conv} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
