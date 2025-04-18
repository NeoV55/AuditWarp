// pages/audit.js
import { useState } from 'react';
import axios from 'axios';
import { useCurrentAccount, useSignAndExecuteTransaction, ConnectButton } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui.js/transactions';

export default function AuditPage() {
  const [code, setCode] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [ipfsLink, setIpfsLink] = useState('');
  const [error, setError] = useState('');

  const currentAccount = useCurrentAccount();
  const signAndExecute = useSignAndExecuteTransaction();

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    setIpfsLink('');

    const formData = new FormData();
    if (file) formData.append('file', file);
    else formData.append('code', code);

    try {
      const res = await axios.post('http://localhost:4000/audit', formData);
      const ipfsUrl = res.data.ipfsUrl;
      setIpfsLink(ipfsUrl);
      await mintNFT(ipfsUrl);
    } catch (err) {
      console.error(err);
      setError('Audit failed.');
    } finally {
      setLoading(false);
    }
  };

  const mintNFT = async (ipfsUrl) => {
    if (!currentAccount || !signAndExecute) {
      alert('Please connect your wallet.');
      return;
    }

    const tx = new Transaction();

    const PACKAGE_ID = '0xYourPackageId';
    const MODULE_NAME = 'nft';
    const FUNCTION_NAME = 'mint';

    tx.moveCall({
      target: `${PACKAGE_ID}::${MODULE_NAME}::${FUNCTION_NAME}`,
      arguments: [
        tx.pure(code.split(/\s+/)[1] || 'SmartContractNFT'),
        tx.pure(ipfsUrl),
      ],
    });

    try {
      const result = await signAndExecute({
        transaction: tx,
        chain: 'sui:testnet', // change if needed
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      });
      console.log('NFT minted:', result);
      alert('NFT minted successfully!');
    } catch (e) {
      console.error('Mint failed', e);
      alert('Minting failed. Check console.');
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Smart Contract Auditor + NFT Mint</h1>

      <ConnectButton />
      {currentAccount && (
        <p className="text-sm text-gray-600 mt-1">Connected as: {currentAccount.address}</p>
      )}

      <textarea
        placeholder="Paste your smart contract code here..."
        className="w-full h-48 p-2 border rounded mb-4"
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />

      <div className="mb-4">
        <input
          type="file"
          onChange={(e) => setFile(e.target.files[0])}
          className="border p-2"
        />
      </div>

      <button
        onClick={handleSubmit}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        disabled={loading || !currentAccount}
      >
        {loading ? 'Auditing + Minting NFT...' : 'Submit for Audit & Mint NFT'}
      </button>

      {ipfsLink && (
        <div className="mt-6">
          <p className="font-medium">Audit Completed ✅</p>
          <a
            href={ipfsLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline"
          >
            Download Audit Report (PDF)
          </a>
        </div>
      )}

      {error && <p className="text-red-600 mt-4">{error}</p>}
    </div>
  );
}
