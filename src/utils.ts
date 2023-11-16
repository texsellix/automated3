import { base64, hex } from "@scure/base";
import * as btc from "@scure/btc-signer";
import { Psbt, payments, networks, initEccLib } from 'bitcoinjs-lib';
import * as ecc from '@bitcoinerlab/secp256k1';

import { BitcoinNetworkType } from "sats-connect";

export type UTXO = {
  txid: string;
  vout: number;
  status: {
    confirmed: boolean;
    block_height?: number;
    block_hash?: string;
    block_time?: number;
  };
  value: number;
};

initEccLib(ecc);

export const getUTXOs = async (
  network: BitcoinNetworkType,
  address: string
): Promise<UTXO[]> => {
  const networkSubpath =
    network === BitcoinNetworkType.Testnet ? "/testnet" : "";

  const url = `https://mempool.space${networkSubpath}/api/address/${address}/utxo`;
  const response = await fetch(url);

  return response.json();
};

export const createSelfSendPSBT = async ({
  networkType,
  unspentOutputs,
  publicKeyString,
  recipient
}: {
  networkType: BitcoinNetworkType,
  unspentOutputs: UTXO[],
  publicKeyString: string,
  recipient: string
}) => {
  const network =
      networkType === BitcoinNetworkType.Testnet ? btc.TEST_NETWORK : btc.NETWORK;

  // choose first unspent output
  const paymentOutput = unspentOutputs[0];

  const paymentPublicKey = hex.decode(publicKeyString);

  const tx = new btc.Transaction();

  // create segwit spend
  const p2wpkh = btc.p2wpkh(paymentPublicKey, network);
  const p2sh = btc.p2sh(p2wpkh, network);

  // set transfer amount and calculate change
  const fee = 300n; // set the miner fee amount
  const recipientAmount = BigInt(Math.min(paymentOutput.value, 3000)) - fee;
  const changeAmount =
      BigInt(paymentOutput.value) - recipientAmount - fee;

  // payment input
  tx.addInput({
    txid: paymentOutput.txid,
    index: paymentOutput.vout,
    witnessUtxo: {
      script: p2sh.script ? p2sh.script : Buffer.alloc(0),
      amount: BigInt(paymentOutput.value),
    },
    redeemScript: p2sh.redeemScript ? p2sh.redeemScript : Buffer.alloc(0),
    witnessScript: p2sh.witnessScript,
    sighashType: btc.SignatureHash.SINGLE | btc.SignatureHash.ANYONECANPAY,
  });

  tx.addOutputAddress(recipient, recipientAmount, network);
  tx.addOutputAddress(recipient, changeAmount, network);

  const psbt = tx.toPSBT(0);
  const psbtB64 = base64.encode(psbt);
  return psbtB64;
}

export const createSelfSendOrdinalsPSBT = async ({
  networkType,
  unspentOutputs,
  publicKeyString,
  recipient
}: {
  networkType: BitcoinNetworkType,
  unspentOutputs: UTXO[],
  publicKeyString: string,
  recipient: string
}) => {
  const ordinalPublicKey = Buffer.from(publicKeyString, 'hex');
  const network =
      networkType === BitcoinNetworkType.Testnet ? networks.testnet : networks.bitcoin;

  // choose first unspent output
  const ordinalOutput = unspentOutputs[0];

  const psbt = new Psbt();

  const p2pktr = payments.p2tr({
    pubkey: ordinalPublicKey,
    network
  });

  psbt.addInput({
    hash: ordinalOutput.txid,
    index: ordinalOutput.vout,
    witnessUtxo: { value: ordinalOutput.value, script: p2pktr.output! },
    tapInternalKey: ordinalPublicKey,
    sighashType: 131,
  });

  // set transfer amount and calculate change
  const fee = 300; // set the miner fee amount
  const recipientAmount = Math.min(ordinalOutput.value, 3000) - fee;
  const changeAmount =
      ordinalOutput.value - recipientAmount - fee;

  psbt.addOutput({
    address: recipient, // faucet address
    value: recipientAmount
  });
  psbt.addOutput({
    address: recipient, // faucet address
    value: changeAmount
  });

  return psbt.toBase64()
}


export const createPSBT = async (
  networkType: BitcoinNetworkType,
  paymentPublicKeyString: string,
  ordinalsPublicKeyString: string,
  paymentUnspentOutputs: UTXO[],
  ordinalsUnspentOutputs: UTXO[],
  recipient1: string,
  recipient2: string
) => {
  const network =
    networkType === BitcoinNetworkType.Testnet ? btc.TEST_NETWORK : btc.NETWORK;

  // choose first unspent output
  const paymentOutput = paymentUnspentOutputs[0];
  const ordinalOutput = ordinalsUnspentOutputs[0];

  const paymentPublicKey = hex.decode(paymentPublicKeyString);
  const ordinalPublicKey = hex.decode(ordinalsPublicKeyString);

  const tx = new btc.Transaction();

  // create segwit spend
  const p2wpkh = btc.p2wpkh(paymentPublicKey, network);
  const p2sh = btc.p2sh(p2wpkh, network);

  // create taproot spend
  const p2tr = btc.p2tr(ordinalPublicKey, undefined, network);

  // set transfer amount and calculate change
  const fee = 300n; // set the miner fee amount
  const recipient1Amount = BigInt(Math.min(paymentOutput.value, 3000)) - fee;
  const recipient2Amount = BigInt(Math.min(ordinalOutput.value, 3000));
  const total = recipient1Amount + recipient2Amount;
  const changeAmount =
    BigInt(paymentOutput.value) + BigInt(ordinalOutput.value) - total - fee;

  // payment input
  tx.addInput({
    txid: paymentOutput.txid,
    index: paymentOutput.vout,
    witnessUtxo: {
      script: p2sh.script ? p2sh.script : Buffer.alloc(0),
      amount: BigInt(paymentOutput.value),
    },
    redeemScript: p2sh.redeemScript ? p2sh.redeemScript : Buffer.alloc(0),
    witnessScript: p2sh.witnessScript,
    sighashType: btc.SignatureHash.SINGLE | btc.SignatureHash.ANYONECANPAY,
  });

  // ordinals input
  tx.addInput({
    txid: ordinalOutput.txid,
    index: ordinalOutput.vout,
    witnessUtxo: {
      script: p2tr.script,
      amount: BigInt(ordinalOutput.value),
    },
    tapInternalKey: ordinalPublicKey,
    sighashType: btc.SignatureHash.SINGLE | btc.SignatureHash.ANYONECANPAY,
  });

  tx.addOutputAddress(recipient1, recipient1Amount, network);
  tx.addOutputAddress(recipient2, recipient2Amount, network);
  tx.addOutputAddress(recipient2, changeAmount, network);

  const psbt = tx.toPSBT(0);
  const psbtB64 = base64.encode(psbt);
  return psbtB64;
};
