// Copyright (c) 2022, Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Provider, TransactionResponse } from '../providers/provider';
import { VoidProvider } from '../providers/void-provider';
import { Base64DataBuffer } from '../serialization/base64';
import { SignaturePubkeyPair, Signer } from './signer';
import { RpcTxnDataSerializer } from './txn-data-serializers/rpc-txn-data-serializer';
import {
  TransferTransaction,
  TxnDataSerializer,
} from './txn-data-serializers/txn-data-serializer';

///////////////////////////////
// Exported Abstracts
export abstract class SignerWithProvider implements Signer {
  readonly provider: Provider;
  readonly serializer: TxnDataSerializer;

  ///////////////////
  // Sub-classes MUST implement these

  // Returns the checksum address
  abstract getAddress(): Promise<string>;

  /**
   * Returns the signature for the data and the public key of the signer
   */
  abstract signData(data: Base64DataBuffer): Promise<SignaturePubkeyPair>;

  // Returns a new instance of the Signer, connected to provider.
  // This MAY throw if changing providers is not supported.
  abstract connect(provider: Provider): SignerWithProvider;

  ///////////////////
  // Sub-classes MAY override these

  constructor(provider?: Provider, serializer?: TxnDataSerializer) {
    this.provider = provider || new VoidProvider();
    this.serializer = serializer || new RpcTxnDataSerializer('');
  }

  /**
   * Sign a transaction and submit to the Gateway for execution
   *
   * @param txBytes BCS serialised TransactionData bytes
   */
  async signAndExecuteTransaction(
    txBytes: Base64DataBuffer
  ): Promise<TransactionResponse> {
    const sig = await this.signData(txBytes);
    return await this.provider.executeTransaction({
      txBytes: txBytes.toString(),
      signature: sig.signature.toString(),
      pubKey: sig.pubKey.toString(),
    });
  }

  /**
   * Serialize and Sign a `Transfer` transaction and submit to the Gateway for execution
   */
  async transfer(
    transaction: TransferTransaction
  ): Promise<TransactionResponse> {
    const txBytes = await this.serializer.new_transfer(transaction);
    return await this.signAndExecuteTransaction(txBytes);
  }
}