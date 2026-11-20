import { Banner } from "../../../components/ui/banner";
import { Icon } from "../../../components/ui/icon";
import type { Profile } from "../../../lib/api/account-schemas";
import { AccountScreen } from "../../account/account-screen";
import type { SettingView } from "../staff-views";

interface SettingsScreenProps {
  profile: Profile;
  settings: SettingView[];
}

/** D2 : les plafonds et minuteurs du pilote, bornés par la base elle-même. */
export function SettingsScreen({ profile, settings }: SettingsScreenProps) {
  return (
    <AccountScreen
      profile={profile}
      title="Réglages du pilote"
      subtitle="Chaque valeur reste entre les bornes fixées dans la base."
    >
      <div className="split">
        <section className="panel split-main">
          {settings.map((setting) => (
            <label key={setting.key} className="setting">
              <span>
                <b>{setting.label}</b>
                <small>{setting.range}</small>
              </span>
              <input className="input" defaultValue={setting.value} />
            </label>
          ))}
        </section>
        <aside className="split-side">
          <Banner tone="info" icon="shield">
            Chaque changement demande votre passkey et reste dans le journal d’audit.
          </Banner>
          <button type="button" className="btn btn-primary" disabled title="Bientôt disponible">
            <Icon name="finger" />
            Enregistrer avec ma passkey
          </button>
        </aside>
      </div>
    </AccountScreen>
  );
}
