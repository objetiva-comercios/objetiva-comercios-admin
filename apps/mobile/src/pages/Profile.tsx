import { useNavigate } from 'react-router-dom'
import { formatDate } from '@objetiva/utils'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

function formatRelativeTime(iso: string | undefined) {
  if (!iso) return 'Unknown'
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days} day${days === 1 ? '' : 's'} ago`
  if (hours > 0) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  if (minutes > 0) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  return 'Just now'
}

function getInitials(email: string | undefined) {
  if (!email) return '?'
  return email.charAt(0).toUpperCase()
}

function truncateId(id: string | undefined) {
  if (!id) return 'Unknown'
  return `${id.slice(0, 8)}...${id.slice(-4)}`
}

export function Profile() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Avatar + name */}
      <div className="flex flex-col items-center py-6">
        <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center mb-3">
          <span className="text-3xl font-bold text-primary-foreground">
            {getInitials(user.email)}
          </span>
        </div>
        <p className="text-lg font-semibold text-foreground">{user.email}</p>
      </div>

      {/* Account info */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Account Information
          </p>
        </div>
        <div className="divide-y divide-border">
          <div className="flex flex-col px-4 py-3">
            <p className="text-xs text-muted-foreground mb-0.5">Email</p>
            <p className="text-sm text-foreground">{user.email}</p>
          </div>
          <div className="flex flex-col px-4 py-3">
            <p className="text-xs text-muted-foreground mb-0.5">User ID</p>
            <p className="text-sm text-foreground font-mono">{truncateId(user.id)}</p>
          </div>
          <div className="flex flex-col px-4 py-3">
            <p className="text-xs text-muted-foreground mb-0.5">Account Created</p>
            <p className="text-sm text-foreground">
              {user.created_at ? formatDate(user.created_at) : 'Unknown'}
            </p>
          </div>
          <div className="flex flex-col px-4 py-3">
            <p className="text-xs text-muted-foreground mb-0.5">Last Sign In</p>
            <p className="text-sm text-foreground">{formatRelativeTime(user.last_sign_in_at)}</p>
          </div>
        </div>
      </div>

      {/* Sign out */}
      <button
        onClick={handleSignOut}
        className="w-full py-3 rounded-lg border border-destructive text-destructive font-medium text-sm active:opacity-70 transition-opacity"
      >
        Sign Out
      </button>
    </div>
  )
}
