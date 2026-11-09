import { PageHeader } from "@/shared/ui/page-header";

import { ProfileCard } from "../components/profile-card";
import { SecurityCard } from "../components/security-card";

export function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Configurações" description="Dados do perfil e senha da conta." />

      <ProfileCard />
      <SecurityCard />
    </div>
  );
}

export default SettingsPage;
