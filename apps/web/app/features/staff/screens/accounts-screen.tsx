import { Chip, type ChipProps } from "../../../components/ui/chip";
import { Icon } from "../../../components/ui/icon";
import { PersonRow } from "../../../components/ui/person-row";
import type { Profile } from "../../../lib/api/account-schemas";
import { AccountScreen } from "../../account/account-screen";
import type { AccountListItem, AccountStatus } from "../staff-views";

const ACCOUNT_STATUS: Record<AccountStatus, ChipProps> = {
  active: { tone: "locked", icon: "check", label: "Actif" },
  to_verify: { tone: "wait", icon: "clock", label: "À vérifier" },
  staff: { tone: "done", icon: "shield", label: "Équipe" },
};

const FILTERS = ["Tous", "Vendeuses", "Livreurs", "Équipe"];

interface AccountsScreenProps {
  profile: Profile;
  accounts: AccountListItem[];
}

/** D1 : les comptes du pilote. L'identité se vérifie en personne avant la première commande. */
export function AccountsScreen({ profile, accounts }: AccountsScreenProps) {
  return (
    <AccountScreen
      profile={profile}
      title="Comptes"
      subtitle="Chaque compte entre sur invitation et se vérifie en personne."
      actions={
        <button type="button" className="btn btn-primary" disabled title="Bientôt disponible">
          <Icon name="plus" />
          Inviter quelqu'un
        </button>
      }
    >
      <section className="panel">
        <div className="panel-head">
          <label className="search">
            <Icon name="search" />
            <span className="sr-only">Chercher</span>
            <input className="input" placeholder="Chercher un nom ou un numéro" />
          </label>
          <nav className="tabs" aria-label="Filtrer les comptes">
            {FILTERS.map((filter, index) => (
              <a key={filter} href="?" aria-current={index === 0 ? "page" : undefined}>
                {filter}
              </a>
            ))}
          </nav>
        </div>
        <div>
          {accounts.map((account) => (
            <PersonRow
              key={account.id}
              name={account.displayName}
              detail={account.detail}
              aside={
                account.status === "to_verify" ? (
                  <button type="button" className="btn btn-secondary btn-compact" disabled>
                    Vérifier
                  </button>
                ) : (
                  <Chip {...ACCOUNT_STATUS[account.status]} />
                )
              }
            />
          ))}
        </div>
      </section>
    </AccountScreen>
  );
}
