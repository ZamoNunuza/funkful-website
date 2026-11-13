import { PageHeader } from "../ui";
import ScanLauncher from "./scan-launcher";

export default function ScanPage() {
  return (
    <>
      <PageHeader title="Scan" subtitle="Scan a roll’s QR label to see its stock, record usage, receive more or count it." />
      <ScanLauncher />
    </>
  );
}
