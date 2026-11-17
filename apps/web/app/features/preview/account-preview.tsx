import { LoginScreen } from "../account/login-screen";
import { DeliveriesScreen } from "../courier/screens/deliveries-screen";
import { DeliveryScreen } from "../courier/screens/delivery-screen";
import { NewOrderScreen } from "../seller/screens/new-order-screen";
import { SellerOrderScreen } from "../seller/screens/seller-order-screen";
import { SellerOrdersScreen } from "../seller/screens/seller-orders-screen";
import { ShareLinkScreen } from "../seller/screens/share-link-screen";
import type { AccountPreview } from "./account-fixtures.server";

/** Affiche un écran fictif de la vendeuse ou du livreur, avec les vrais composants. */
export function AccountPreviewScreen({ preview }: { preview: AccountPreview }) {
  switch (preview.kind) {
    case "login":
      return (
        <LoginScreen
          error={preview.error}
          phone="77 000 00 01"
          demoAccounts={[
            { label: "Vendeuse", phone: "77 000 00 01", pin: "111111" },
            { label: "Livreur", phone: "77 000 00 02", pin: "222222" },
          ]}
        />
      );
    case "seller-orders":
      return (
        <SellerOrdersScreen profile={preview.profile} orders={preview.orders} filter="en-cours" />
      );
    case "new-order":
      return <NewOrderScreen profile={preview.profile} couriers={preview.couriers} error={null} />;
    case "share-link":
      return <ShareLinkScreen profile={preview.profile} order={preview.order} />;
    case "seller-order":
      return <SellerOrderScreen profile={preview.profile} order={preview.order} error={null} />;
    case "deliveries":
      return <DeliveriesScreen profile={preview.profile} deliveries={preview.deliveries} />;
    case "delivery":
      return (
        <DeliveryScreen
          profile={preview.profile}
          delivery={preview.delivery}
          error={preview.error}
        />
      );
  }
}
