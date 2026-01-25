import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProfileForm } from '@/components/settings/profile-form'

export default async function ProfilePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Profile Settings</h2>
        <p className="text-muted-foreground">Manage your personal information and preferences.</p>
      </div>

      <div className="rounded-lg border p-6">
        <ProfileForm
          user={{
            id: user.id,
            email: user.email!,
            display_name: user.user_metadata?.display_name,
          }}
        />
      </div>
    </div>
  )
}
