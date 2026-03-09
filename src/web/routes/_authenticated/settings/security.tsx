import { createFileRoute } from '@tanstack/react-router'
import { ContentSection } from '@/features/settings/components/content-section'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useState } from 'react'
import { toast } from 'sonner'

export const Route = createFileRoute('/_authenticated/settings/security')({
  component: SecuritySettings,
})

function SecuritySettings() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (newPassword !== confirmPassword) {
      toast.error('两次输入的新密码不一致')
      return
    }

    if (newPassword.length < 8) {
      toast.error('新密码至少需要8个字符')
      return
    }

    try {
      setIsLoading(true)
      // TODO: 调用 API 修改密码
      toast.success('密码已修改')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      toast.error('修改密码失败')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <ContentSection
      title='安全设置'
      desc='管理您的密码和账户安全'
    >
      <div className='space-y-8'>
        {/* 修改密码 */}
        <div className='space-y-4'>
          <h3 className='text-lg font-medium'>修改密码</h3>
          <form onSubmit={handleChangePassword} className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='current-password'>当前密码</Label>
              <Input
                id='current-password'
                type='password'
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder='请输入当前密码'
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='new-password'>新密码</Label>
              <Input
                id='new-password'
                type='password'
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder='请输入新密码（至少8个字符）'
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='confirm-password'>确认新密码</Label>
              <Input
                id='confirm-password'
                type='password'
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder='请再次输入新密码'
              />
            </div>
            <Button type='submit' disabled={isLoading}>
              {isLoading ? '修改中...' : '修改密码'}
            </Button>
          </form>
        </div>

        {/* 安全提示 */}
        <div className='rounded-lg border p-4 bg-muted/50'>
          <h4 className='text-sm font-medium mb-2'>安全建议</h4>
          <ul className='text-xs text-muted-foreground space-y-1 list-disc list-inside'>
            <li>使用至少8个字符的密码</li>
            <li>包含大小写字母、数字和特殊字符</li>
            <li>定期更换密码以提高安全性</li>
            <li>不要在多个网站使用相同的密码</li>
          </ul>
        </div>
      </div>
    </ContentSection>
  )
}
