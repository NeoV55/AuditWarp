// pages/index.js
import { ConnectButton } from '@mysten/dapp-kit';

export default function Home() {
  return (
    <div style={{ padding: 40 }}>
      <h1>Sui Wallet Connection</h1>
      <ConnectButton />
    </div>
  );
}
