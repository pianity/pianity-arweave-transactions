import Arweave from "arweave";
import Transaction from "arweave/node/lib/transaction";
import { JWKInterface } from "arweave/node/lib/wallet";

import { Input } from "pianity-smartcontracts";

interface ICreateTransactionOptions {
    input?: Input;
    winstonQty?: string;
    publicKey?: JWKInterface;
    target?: string;
    contractId?: string;
    tags?: { name: string; value: string }[];
    data?: Buffer;
}

export async function createTransaction(
    arweave: Arweave,
    {
        input,
        winstonQty = "0",
        publicKey,
        target = "",
        contractId,
        tags,
        data,
    }: ICreateTransactionOptions,
): Promise<Transaction> {
    let interactTx = await arweave.createTransaction(
        { data: data || Math.random().toString().slice(4), quantity: winstonQty, target },
        publicKey,
    );

    interactTx.addTag("Exchange", "Pianity");
    if (input && contractId) {
        interactTx.addTag("Type", input.function);
        interactTx.addTag("App-Name", "SmartWeaveAction");
        interactTx.addTag("App-Version", "0.3.0");
        interactTx.addTag("Contract", contractId);
        interactTx.addTag("Input", JSON.stringify(input));
    }
    interactTx.addTag("Unix-Time", `${Date.now()}`);

    if (tags) {
        tags.forEach(({ name, value }) => interactTx.addTag(name, value));
    }

    return interactTx;
}
