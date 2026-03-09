import { ContentSection } from '../components/content-section'
import { AccountForm } from './account-form'

export function SettingsAccount() {
  return (
    <ContentSection
      title='账户设置'
      desc='管理您的账户信息和邮箱地址'
    >
      <AccountForm />
    </ContentSection>
  )
}
