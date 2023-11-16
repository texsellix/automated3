import { AddressPurpose, BitcoinNetworkType, getAddress } from "sats-connect";
import { getWallets } from "@wallet-standard/core";

import SendBitcoin from "./components/sendBitcoin";
import SignMessage from "./components/signMessage";
import SignTransaction from "./components/signTransaction";
import { useLocalStorage } from "./useLocalstorage";

import type { BitcoinProvider } from "sats-connect";
import type { WalletWithFeatures } from "@wallet-standard/core";

import "./App.css";
import { createSelfSendPSBT, createSelfSendOrdinalsPSBT } from "./utils";

const SatsConnectNamespace = 'sats-connect:'
type SatsConnectFeature = {
  [SatsConnectNamespace]: {
    provider: BitcoinProvider
  }
}

const { get, on } = getWallets();
let wallets = get();
on("register", function () {
  wallets = get()
});

const getProvider = async (): Promise<BitcoinProvider> => {
  return (wallets as WalletWithFeatures<SatsConnectFeature>[])
      ?.find((wallet) => !!wallet.features['sats-connect:']?.provider)
      ?.features['sats-connect:']?.provider!
}

function App() {
  const [paymentAddress, setPaymentAddress] = useLocalStorage("paymentAddress");
  const [paymentPublicKey, setPaymentPublicKey] =
    useLocalStorage("paymentPublicKey");
  const [ordinalsAddress, setOrdinalsAddress] =
    useLocalStorage("ordinalsAddress");
  const [ordinalsPublicKey, setOrdinalsPublicKey] =
    useLocalStorage("ordinalsPublicKey");
  const [network, setNetwork] = useLocalStorage<BitcoinNetworkType>(
    "network",
    BitcoinNetworkType.Testnet
  );

  const isReady =
    !!paymentAddress &&
    !!paymentPublicKey &&
    !!ordinalsAddress &&
    !!ordinalsPublicKey;

  const onWalletDisconnect = () => {
    setPaymentAddress(undefined);
    setPaymentPublicKey(undefined);
    setOrdinalsAddress(undefined);
    setOrdinalsPublicKey(undefined);
  };

  const toggleNetwork = () => {
    setNetwork(
      network === BitcoinNetworkType.Testnet
        ? BitcoinNetworkType.Mainnet
        : BitcoinNetworkType.Testnet
    );
    onWalletDisconnect();
  };

  const onConnectClick = async () => {
    await getAddress({
      payload: {
        purposes: [AddressPurpose.Ordinals, AddressPurpose.Payment],
        message: "SATS Connect Demo",
        network: {
          type: network,
        },
      },
      onFinish: (response) => {
        const paymentAddressItem = response.addresses.find(
          (address) => address.purpose === AddressPurpose.Payment
        );
        setPaymentAddress(paymentAddressItem?.address);
        setPaymentPublicKey(paymentAddressItem?.publicKey);

        const ordinalsAddressItem = response.addresses.find(
          (address) => address.purpose === AddressPurpose.Ordinals
        );
        setOrdinalsAddress(ordinalsAddressItem?.address);
        setOrdinalsPublicKey(ordinalsAddressItem?.publicKey);
      },
      onCancel: () => alert("Request canceled"),
      getProvider
    });
  };

  if (!isReady) {
    return (
      <div style={{ padding: 30 }}>
        <h1>Sats Connect Test App - {network}</h1>
        <div>Please connect your wallet to continue</div>

        <div style={{ background: "lightgray", padding: 30, marginTop: 10 }}>
          <button style={{ height: 30, width: 180 }} onClick={toggleNetwork}>
            Switch Network
          </button>
          <br />
          <br />
          <button style={{ height: 30, width: 180 }} onClick={onConnectClick}>
            Connect
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 30 }}>
      <h1>Sats Connect Test App - {network}</h1>
      <div>
        <div>Payment Address: {paymentAddress}</div>
        <div>Ordinals Address: {ordinalsAddress}</div>
        <br />

        <div className="container">
          <h3>Disconnect wallet</h3>
          <button onClick={onWalletDisconnect}>Disconnect</button>
        </div>

        <SignTransaction
          title={'Sign a self-send Payment transaction'}
          address={paymentAddress}
          publicKey={paymentPublicKey}
          network={network}
          getProvider={getProvider}
          createSelfSendPSBT={createSelfSendPSBT}
        />

        <SignTransaction
          title={'Sign a self-send Ordinals transaction'}
          address={ordinalsAddress}
          publicKey={ordinalsPublicKey}
          network={network}
          getProvider={getProvider}
          createSelfSendPSBT={createSelfSendOrdinalsPSBT}
        />

        <SignMessage address={ordinalsAddress} network={network} />

        <SendBitcoin address={paymentAddress} network={network} />
      </div>
    </div>
  );
}

export default App;
