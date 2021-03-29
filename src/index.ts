import Arweave from "arweave";
import Transaction from "arweave/node/lib/transaction";
import { JWKInterface } from "arweave/node/lib/wallet";

const PST = "PTY"

interface IInput {
    function: string;
}

type Options = {
    signer?: TransactionSigner;
};
type TransactionSigner = (transaction: Transaction) => Promise<Transaction>;

export function payWithEuros(contractOwnerAddr: string, target: string, tokenId: string, price: number) {
    return {
        'function': 'transferBatch',
        'froms': [contractOwnerAddr,""],
        'tokenIds': [PST, tokenId],
        'targets': [target, target],
        'qtys': [price,undefined],
        'nos': [undefined,1],
        'prices': [undefined,price]
    };
}

export async function interactWrite(
    arweave: Arweave,
    wallet: JWKInterface,
    contractId: string,
    input: IInput,
    options?: Options,
): Promise<Transaction> {
    let interactTx = await arweave.createTransaction({ data: "" }, wallet);

    interactTx.addTag("Exchange", "Pianity");
    interactTx.addTag("Type", input.function);
    interactTx.addTag("App-Name", "SmartWeaveAction");
    interactTx.addTag("App-Version", "0.3.0");
    interactTx.addTag("Unix-Time", `${Date.now()}`);
    interactTx.addTag("Contract", contractId);
    interactTx.addTag("Input", JSON.stringify(input));

    if (options?.signer) {
        interactTx = await options.signer(interactTx);
    } else {
        await arweave.transactions.sign(interactTx, wallet);
    }

    const response = await arweave.transactions.post(interactTx);

    if (response.status !== 200) {
        throw new Error("Unable to execute interactWrite");
    }

    return interactTx;
}
